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
  // 792 × 612 pts | margins 30 | PAGE_W = 732, usable bottom ≈ 582
  const MARGIN = 30
  const PAGE_H_USABLE = 582
  const doc = new PDFDocument({ margin: MARGIN, size: "LETTER", layout: "landscape" })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))

  const PAGE_W = 792 - MARGIN * 2  // 732
  const LX = MARGIN

  const client = budget.clients ?? null
  const clienteNombre    = client?.full_name  ?? budget.cliente_nombre   ?? "—"
  const clienteRut       = client?.rut        ?? budget.cliente_rut       ?? ""
  const clienteTel       = client?.phone      ?? budget.cliente_telefono  ?? ""
  const clienteEmail     = client?.email      ?? budget.cliente_email     ?? ""
  const clienteDireccion = client?.address    ?? budget.cliente_direccion ?? ""

  const items = (budget.budget_items ?? [])
    .filter((i: any) => i.descripcion)
    .sort((a: any, b: any) => a.orden - b.orden)

  const hasAlt  = items.some((i: any) => (i.rep_korea ?? 0) > 0)
  const hasOtro = items.some((i: any) => (i.rep_multi ?? 0) > 0)

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

    // ── HEADER — fondo celeste uniforme ──────────────────────────────────
    const HDR_H = 60
    doc.rect(LX, MARGIN, PAGE_W, HDR_H).fill("#0ea5e9")

    // Logo
    let logoX = LX + 12
    if (logoBuf) {
      try { doc.image(logoBuf, LX + 8, MARGIN + 6, { height: 44, fit: [70, 44] }); logoX = LX + 86 }
      catch { /* */ }
    }

    // Empresa (zona izquierda-centro)
    const companyW = PAGE_W - 220  // deja 220px para zona derecha
    doc.fillColor("#ffffff").fontSize(13).font("Helvetica-Bold")
      .text(S.company_name || "AAEA Inspecciones", logoX, MARGIN + 7, { width: companyW })
    doc.fontSize(6.5).font("Helvetica").fillColor("#e0f2fe")
      .text(S.company_services || "SERVICIOS INTEGRALES DE INSPECCIÓN Y ASESORÍA AUTOMOTRIZ", logoX, MARGIN + 23, { width: companyW })
    if (S.company_address) {
      const addr = S.company_address + (S.company_address2 ? " // " + S.company_address2 : "")
      doc.fontSize(6).fillColor("#bae6fd").text(addr, logoX, MARGIN + 32, { width: companyW })
    }
    if (S.company_phone || S.company_email) {
      doc.fontSize(6).fillColor("#bae6fd")
        .text([S.company_phone, S.company_email].filter(Boolean).join("   ·   "), logoX, MARGIN + 41, { width: companyW })
    }

    // Zona derecha: RUT arriba + OT debajo, alineados y del mismo ancho (160px)
    const RUT_W = 160
    const rutX  = LX + PAGE_W - RUT_W  // 30 + 732 - 160 = 602

    // RUT
    doc.fillColor("#e0f2fe").fontSize(5.5).font("Helvetica")
      .text("R.U.T.", rutX, MARGIN + 7, { width: RUT_W, align: "center" })
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold")
      .text(S.company_rut || "—", rutX, MARGIN + 14, { width: RUT_W, align: "center" })

    // Separador fino
    doc.moveTo(rutX, MARGIN + 27).lineTo(rutX + RUT_W, MARGIN + 27)
      .strokeColor("#7dd3fc").lineWidth(0.5).stroke()

    // OT box — mismo ancho que RUT, alineado debajo
    doc.roundedRect(rutX, MARGIN + 30, RUT_W, 24, 3).fill("#0369a1")
    doc.fillColor("#bae6fd").fontSize(5.5).font("Helvetica")
      .text("ORDEN DE TRABAJO / PRESUPUESTO", rutX, MARGIN + 33, { align: "center", width: RUT_W })
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold")
      .text(budget.numero, rutX, MARGIN + 41, { align: "center", width: RUT_W })

    let y = MARGIN + HDR_H + 7

    // Nota validez
    doc.fillColor("#374151").fontSize(6.5).font("Helvetica")
      .text(`Válido por: ${budget.vigencia_dias ?? 30} días  ·  NO VÁLIDO COMO BOLETA/FACTURA  ·  Fecha: ${fmtDate(budget.created_at)}`, LX, y)
    y += 11

    // ── TABLA DATOS CLIENTE / VEHÍCULO ────────────────────────────────────
    const drawCell = (label: string, value: string, x: number, cy: number, w: number, h = 22) => {
      doc.rect(x, cy, w, h).stroke("#d1d5db")
      doc.fillColor("#6b7280").fontSize(5.5).font("Helvetica").text(label, x + 3, cy + 2)
      doc.fillColor("#111827").fontSize(7.5).font("Helvetica-Bold")
        .text(value || "—", x + 3, cy + 9, { width: w - 6, ellipsis: true })
    }

    const c6 = PAGE_W / 6
    drawCell("PATENTE",    budget.vehicle_patente ?? "—", LX,        y, c6)
    drawCell("CLIENTE",    clienteNombre,                 LX + c6,   y, c6 * 2)
    drawCell("RUT",        clienteRut,                    LX + c6*3, y, c6)
    drawCell("TELÉFONO",   clienteTel,                    LX + c6*4, y, c6)
    drawCell("FECHA",      fmtDate(budget.created_at),    LX + c6*5, y, c6)
    y += 22

    drawCell("MARCA",      budget.vehicle_marca ?? "—",   LX,        y, c6)
    drawCell("MODELO",     budget.vehicle_modelo ?? "—",  LX + c6,   y, c6)
    drawCell("AÑO",        budget.vehicle_anio ? String(budget.vehicle_anio) : "—", LX + c6*2, y, c6)
    drawCell("COLOR",      budget.vehicle_color ?? "—",   LX + c6*3, y, c6)
    drawCell("EMAIL",      clienteEmail,                  LX + c6*4, y, c6)
    drawCell("FORMA PAGO", budget.forma_pago ?? "—",      LX + c6*5, y, c6)
    y += 22

    drawCell("VIN / CHASIS", budget.vehicle_vin ?? "—",       LX,        y, c6)
    drawCell("N° MOTOR",     budget.vehicle_num_motor ?? "—",  LX + c6,   y, c6)
    drawCell("VERSIÓN",      budget.vehicle_version ?? "—",    LX + c6*2, y, c6 * 2)
    drawCell("KM ACTUAL",    budget.vehicle_km ? Number(budget.vehicle_km).toLocaleString("es-CL") : "—", LX + c6*4, y, c6)
    drawCell("DIRECCIÓN",    clienteDireccion,                 LX + c6*5, y, c6)
    y += 22 + 6

    // ── COLUMNAS TABLA ÍTEMS ──────────────────────────────────────────────
    const repCols = 1 + (hasAlt ? 1 : 0) + (hasOtro ? 1 : 0)
    const CN  = 20                                              // #
    const CG  = 46                                              // gestión
    const CR  = hasAlt && hasOtro ? 62 : hasAlt ? 72 : 82      // rep col (por cada una)
    const CMO = 64                                              // mano obra
    const CDC = 26                                              // dcto%
    const CT  = 64                                              // total ítem
    const CD  = hasAlt || hasOtro ? 148 : 168                  // descripcion
    const usedW = CN + CD + CG + CR * repCols + CMO + CDC + CT
    const CN2 = Math.max(PAGE_W - usedW, 55)                   // desc trabajo

    // Calcular posiciones x de cada columna (para líneas verticales)
    const colXs: number[] = []
    let cxAcc = LX
    for (const w of [CN, CD, CG, ...Array(repCols).fill(CR), CMO, CDC, CT]) {
      cxAcc += w
      colXs.push(cxAcc)
    }

    // Header tabla
    doc.rect(LX, y, PAGE_W, 14).fill("#0284c7")
    const hY = y + 3.5
    doc.fillColor("#ffffff").fontSize(5.5).font("Helvetica-Bold")
    let cx = LX
    doc.text("#",              cx, hY, { width: CN,  align: "center" }); cx += CN
    doc.text("DESCRIPCIÓN / TRABAJO", cx, hY, { width: CD });            cx += CD
    doc.text("GEST.",          cx, hY, { width: CG,  align: "center" }); cx += CG
    doc.text("VALOR ORIGINAL", cx, hY, { width: CR,  align: "right"  }); cx += CR
    if (hasAlt)  { doc.text("VALOR ALT.",  cx, hY, { width: CR, align: "right" }); cx += CR }
    if (hasOtro) { doc.text("VALOR OTRO",  cx, hY, { width: CR, align: "right" }); cx += CR }
    doc.text("MANO OBRA",      cx, hY, { width: CMO, align: "right"  }); cx += CMO
    doc.text("DC%",            cx, hY, { width: CDC, align: "center" }); cx += CDC
    doc.text("TOTAL ITEM",     cx, hY, { width: CT,  align: "right"  }); cx += CT
    doc.text("DESCRIPCIÓN TRABAJO", cx, hY, { width: CN2 })
    y += 14

    // Filas de ítems
    const tableStartY = y
    items.forEach((item: any, idx: number) => {
      if (y > 552) { doc.addPage(); y = MARGIN }
      const rowH = 13
      const bg = idx % 2 === 0 ? "#ffffff" : "#f0f9ff"
      doc.rect(LX, y, PAGE_W, rowH).fill(bg)

      // Líneas verticales entre columnas
      doc.save()
      doc.strokeColor("#d1d5db").lineWidth(0.3)
      for (const vx of colXs) {
        doc.moveTo(vx, y).lineTo(vx, y + rowH).stroke()
      }
      doc.restore()

      const rY = y + 3
      const f    = 1 - (Number(item.dcto_pct) || 0) / 100
      const origN = Math.round((Number(item.rep_genuino)   || 0) * f)
      const altN  = Math.round((Number(item.rep_korea)     || 0) * f)
      const otroN = Math.round((Number(item.rep_multi)     || 0) * f)
      const moN   = Math.round((Number(item.val_mano_obra) || 0) * f)
      const totI  = origN + moN

      const gLabel = item.gestion === "OTRO" ? (item.gestion_custom || "OTRO") : (item.gestion || "MECÁNICO")

      let rx = LX
      doc.fillColor("#374151").fontSize(6.5).font("Helvetica")
      doc.text(String(item.orden ?? idx + 1), rx, rY, { width: CN,  align: "center" }); rx += CN
      doc.text(item.descripcion ?? "",         rx, rY, { width: CD - 2, ellipsis: true }); rx += CD
      doc.fillColor("#6b7280").text(gLabel,    rx, rY, { width: CG,  align: "center" }); rx += CG
      doc.fillColor("#1d4ed8").text(origN > 0 ? `$${fmt(origN)}` : "—", rx, rY, { width: CR, align: "right" }); rx += CR
      if (hasAlt)  { doc.fillColor("#b45309").text(altN  > 0 ? `$${fmt(altN)}`  : "—", rx, rY, { width: CR, align: "right" }); rx += CR }
      if (hasOtro) { doc.fillColor("#15803d").text(otroN > 0 ? `$${fmt(otroN)}` : "—", rx, rY, { width: CR, align: "right" }); rx += CR }
      doc.fillColor("#374151").text(moN > 0 ? `$${fmt(moN)}` : "—",               rx, rY, { width: CMO, align: "right" }); rx += CMO
      doc.text(item.dcto_pct > 0 ? `${item.dcto_pct}%` : "—",                     rx, rY, { width: CDC, align: "center" }); rx += CDC
      doc.fillColor("#111827").font("Helvetica-Bold").text(totI > 0 ? `$${fmt(totI)}` : "—", rx, rY, { width: CT, align: "right" }); rx += CT
      doc.fillColor("#6b7280").font("Helvetica").fontSize(6).text(item.notas ?? "", rx, rY, { width: CN2 - 2 })
      y += rowH
    })

    // Borde externo de la tabla
    doc.rect(LX, tableStartY, PAGE_W, y - tableStartY).strokeColor("#d1d5db").lineWidth(0.4).stroke()

    // Fila subtotales
    if (y > 535) { doc.addPage(); y = MARGIN }
    doc.rect(LX, y, PAGE_W, 14).fill("#e0f2fe")
    const sTY = y + 3.5
    let stx = LX + CN + CD + CG
    doc.fillColor("#1d4ed8").fontSize(6.5).font("Helvetica-Bold")
      .text(`Subtotal rep.: $${fmt(tOrig.sumR)}`, stx, sTY, { width: CR, align: "right" }); stx += CR
    if (hasAlt)  { doc.fillColor("#b45309").text(`$${fmt(tAlt.sumR)}`,  stx, sTY, { width: CR, align: "right" }); stx += CR }
    if (hasOtro) { doc.fillColor("#15803d").text(`$${fmt(tOtro.sumR)}`, stx, sTY, { width: CR, align: "right" }); stx += CR }
    doc.fillColor("#374151").text(`M.O.: $${fmt(tOrig.sumMO)}`, stx, sTY, { width: CMO, align: "right" })
    y += 18

    // ── CUADROS TOTALES POR OPCIÓN + GRAN TOTAL ───────────────────────────
    if (y > 510) { doc.addPage(); y = MARGIN }
    y += 6

    const boxes = [
      { label: "OPCIÓN ORIGINAL",    t: tOrig, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
      ...(hasAlt  ? [{ label: "OPCIÓN ALTERNATIVA", t: tAlt,  color: "#b45309", bg: "#fffbeb", border: "#fde68a" }] : []),
      ...(hasOtro ? [{ label: "OPCIÓN OTRO",         t: tOtro, color: "#15803d", bg: "#f0fdf4", border: "#a7f3d0" }] : []),
    ]

    // Altura dinámica según si hay descuento
    const boxContentLines = dto > 0 ? 3 : 2   // descuento + neto + (vacío) OR neto + (vacío)
    const BOX_INNER = boxContentLines * 9 + 4  // líneas * alto + padding
    const BOX_HEADER = 13
    const BOX_FOOTER = 16
    const boxH = BOX_HEADER + BOX_INNER + BOX_FOOTER   // ≈42–50

    const GRAND_W = 252
    const optionsAreaW = PAGE_W - GRAND_W - 8
    const optGap = 5
    const numOpts = boxes.length
    const optW = Math.floor((optionsAreaW - optGap * (numOpts - 1)) / numOpts)

    // Opciones compactas
    boxes.forEach((box, idx) => {
      const bx = LX + idx * (optW + optGap)

      // Fondo + borde
      doc.rect(bx, y, optW, boxH).fill(box.bg)
      doc.rect(bx, y, optW, boxH).stroke(box.border).lineWidth(0.5)

      // Header coloreado
      doc.rect(bx, y, optW, BOX_HEADER).fill(box.color)
      doc.fillColor("#ffffff").fontSize(6.5).font("Helvetica-Bold")
        .text(box.label, bx, y + 3.5, { align: "center", width: optW })

      // Contenido
      let ry = y + BOX_HEADER + 3
      const cW = optW - 8

      if (dto > 0) {
        doc.fillColor("#6b7280").fontSize(5.5).font("Helvetica")
          .text("Descuento:", bx + 4, ry, { width: cW * 0.52 })
        doc.fillColor("#dc2626").text(`-$${fmt(dto)}`, bx + 4, ry, { width: cW, align: "right" })
        ry += 9
      }
      doc.fillColor("#374151").fontSize(5.5).font("Helvetica")
        .text("Subtotal neto:", bx + 4, ry, { width: cW * 0.52 })
      doc.fillColor("#111827").font("Helvetica-Bold")
        .text(`$${fmt(box.t.sub)}`, bx + 4, ry, { width: cW, align: "right" })
      ry += 9
      doc.fillColor("#374151").font("Helvetica")
        .text(`IVA (${iva}%):`, bx + 4, ry, { width: cW * 0.52 })
      doc.fillColor("#374151")
        .text(`$${fmt(box.t.ivaM)}`, bx + 4, ry, { width: cW, align: "right" })

      // Footer con total
      const footerY = y + boxH - BOX_FOOTER
      doc.rect(bx, footerY, optW, BOX_FOOTER).fill(box.color)
      doc.fillColor("#ffffff").fontSize(7.5).font("Helvetica-Bold")
        .text(`TOTAL c/IVA: $${fmt(box.t.total)}`, bx + 3, footerY + 4, { align: "center", width: optW - 6 })
    })

    // ── PANEL GRAN TOTAL (fondo claro) ────────────────────────────────────
    const grandX = LX + PAGE_W - GRAND_W
    const grandBorder = "#bfdbfe"

    doc.rect(grandX, y, GRAND_W, boxH).fill("#f0f9ff")
    doc.rect(grandX, y, GRAND_W, boxH).stroke(grandBorder).lineWidth(0.7)

    // Header
    doc.rect(grandX, y, GRAND_W, BOX_HEADER).fill("#1e40af")
    doc.fillColor("#ffffff").fontSize(6.5).font("Helvetica-Bold")
      .text("RESUMEN TOTAL (Opción Original)", grandX, y + 3.5, { align: "center", width: GRAND_W })

    // Contenido
    let gY = y + BOX_HEADER + 3
    const gCW = GRAND_W - 8
    const gLeft = GRAND_W * 0.52

    if (dto > 0) {
      doc.fillColor("#6b7280").fontSize(5.5).font("Helvetica")
        .text("Descuento global:", grandX + 4, gY, { width: gLeft })
      doc.fillColor("#dc2626").text(`-$${fmt(dto)}`, grandX + 4, gY, { width: gCW, align: "right" })
      gY += 9
    }
    doc.fillColor("#374151").fontSize(5.5).font("Helvetica")
      .text("Subtotal neto:", grandX + 4, gY, { width: gLeft })
    doc.fillColor("#1e3a5f").font("Helvetica-Bold").text(`$${fmt(tOrig.sub)}`, grandX + 4, gY, { width: gCW, align: "right" })
    gY += 9
    doc.fillColor("#374151").font("Helvetica")
      .text(`IVA (${iva}%):`, grandX + 4, gY, { width: gLeft })
    doc.fillColor("#374151").text(`$${fmt(tOrig.ivaM)}`, grandX + 4, gY, { width: gCW, align: "right" })

    // Footer total
    const gFooterY = y + boxH - BOX_FOOTER
    doc.rect(grandX, gFooterY, GRAND_W, BOX_FOOTER).fill("#1d4ed8")
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
      .text(`TOTAL: $${fmt(tOrig.total)}`, grandX + 4, gFooterY + 4, { align: "center", width: GRAND_W - 8 })

    y += boxH + 12

    // ── DESCRIPCIÓN DEL SERVICIO / OBSERVACIONES ──────────────────────────
    if (budget.descripcion_servicio) {
      if (y > 540) { doc.addPage(); y = MARGIN }
      // Separación antes
      doc.rect(LX, y, PAGE_W, 13).fill("#fef9c3")
      doc.rect(LX, y, PAGE_W, 13).stroke("#fde68a").lineWidth(0.5)
      doc.fillColor("#92400e").fontSize(6.5).font("Helvetica-Bold")
        .text("OBSERVACIONES / DESCRIPCIÓN DEL SERVICIO", LX + 4, y + 3.5)
      y += 15
      doc.fillColor("#374151").fontSize(7).font("Helvetica")
        .text(budget.descripcion_servicio, LX + 4, y, { width: PAGE_W - 8, lineGap: 2.5 })
      y += doc.heightOfString(budget.descripcion_servicio, { width: PAGE_W - 8, lineGap: 2.5 }) + 14
    }

    // ── INFORMACIÓN DE PAGO ────────────────────────────────────────────────
    const payParts = [
      S.company_name,
      S.payment_rut         ? `RUT: ${S.payment_rut}` : null,
      S.payment_account_type && S.payment_account_number
        ? `${S.payment_account_type}: ${S.payment_account_number}` : null,
      S.payment_bank  || null,
      S.payment_email || null,
    ].filter(Boolean)
    const payInfo = payParts.join(" // ")

    if (S.payment_note || payInfo) {
      if (y > 540) { doc.addPage(); y = MARGIN }
      doc.rect(LX, y, PAGE_W, 13).fill("#eff6ff")
      doc.rect(LX, y, PAGE_W, 13).stroke("#bfdbfe").lineWidth(0.5)
      doc.fillColor("#1d4ed8").fontSize(6.5).font("Helvetica-Bold").text("INFORMACIÓN DE PAGO", LX + 4, y + 3.5)
      y += 15
      if (S.payment_note) {
        doc.fillColor("#374151").fontSize(7).font("Helvetica").text(S.payment_note, LX + 4, y, { width: PAGE_W - 8 })
        y += 12
      }
      if (payInfo) {
        doc.fillColor("#1e293b").fontSize(7).font("Helvetica-Bold")
          .text("TRANSFERIR A: " + payInfo, LX + 4, y, { width: PAGE_W - 8, lineGap: 1.5 })
        y += doc.heightOfString("TRANSFERIR A: " + payInfo, { width: PAGE_W - 8 }) + 10
      }
    }

    // ── PIE / FIRMA ────────────────────────────────────────────────────────
    if (y + 70 > PAGE_H_USABLE) { doc.addPage(); y = MARGIN }
    y += 10

    doc.moveTo(LX, y).lineTo(LX + PAGE_W, y).strokeColor("#d1d5db").lineWidth(0.5).stroke()
    y += 10

    // Firma + datos inspector (lado izquierdo)
    if (signatureBuf) {
      try { doc.image(signatureBuf, LX, y, { height: 30, fit: [90, 30] }) } catch { /* */ }
    }

    const nameY = y + (signatureBuf ? 32 : 0)
    doc.fillColor("#111827").fontSize(8.5).font("Helvetica-Bold")
      .text(insp?.full_name ?? S.company_name ?? "", LX, nameY)
    if (insp?.professional_title) {
      doc.fillColor("#374151").fontSize(6.5).font("Helvetica")
        .text(insp.professional_title, LX, nameY + 11)
    }
    if (insp?.phone || insp?.email) {
      const contact = [insp.phone, insp.email].filter(Boolean).join("   ·   ")
      doc.fillColor("#6b7280").fontSize(6).font("Helvetica")
        .text(contact, LX, nameY + (insp?.professional_title ? 20 : 11))
    }

    // Empresa + fecha (lado derecho)
    doc.fillColor("#9ca3af").fontSize(6).font("Helvetica")
      .text(S.company_name + " · " + fmtDate(budget.created_at), LX, nameY + 11, { align: "right", width: PAGE_W })

    doc.end()
  })

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presupuesto-${budget.numero}.pdf"`,
    },
  })
}
