import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import PDFDocument from "pdfkit"

function fmt(n: number | null | undefined) { return Math.round(n ?? 0).toLocaleString("es-CL") }
function fmtDate(d: string) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: budget }, { data: settingsRows }] = await Promise.all([
    supabase.from("budgets").select(`
      *, profiles(full_name, professional_title, phone, email, signature_url),
      clients(full_name, rut, phone, email, address, city),
      budget_items(*)
    `).eq("id", id).single(),
    supabase.from("settings").select("key, value"),
  ])

  if (!budget) return new NextResponse("Not found", { status: 404 })

  const S: Record<string, string> = {}
  settingsRows?.forEach(r => { S[r.key] = r.value ?? "" })

  let logoBuf: Buffer | null = null
  if (S.company_logo_url) {
    try {
      const r = await fetch(S.company_logo_url.split("?")[0])
      if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer())
    } catch { /* sin logo */ }
  }

  let signatureBuf: Buffer | null = null
  const insp = budget.profiles
  if (insp?.signature_url) {
    try {
      const sr = await fetch(insp.signature_url)
      if (sr.ok) signatureBuf = Buffer.from(await sr.arrayBuffer())
    } catch { /* sin firma */ }
  }

  // ── LANDSCAPE LETTER ──────────────────────────────────────────────────
  // 792 × 612 pts | margins 30 | PAGE_W = 732, usable bottom = 582
  const MARGIN = 30
  const PAGE_H_USABLE = 582  // 612 - 30
  const doc = new PDFDocument({ margin: MARGIN, size: "LETTER", layout: "landscape" })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))

  const PAGE_W = 792 - MARGIN * 2  // 732
  const LX = MARGIN

  const client = budget.clients ?? null
  const clienteNombre  = client?.full_name  ?? budget.cliente_nombre   ?? "—"
  const clienteRut     = client?.rut        ?? budget.cliente_rut       ?? ""
  const clienteTel     = client?.phone      ?? budget.cliente_telefono  ?? ""
  const clienteEmail   = client?.email      ?? budget.cliente_email     ?? ""
  const clienteDireccion = client?.address  ?? budget.cliente_direccion ?? ""

  const items = (budget.budget_items ?? [])
    .filter((i: any) => i.descripcion)
    .sort((a: any, b: any) => a.orden - b.orden)

  const hasAlt  = items.some((i: any) => (i.rep_korea  ?? 0) > 0)
  const hasOtro = items.some((i: any) => (i.rep_multi  ?? 0) > 0)

  const iva = Number(budget.iva_pct ?? 19)
  const dto = Number(budget.descuento_global ?? 0)

  function calcColTotal(repField: string) {
    const sumR = items.reduce((a: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return a + Math.round((Number(i[repField]) || 0) * f)
    }, 0)
    const sumMO = items.reduce((a: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return a + Math.round((Number(i.val_mano_obra) || 0) * f)
    }, 0)
    const sub = sumR + sumMO - dto
    const ivaM = Math.round(sub * iva / 100)
    return { sub, ivaM, total: sub + ivaM, sumR, sumMO }
  }

  const tOrig = calcColTotal("rep_genuino")
  const tAlt  = calcColTotal("rep_korea")
  const tOtro = calcColTotal("rep_multi")

  await new Promise<void>(resolve => {
    doc.on("end", resolve)

    // ── HEADER — todo sky blue ────────────────────────────────────────────
    const HDR_H = 58
    // Solo un rect, sin franja oscura abajo
    doc.rect(LX, MARGIN, PAGE_W, HDR_H).fill("#0ea5e9")

    let logoX = LX + 12
    if (logoBuf) {
      try { doc.image(logoBuf, LX + 8, MARGIN + 5, { height: 44, fit: [70, 44] }); logoX = LX + 86 }
      catch { /* */ }
    }

    // Empresa
    doc.fillColor("#ffffff").fontSize(13).font("Helvetica-Bold")
      .text(S.company_name || "AAEA Inspecciones", logoX, MARGIN + 6, { width: 340 })
    doc.fontSize(6.5).font("Helvetica").fillColor("#e0f2fe")
      .text(S.company_services || "SERVICIOS INTEGRALES DE INSPECCIÓN Y ASESORÍA AUTOMOTRIZ", logoX, MARGIN + 22, { width: 340 })
    if (S.company_address) {
      const addr = S.company_address + (S.company_address2 ? " // " + S.company_address2 : "")
      doc.fontSize(6).fillColor("#bae6fd").text(addr, logoX, MARGIN + 31, { width: 340 })
    }
    if (S.company_phone || S.company_email) {
      doc.fontSize(6).fillColor("#bae6fd")
        .text([S.company_phone, S.company_email].filter(Boolean).join("   ·   "), logoX, MARGIN + 40, { width: 340 })
    }

    // RUT + OT (lado derecho)
    const rightX = LX + PAGE_W - 150
    doc.fillColor("#e0f2fe").fontSize(6).font("Helvetica")
      .text("R.U.T.", rightX, MARGIN + 6, { align: "right", width: 145 })
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
      .text(S.company_rut || "—", rightX, MARGIN + 14, { align: "right", width: 145 })

    doc.roundedRect(rightX, MARGIN + 26, 110, 24, 3).fill("#0369a1")
    doc.fillColor("#bae6fd").fontSize(5.5).font("Helvetica")
      .text("ORDEN DE TRABAJO", rightX, MARGIN + 29, { align: "center", width: 110 })
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold")
      .text(budget.numero, rightX, MARGIN + 37, { align: "center", width: 110 })

    let y = MARGIN + HDR_H + 8

    // Nota validez
    doc.fillColor("#374151").fontSize(6.5).font("Helvetica")
      .text(`Presupuesto válido por: ${budget.vigencia_dias ?? 30} días  ·  NO VÁLIDO COMO BOLETA/FACTURA  ·  Fecha: ${fmtDate(budget.created_at)}`, LX, y)
    y += 11

    // ── TABLA DATOS CLIENTE / VEHÍCULO ────────────────────────────────────
    const drawCell = (label: string, value: string, x: number, cy: number, w: number, h = 24) => {
      doc.rect(x, cy, w, h).stroke("#d1d5db")
      doc.fillColor("#6b7280").fontSize(5.5).font("Helvetica").text(label, x + 3, cy + 2)
      doc.fillColor("#111827").fontSize(7.5).font("Helvetica-Bold")
        .text(value || "—", x + 3, cy + 9, { width: w - 6, ellipsis: true })
    }

    const c6 = PAGE_W / 6
    drawCell("PATENTE",    budget.vehicle_patente ?? "—", LX,         y, c6)
    drawCell("CLIENTE",    clienteNombre,                 LX + c6,    y, c6 * 2)
    drawCell("RUT",        clienteRut,                    LX + c6*3,  y, c6)
    drawCell("TELÉFONO",   clienteTel,                    LX + c6*4,  y, c6)
    drawCell("FECHA",      fmtDate(budget.created_at),    LX + c6*5,  y, c6)
    y += 24

    drawCell("MARCA",      budget.vehicle_marca ?? "—",    LX,         y, c6)
    drawCell("MODELO",     budget.vehicle_modelo ?? "—",   LX + c6,    y, c6)
    drawCell("AÑO",        budget.vehicle_anio ? String(budget.vehicle_anio) : "—", LX + c6*2, y, c6)
    drawCell("COLOR",      budget.vehicle_color ?? "—",    LX + c6*3,  y, c6)
    drawCell("EMAIL",      clienteEmail,                   LX + c6*4,  y, c6)
    drawCell("FORMA PAGO", budget.forma_pago ?? "—",       LX + c6*5,  y, c6)
    y += 24

    drawCell("VIN / CHASIS",  budget.vehicle_vin ?? "—",      LX,         y, c6)
    drawCell("N° MOTOR",      budget.vehicle_num_motor ?? "—", LX + c6,    y, c6)
    drawCell("VERSIÓN",       budget.vehicle_version ?? "—",   LX + c6*2,  y, c6 * 2)
    drawCell("KM ACTUAL",     budget.vehicle_km ? Number(budget.vehicle_km).toLocaleString("es-CL") : "—", LX + c6*4, y, c6)
    drawCell("DIRECCIÓN",     clienteDireccion,                LX + c6*5,  y, c6)
    y += 24 + 5

    // ── HEADER TABLA ÍTEMS ────────────────────────────────────────────────
    const repCols = 1 + (hasAlt ? 1 : 0) + (hasOtro ? 1 : 0)
    const CN  = 20   // #
    const CG  = 48   // gestión
    const CR  = hasAlt && hasOtro ? 58 : hasAlt ? 68 : 78  // repuesto cols
    const CMO = 65   // mano obra
    const CDC = 26   // dcto%
    const CT  = 65   // total ítem
    const CD  = hasAlt || hasOtro ? 150 : 170  // descripcion
    const usedW = CN + CD + CG + CR * repCols + CMO + CDC + CT
    const CN2 = Math.max(PAGE_W - usedW, 60)  // notas col (resta, mínimo 60)

    doc.rect(LX, y, PAGE_W, 14).fill("#0284c7")
    const hY = y + 3.5
    doc.fillColor("#ffffff").fontSize(6).font("Helvetica-Bold")
    let cx = LX
    doc.text("#",                cx, hY, { width: CN,  align: "center" }); cx += CN
    doc.text("TRABAJO / DESCRIPCIÓN", cx, hY, { width: CD });              cx += CD
    doc.text("GEST.",            cx, hY, { width: CG,  align: "center" }); cx += CG
    doc.text("$ ORIG.",          cx, hY, { width: CR,  align: "right"  }); cx += CR
    if (hasAlt)  { doc.text("$ ALT.",  cx, hY, { width: CR, align: "right" }); cx += CR }
    if (hasOtro) { doc.text("$ OTRO",  cx, hY, { width: CR, align: "right" }); cx += CR }
    doc.text("$ M.O.",           cx, hY, { width: CMO, align: "right"  }); cx += CMO
    doc.text("DC%",              cx, hY, { width: CDC, align: "center" }); cx += CDC
    doc.text("TOTAL",            cx, hY, { width: CT,  align: "right"  }); cx += CT
    doc.text("DESC. TRABAJO",    cx, hY, { width: CN2 })
    y += 14

    // Filas de ítems
    items.forEach((item: any, idx: number) => {
      if (y > 555) { doc.addPage(); y = MARGIN }
      const rowH = 13
      const bg = idx % 2 === 0 ? "#ffffff" : "#f0f9ff"
      doc.rect(LX, y, PAGE_W, rowH).fill(bg)

      const rY = y + 3
      const f   = 1 - (Number(item.dcto_pct) || 0) / 100
      const origN = Math.round((Number(item.rep_genuino)  || 0) * f)
      const altN  = Math.round((Number(item.rep_korea)    || 0) * f)
      const otroN = Math.round((Number(item.rep_multi)    || 0) * f)
      const moN   = Math.round((Number(item.val_mano_obra)|| 0) * f)
      const totI  = origN + moN

      const gLabel = item.gestion === "OTRO" ? (item.gestion_custom || "OTRO") : (item.gestion || "MECÁNICO")

      let rx = LX
      doc.fillColor("#374151").fontSize(6.5).font("Helvetica")
      doc.text(String(item.orden ?? idx + 1), rx, rY, { width: CN, align: "center" }); rx += CN
      doc.text(item.descripcion ?? "", rx, rY, { width: CD - 2, ellipsis: true }); rx += CD
      doc.fillColor("#6b7280").text(gLabel, rx, rY, { width: CG, align: "center" }); rx += CG
      doc.fillColor("#1d4ed8").text(origN > 0 ? `$${fmt(origN)}` : "—", rx, rY, { width: CR, align: "right" }); rx += CR
      if (hasAlt)  { doc.fillColor("#b45309").text(altN  > 0 ? `$${fmt(altN)}`  : "—", rx, rY, { width: CR, align: "right" }); rx += CR }
      if (hasOtro) { doc.fillColor("#15803d").text(otroN > 0 ? `$${fmt(otroN)}` : "—", rx, rY, { width: CR, align: "right" }); rx += CR }
      doc.fillColor("#374151").text(moN > 0 ? `$${fmt(moN)}` : "—", rx, rY, { width: CMO, align: "right" }); rx += CMO
      doc.text(item.dcto_pct > 0 ? `${item.dcto_pct}%` : "—", rx, rY, { width: CDC, align: "center" }); rx += CDC
      doc.fillColor("#111827").font("Helvetica-Bold").text(totI > 0 ? `$${fmt(totI)}` : "—", rx, rY, { width: CT, align: "right" }); rx += CT
      doc.fillColor("#6b7280").font("Helvetica").fontSize(6).text(item.notas ?? "", rx, rY, { width: CN2 - 2 })
      y += rowH
    })

    // Fila subtotales
    if (y > 535) { doc.addPage(); y = MARGIN }
    doc.rect(LX, y, PAGE_W, 14).fill("#e0f2fe")
    const sTY = y + 3.5
    let stx = LX + CN + CD + CG
    doc.fillColor("#1d4ed8").fontSize(6.5).font("Helvetica-Bold")
      .text(`$${fmt(tOrig.sumR)}`, stx, sTY, { width: CR, align: "right" }); stx += CR
    if (hasAlt)  { doc.fillColor("#b45309").text(`$${fmt(tAlt.sumR)}`,  stx, sTY, { width: CR, align: "right" }); stx += CR }
    if (hasOtro) { doc.fillColor("#15803d").text(`$${fmt(tOtro.sumR)}`, stx, sTY, { width: CR, align: "right" }); stx += CR }
    doc.fillColor("#374151").text(`$${fmt(tOrig.sumMO)}`, stx, sTY, { width: CMO, align: "right" })
    y += 18

    // ── CUADROS TOTALES COMPACTOS + PANEL GRAN TOTAL ──────────────────────
    if (y > 510) { doc.addPage(); y = MARGIN }
    y += 4

    const boxes = [
      { label: "ORIGINAL",    t: tOrig, color: "#1d4ed8", bg: "#eff6ff" },
      ...(hasAlt  ? [{ label: "ALTERNATIVO", t: tAlt,  color: "#b45309", bg: "#fffbeb" }] : []),
      ...(hasOtro ? [{ label: "OTRO",        t: tOtro, color: "#15803d", bg: "#f0fdf4" }] : []),
    ]

    const GRAND_W = 248
    const optionsAreaW = PAGE_W - GRAND_W - 8
    const optGap = 5
    const numOpts = boxes.length
    const optW = Math.floor((optionsAreaW - optGap * (numOpts - 1)) / numOpts)
    const boxH = 52

    // Opciones compactas
    boxes.forEach((box, idx) => {
      const bx = LX + idx * (optW + optGap)
      doc.rect(bx, y, optW, boxH).fill(box.bg)
      doc.rect(bx, y, optW, 12).fill(box.color)
      doc.fillColor("#ffffff").fontSize(6.5).font("Helvetica-Bold")
        .text(box.label, bx, y + 3, { align: "center", width: optW })

      let ry = y + 16
      if (dto > 0) {
        doc.fillColor("#374151").fontSize(5.5).font("Helvetica")
          .text("Descuento:", bx + 3, ry, { width: optW * 0.55 })
        doc.fillColor("#dc2626").text(`-$${fmt(dto)}`, bx + 3, ry, { width: optW - 6, align: "right" })
        ry += 8
      }
      doc.fillColor("#374151").fontSize(5.5).font("Helvetica")
        .text("Neto:", bx + 3, ry, { width: optW * 0.55 })
      doc.fillColor("#111827").font("Helvetica-Bold").text(`$${fmt(box.t.sub)}`, bx + 3, ry, { width: optW - 6, align: "right" })

      doc.rect(bx, y + boxH - 14, optW, 14).fill(box.color)
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold")
        .text(`$${fmt(box.t.total)}`, bx + 3, y + boxH - 11, { align: "center", width: optW - 6 })
    })

    // Panel Gran Total (siempre muestra la opción Original)
    const grandX = LX + PAGE_W - GRAND_W
    doc.rect(grandX, y, GRAND_W, boxH).fill("#0c2340")
    doc.fillColor("#7dd3fc").fontSize(6.5).font("Helvetica-Bold")
      .text("TOTAL PRESUPUESTO", grandX, y + 4, { align: "center", width: GRAND_W })

    const lineH = 9
    let gY = y + 16
    const cLabel = GRAND_W * 0.56
    const cVal = GRAND_W - 8

    if (dto > 0) {
      doc.fillColor("#93c5fd").fontSize(5.5).font("Helvetica")
        .text("Descuento global:", grandX + 4, gY, { width: cLabel })
      doc.fillColor("#fca5a5").text(`-$${fmt(dto)}`, grandX + 4, gY, { width: cVal, align: "right" })
      gY += lineH
    }
    doc.fillColor("#93c5fd").fontSize(5.5).font("Helvetica")
      .text("Subtotal neto:", grandX + 4, gY, { width: cLabel })
    doc.fillColor("#ffffff").font("Helvetica-Bold").text(`$${fmt(tOrig.sub)}`, grandX + 4, gY, { width: cVal, align: "right" })
    gY += lineH
    doc.fillColor("#93c5fd").font("Helvetica")
      .text(`IVA (${iva}%):`, grandX + 4, gY, { width: cLabel })
    doc.fillColor("#ffffff").text(`$${fmt(tOrig.ivaM)}`, grandX + 4, gY, { width: cVal, align: "right" })

    doc.rect(grandX, y + boxH - 14, GRAND_W, 14).fill("#0ea5e9")
    doc.fillColor("#ffffff").fontSize(9.5).font("Helvetica-Bold")
      .text(`TOTAL: $${fmt(tOrig.total)}`, grandX + 4, y + boxH - 11, { align: "center", width: GRAND_W - 8 })

    y += boxH + 8

    // ── DESCRIPCIÓN SERVICIO ──────────────────────────────────────────────
    if (budget.descripcion_servicio) {
      if (y > 540) { doc.addPage(); y = MARGIN }
      y += 4
      doc.rect(LX, y, PAGE_W, 13).fill("#fef9c3")
      doc.fillColor("#92400e").fontSize(6.5).font("Helvetica-Bold")
        .text("OBSERVACIONES / DESCRIPCIÓN DEL SERVICIO", LX + 4, y + 3.5)
      y += 15
      doc.fillColor("#374151").fontSize(7).font("Helvetica")
        .text(budget.descripcion_servicio, LX + 4, y, { width: PAGE_W - 8, lineGap: 2 })
      y += doc.heightOfString(budget.descripcion_servicio, { width: PAGE_W - 8 }) + 8
    }

    // ── DATOS DE PAGO ─────────────────────────────────────────────────────
    const payParts = [
      S.company_name,
      S.payment_rut ? `RUT: ${S.payment_rut}` : null,
      S.payment_account_type && S.payment_account_number ? `${S.payment_account_type}: ${S.payment_account_number}` : null,
      S.payment_bank || null,
      S.payment_email || null,
    ].filter(Boolean)
    const payInfo = payParts.join(" // ")

    if (S.payment_note || payInfo) {
      if (y > 540) { doc.addPage(); y = MARGIN }
      y += 4
      doc.rect(LX, y, PAGE_W, 13).fill("#eff6ff")
      doc.fillColor("#1d4ed8").fontSize(6.5).font("Helvetica-Bold").text("INFORMACIÓN DE PAGO", LX + 4, y + 3.5)
      y += 15
      if (S.payment_note) {
        doc.fillColor("#374151").fontSize(7).font("Helvetica").text(S.payment_note, LX + 4, y, { width: PAGE_W - 8 })
        y += 12
      }
      if (payInfo) {
        doc.fillColor("#1e293b").fontSize(7).font("Helvetica-Bold")
          .text("TRANSFERIR A: " + payInfo, LX + 4, y, { width: PAGE_W - 8, lineGap: 1 })
        y += doc.heightOfString("TRANSFERIR A: " + payInfo, { width: PAGE_W - 8 }) + 6
      }
    }

    // ── PIE ───────────────────────────────────────────────────────────────
    // Si el contenido no cabe en lo que queda de página, añadir nueva
    if (y + 60 > PAGE_H_USABLE) { doc.addPage(); y = MARGIN }
    y += 8

    doc.moveTo(LX, y).lineTo(LX + PAGE_W, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke()
    y += 7

    if (signatureBuf) {
      try { doc.image(signatureBuf, LX, y, { height: 26, fit: [80, 26] }) } catch { /* */ }
      y += 28
    }

    doc.fillColor("#111827").fontSize(8).font("Helvetica-Bold")
      .text(insp?.full_name ?? S.company_name ?? "", LX, y)
    doc.fillColor("#6b7280").fontSize(6.5).font("Helvetica")
      .text(insp?.professional_title ?? "Inspector", LX, y + 10)

    doc.fillColor("#9ca3af").fontSize(6)
      .text(S.company_name + " · " + fmtDate(budget.created_at), LX, y + 10, { align: "right", width: PAGE_W })

    doc.end()
  })

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presupuesto-${budget.numero}.pdf"`,
    },
  })
}
