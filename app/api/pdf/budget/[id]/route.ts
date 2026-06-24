import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import PDFDocument from "pdfkit"
import QRCode from "qrcode"

function fmt(n: number | null | undefined) { return Math.round(n ?? 0).toLocaleString("es-CL") }
function fmtDate(d: string) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const baseUrl = req.nextUrl.origin

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

  // QR
  const publicUrl = budget.public_token ? `${baseUrl}/q/${budget.public_token}` : null
  let qrBuf: Buffer | null = null
  if (publicUrl) {
    try { qrBuf = await QRCode.toBuffer(publicUrl, { type: "png", width: 90, margin: 1 }) as Buffer }
    catch { /* sin QR */ }
  }

  // Logo
  let logoBuf: Buffer | null = null
  if (S.company_logo_url) {
    try {
      const r = await fetch(S.company_logo_url.split("?")[0])
      if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer())
    } catch { /* sin logo */ }
  }

  // Firma del inspector (pre-fetch antes del callback síncrono)
  let signatureBuf: Buffer | null = null
  const insp = budget.profiles
  if (insp?.signature_url) {
    try {
      const sr = await fetch(insp.signature_url)
      if (sr.ok) signatureBuf = Buffer.from(await sr.arrayBuffer())
    } catch { /* sin firma */ }
  }

  const doc = new PDFDocument({ margin: 35, size: "LETTER" })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))

  const client = budget.clients ?? null
  const clienteNombre = client?.full_name ?? budget.cliente_nombre ?? "—"
  const clienteRut = client?.rut ?? budget.cliente_rut ?? ""
  const clienteTel = client?.phone ?? budget.cliente_telefono ?? ""
  const clienteEmail = client?.email ?? budget.cliente_email ?? ""
  const clienteDireccion = client?.address ?? budget.cliente_direccion ?? ""

  const items = (budget.budget_items ?? [])
    .filter((i: any) => i.descripcion)
    .sort((a: any, b: any) => a.orden - b.orden)

  // Detectar si hay precios alternativos
  const hasAlt  = items.some((i: any) => (i.rep_korea  ?? 0) > 0)
  const hasOtro = items.some((i: any) => (i.rep_multi  ?? 0) > 0)

  // Calcular totales
  const iva = Number(budget.iva_pct ?? 19)
  const dto = Number(budget.descuento_global ?? 0)
  function calcTotalForCol(repField: string) {
    const sumR = items.reduce((acc: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return acc + Math.round((Number(i[repField]) || 0) * f)
    }, 0)
    const sumMO = items.reduce((acc: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return acc + Math.round((Number(i.val_mano_obra) || 0) * f)
    }, 0)
    const sub = sumR + sumMO - dto
    const ivaM = Math.round(sub * iva / 100)
    return { sub, ivaM, total: sub + ivaM }
  }

  const tOrig = calcTotalForCol("rep_genuino")
  const tAlt  = calcTotalForCol("rep_korea")
  const tOtro = calcTotalForCol("rep_multi")

  await new Promise<void>(resolve => {
    doc.on("end", resolve)

    const PAGE_W = 576 // LETTER 8.5" - margins 35px×2

    // ── HEADER (celeste) ──────────────────────────────────────────────────
    const HDR_H = 68
    doc.rect(35, 35, PAGE_W, HDR_H).fill("#0ea5e9") // sky-500

    // Franja inferior más oscura para contraste
    doc.rect(35, 35 + HDR_H - 20, PAGE_W, 20).fill("#0284c7") // sky-600

    // Logo
    let logoX = 48
    if (logoBuf) {
      try {
        doc.image(logoBuf, 48, 40, { height: 46, fit: [76, 46] })
        logoX = 134
      } catch { /* */ }
    }

    // Nombre empresa
    doc.fillColor("#ffffff").fontSize(13).font("Helvetica-Bold")
      .text(S.company_name || "AAEA Inspecciones", logoX, 42, { width: 290 })
    doc.fontSize(7).font("Helvetica").fillColor("#e0f2fe")
      .text(S.company_services || "SERVICIOS INTEGRALES DE INSPECCIÓN Y ASESORÍA AUTOMOTRIZ", logoX, 57, { width: 290 })
    if (S.company_address) {
      const addr = S.company_address + (S.company_address2 ? " // " + S.company_address2 : "")
      doc.fontSize(6.5).fillColor("#bae6fd").text(addr, logoX, 68, { width: 290 })
    }
    if (S.company_phone || S.company_email) {
      doc.fontSize(6.5).fillColor("#bae6fd")
        .text([S.company_phone, S.company_email].filter(Boolean).join("   ·   "), logoX, 78, { width: 290 })
    }

    // Lado derecho: RUT + OT + QR
    const rightX = 35 + PAGE_W - 130
    doc.fillColor("#e0f2fe").fontSize(6.5).font("Helvetica")
      .text("R.U.T.", rightX, 40, { align: "right", width: 127 })
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
      .text(S.company_rut || "—", rightX, 49, { align: "right", width: 127 })

    // Caja OT
    doc.roundedRect(rightX, 59, 125, 28, 3).fill("#0369a1") // sky-700
    doc.fillColor("#bae6fd").fontSize(6).font("Helvetica")
      .text("ORDEN DE TRABAJO", rightX, 62, { align: "center", width: 125 })
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold")
      .text(budget.numero, rightX, 71, { align: "center", width: 125 })

    if (qrBuf) {
      try { doc.image(qrBuf, 35 + PAGE_W - 12, 37, { width: 56, height: 56 }) } catch { /* */ }
    }

    let y = 35 + HDR_H + 10

    // Nota validez
    doc.fillColor("#374151").fontSize(6.5).font("Helvetica")
      .text(`Presupuesto válido por: ${budget.vigencia_dias ?? 30} días  ·  NO VÁLIDO COMO BOLETA/FACTURA`, 35, y)
    y += 12

    // ── TABLA DATOS CLIENTE / VEHÍCULO ────────────────────────────────────
    const drawCell = (label: string, value: string, x: number, cellY: number, w: number, h = 26) => {
      doc.rect(x, cellY, w, h).stroke("#d1d5db")
      doc.fillColor("#6b7280").fontSize(5.5).font("Helvetica").text(label, x + 3, cellY + 2.5)
      doc.fillColor("#111827").fontSize(7.5).font("Helvetica-Bold")
        .text(value || "—", x + 3, cellY + 10, { width: w - 6, ellipsis: true })
    }

    const c5 = PAGE_W / 5
    // Row 1
    drawCell("PATENTE",   budget.vehicle_patente ?? "—", 35,          y, c5)
    drawCell("CLIENTE",   clienteNombre,                 35 + c5,     y, c5 * 2)
    drawCell("TELÉFONO",  clienteTel,                    35 + c5 * 3, y, c5)
    drawCell("FECHA",     fmtDate(budget.created_at),    35 + c5 * 4, y, c5)
    y += 26

    // Row 2
    drawCell("MARCA",       budget.vehicle_marca ?? "—",    35,          y, c5)
    drawCell("DIRECCIÓN",   clienteDireccion,                35 + c5,     y, c5 * 2)
    drawCell("RUT CLIENTE", clienteRut,                      35 + c5 * 3, y, c5)
    drawCell("FORMA PAGO",  budget.forma_pago ?? "—",        35 + c5 * 4, y, c5)
    y += 26

    // Row 3
    drawCell("MODELO",     budget.vehicle_modelo ?? "—",    35,          y, c5)
    drawCell("VIN / CHASIS", budget.vehicle_vin ?? "—",     35 + c5,     y, c5)
    drawCell("N° MOTOR",   budget.vehicle_num_motor ?? "—", 35 + c5 * 2, y, c5)
    drawCell("COLOR",      budget.vehicle_color ?? "—",     35 + c5 * 3, y, c5)
    drawCell("KM ACTUAL",  budget.vehicle_km ? Number(budget.vehicle_km).toLocaleString("es-CL") : "—", 35 + c5 * 4, y, c5)
    y += 26

    // Row 4
    drawCell("AÑO",     budget.vehicle_anio ? String(budget.vehicle_anio) : "—", 35,       y, c5)
    drawCell("VERSIÓN", budget.vehicle_version ?? "—",                            35 + c5,  y, c5 * 4)
    y += 26 + 5

    // ── HEADER TABLA ÍTEMS ────────────────────────────────────────────────
    // Columnas dinámicas según si hay precios alt/otro
    const numCols = 1 + (hasAlt ? 1 : 0) + (hasOtro ? 1 : 0)
    const COL_NUM  = 20
    const COL_DESC = hasAlt || hasOtro ? 130 : 160
    const COL_GEST = 48
    const REP_W    = hasAlt && hasOtro ? 52 : hasAlt ? 60 : 65
    const COL_MO   = 58
    const COL_DCTO = 28
    const COL_TOT  = 55
    const COL_NOTAS = PAGE_W - COL_NUM - COL_DESC - COL_GEST - (REP_W * numCols) - COL_MO - COL_DCTO - COL_TOT

    doc.rect(35, y, PAGE_W, 14).fill("#0284c7") // sky-600
    const hY = y + 3.5
    doc.fillColor("#ffffff").fontSize(6).font("Helvetica-Bold")
    let cx = 35
    doc.text("#",       cx, hY, { width: COL_NUM, align: "center" }); cx += COL_NUM
    doc.text("TRABAJO / DESCRIPCIÓN", cx, hY, { width: COL_DESC }); cx += COL_DESC
    doc.text("GEST.",   cx, hY, { width: COL_GEST, align: "center" }); cx += COL_GEST
    doc.text("$ ORIG.", cx, hY, { width: REP_W, align: "right" });  cx += REP_W
    if (hasAlt)  { doc.text("$ ALT.",  cx, hY, { width: REP_W, align: "right" }); cx += REP_W }
    if (hasOtro) { doc.text("$ OTRO",  cx, hY, { width: REP_W, align: "right" }); cx += REP_W }
    doc.text("$ M.O.",  cx, hY, { width: COL_MO,   align: "right" }); cx += COL_MO
    doc.text("DC%",     cx, hY, { width: COL_DCTO, align: "center" }); cx += COL_DCTO
    doc.text("TOTAL",   cx, hY, { width: COL_TOT,  align: "right" }); cx += COL_TOT
    if (COL_NOTAS > 0) doc.text("NOTAS", cx, hY, { width: COL_NOTAS })
    y += 14

    // Filas
    items.forEach((item: any, idx: number) => {
      if (y > 680) { doc.addPage(); y = 40 }
      const rowH = 13
      const bg = idx % 2 === 0 ? "#ffffff" : "#f0f9ff" // alternar con celeste muy claro
      doc.rect(35, y, PAGE_W, rowH).fill(bg)

      const rY = y + 3
      const f  = 1 - (Number(item.dcto_pct) || 0) / 100
      const origNet  = Math.round((Number(item.rep_genuino) || 0) * f)
      const altNet   = Math.round((Number(item.rep_korea)   || 0) * f)
      const otroNet  = Math.round((Number(item.rep_multi)   || 0) * f)
      const moNet    = Math.round((Number(item.val_mano_obra)|| 0) * f)
      const rowTotal = origNet + moNet

      const gLabel = item.gestion === "OTRO" ? (item.gestion_custom || "OTRO") : (item.gestion || "MECÁNICO")

      doc.fillColor("#374151").fontSize(6.5).font("Helvetica")
      let rx = 35
      doc.text(String(item.orden ?? idx + 1), rx, rY, { width: COL_NUM, align: "center" }); rx += COL_NUM
      doc.text(item.descripcion ?? "", rx, rY, { width: COL_DESC - 2, ellipsis: true }); rx += COL_DESC
      doc.fillColor("#6b7280").text(gLabel, rx, rY, { width: COL_GEST, align: "center" }); rx += COL_GEST
      doc.fillColor("#1d4ed8").text(origNet > 0 ? `$${fmt(origNet)}` : "—", rx, rY, { width: REP_W, align: "right" }); rx += REP_W
      if (hasAlt)  { doc.fillColor("#b45309").text(altNet  > 0 ? `$${fmt(altNet)}`  : "—", rx, rY, { width: REP_W, align: "right" }); rx += REP_W }
      if (hasOtro) { doc.fillColor("#15803d").text(otroNet > 0 ? `$${fmt(otroNet)}` : "—", rx, rY, { width: REP_W, align: "right" }); rx += REP_W }
      doc.fillColor("#374151").text(moNet > 0 ? `$${fmt(moNet)}` : "—", rx, rY, { width: COL_MO, align: "right" }); rx += COL_MO
      doc.text(item.dcto_pct > 0 ? `${item.dcto_pct}%` : "—", rx, rY, { width: COL_DCTO, align: "center" }); rx += COL_DCTO
      doc.fillColor("#111827").font("Helvetica-Bold").text(rowTotal > 0 ? `$${fmt(rowTotal)}` : "—", rx, rY, { width: COL_TOT, align: "right" }); rx += COL_TOT
      if (COL_NOTAS > 0) { doc.fillColor("#9ca3af").font("Helvetica").fontSize(6).text(item.notas ?? "", rx, rY, { width: COL_NOTAS - 2 }) }
      y += rowH
    })

    // ── FILA TOTALES COLUMNAS ─────────────────────────────────────────────
    if (y > 650) { doc.addPage(); y = 40 }
    doc.rect(35, y, PAGE_W, 14).fill("#e0f2fe") // celeste muy claro
    const sTY = y + 3.5
    doc.fillColor("#0369a1").fontSize(6.5).font("Helvetica-Bold")
    let stx = 35
    stx += COL_NUM + COL_DESC + COL_GEST
    const sumOrigRep = items.reduce((a: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return a + Math.round((Number(i.rep_genuino) || 0) * f)
    }, 0)
    const sumAltRep = items.reduce((a: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return a + Math.round((Number(i.rep_korea) || 0) * f)
    }, 0)
    const sumOtroRep = items.reduce((a: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return a + Math.round((Number(i.rep_multi) || 0) * f)
    }, 0)
    const sumMO = items.reduce((a: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return a + Math.round((Number(i.val_mano_obra) || 0) * f)
    }, 0)

    doc.fillColor("#1d4ed8").text(`$${fmt(sumOrigRep)}`, stx, sTY, { width: REP_W, align: "right" }); stx += REP_W
    if (hasAlt)  { doc.fillColor("#b45309").text(`$${fmt(sumAltRep)}`,  stx, sTY, { width: REP_W, align: "right" }); stx += REP_W }
    if (hasOtro) { doc.fillColor("#15803d").text(`$${fmt(sumOtroRep)}`, stx, sTY, { width: REP_W, align: "right" }); stx += REP_W }
    doc.fillColor("#374151").text(`$${fmt(sumMO)}`, stx, sTY, { width: COL_MO, align: "right" }); stx += COL_MO
    stx += COL_DCTO
    doc.fillColor("#111827").text(`$${fmt(tOrig.sub - dto === 0 ? tOrig.sub + dto : tOrig.sub + dto)}`, stx, sTY, { width: COL_TOT + (COL_NOTAS > 0 ? COL_NOTAS : 0), align: "right" })
    y += 18

    // ── CUADROS TOTALES FINALES ───────────────────────────────────────────
    const boxes = [
      { label: "ORIGINAL",    t: tOrig, color: "#1d4ed8", bg: "#eff6ff" },
      ...(hasAlt  ? [{ label: "ALTERNATIVO", t: tAlt,  color: "#b45309", bg: "#fffbeb" }] : []),
      ...(hasOtro ? [{ label: "OTRO",        t: tOtro, color: "#15803d", bg: "#f0fdf4" }] : []),
    ]

    if (y > 620) { doc.addPage(); y = 40 }
    y += 6

    const boxCount = boxes.length
    const boxW = boxCount === 3 ? 182 : boxCount === 2 ? 274 : 546
    const boxGap = 4
    boxes.forEach((box, idx) => {
      const bx = 35 + idx * (boxW + boxGap)
      doc.rect(bx, y, boxW, 52).fill(box.bg)
      doc.rect(bx, y, boxW, 12).fill(box.color)
      doc.fillColor("#ffffff").fontSize(7).font("Helvetica-Bold")
        .text(box.label, bx, y + 3.5, { align: "center", width: boxW })

      const ry = y + 16
      doc.fillColor("#374151").fontSize(6.5).font("Helvetica")
      if (dto > 0) {
        doc.text("Dcto. global:", bx + 4, ry, { width: boxW * 0.55 })
        doc.fillColor("#dc2626").text(`-$${fmt(dto)}`, bx + 4, ry, { width: boxW - 8, align: "right" })
      }
      doc.fillColor("#374151").text("Subtotal neto:", bx + 4, dto > 0 ? ry + 9 : ry, { width: boxW * 0.55 })
      doc.fillColor("#111827").font("Helvetica-Bold").text(`$${fmt(box.t.sub)}`, bx + 4, dto > 0 ? ry + 9 : ry, { width: boxW - 8, align: "right" })
      doc.fillColor("#374151").font("Helvetica").text(`IVA (${iva}%):`, bx + 4, dto > 0 ? ry + 18 : ry + 9, { width: boxW * 0.55 })
      doc.fillColor("#374151").text(`$${fmt(box.t.ivaM)}`, bx + 4, dto > 0 ? ry + 18 : ry + 9, { width: boxW - 8, align: "right" })

      // Total grande
      doc.rect(bx, y + 38, boxW, 14).fill(box.color)
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
        .text(`TOTAL: $${fmt(box.t.total)}`, bx + 4, y + 41, { align: "center", width: boxW - 8 })
    })
    y += 60

    // ── DESCRIPCIÓN SERVICIO ──────────────────────────────────────────────
    if (budget.descripcion_servicio) {
      if (y > 630) { doc.addPage(); y = 40 }
      y += 6
      doc.rect(35, y, PAGE_W, 13).fill("#fef9c3")
      doc.fillColor("#92400e").fontSize(6.5).font("Helvetica-Bold")
        .text("OBSERVACIONES / DESCRIPCIÓN DEL SERVICIO", 40, y + 3.5)
      y += 16
      doc.fillColor("#374151").fontSize(7).font("Helvetica")
        .text(budget.descripcion_servicio, 40, y, { width: PAGE_W - 10, lineGap: 2 })
      y += doc.heightOfString(budget.descripcion_servicio, { width: PAGE_W - 10 }) + 8
    }

    // ── DATOS DE PAGO ─────────────────────────────────────────────────────
    const payNote = S.payment_note
    const payParts = [
      S.company_name,
      S.payment_rut       ? `RUT: ${S.payment_rut}`                                                   : null,
      S.payment_account_type && S.payment_account_number ? `${S.payment_account_type}: ${S.payment_account_number}` : null,
      S.payment_bank      || null,
      S.payment_email     || null,
    ].filter(Boolean)
    const payInfo = payParts.join(" // ")

    if (payNote || payInfo) {
      if (y > 650) { doc.addPage(); y = 40 }
      y += 6
      doc.rect(35, y, PAGE_W, 13).fill("#eff6ff")
      doc.fillColor("#1d4ed8").fontSize(6.5).font("Helvetica-Bold").text("INFORMACIÓN DE PAGO", 40, y + 3.5)
      y += 16
      if (payNote) {
        doc.fillColor("#374151").fontSize(7).font("Helvetica").text(payNote, 40, y, { width: PAGE_W - 10 })
        y += 12
      }
      if (payInfo) {
        doc.fillColor("#1e293b").fontSize(7).font("Helvetica-Bold")
          .text("TRANSFERIR A: " + payInfo, 40, y, { width: PAGE_W - 10, lineGap: 1 })
        y += doc.heightOfString("TRANSFERIR A: " + payInfo, { width: PAGE_W - 10 }) + 6
      }
    }

    // ── PIE: INSPECTOR ────────────────────────────────────────────────────
    if (y > 690) { doc.addPage(); y = 40 }
    y = Math.max(y + 8, 675)
    doc.moveTo(35, y).lineTo(35 + PAGE_W, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke()
    y += 8

    if (signatureBuf) {
      try { doc.image(signatureBuf, 35, y, { height: 28, fit: [80, 28] }) } catch { /* */ }
      y += 30
    }

    doc.fillColor("#111827").fontSize(8).font("Helvetica-Bold")
      .text(insp?.full_name ?? S.company_name ?? "", 35, y)
    doc.fillColor("#6b7280").fontSize(6.5).font("Helvetica")
      .text(insp?.professional_title ?? "Inspector AAEA", 35, y + 10)

    doc.fillColor("#9ca3af").fontSize(6)
      .text(S.company_name + " · " + fmtDate(budget.created_at), 35, y + 10, { align: "right", width: PAGE_W })
    y += 22

    doc.fillColor("#9ca3af").fontSize(5.5)
      .text("VALOR TOTAL CON IVA INCLUIDO  ·  NO VÁLIDO COMO BOLETA O FACTURA", 35, y, { align: "center", width: PAGE_W })

    doc.end()
  })

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presupuesto-${budget.numero}.pdf"`,
    },
  })
}
