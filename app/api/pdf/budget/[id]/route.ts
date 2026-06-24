import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import PDFDocument from "pdfkit"
import QRCode from "qrcode"

function fmt(n: number | null) { return (Math.round(n ?? 0)).toLocaleString("es-CL") }
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

  // Firma del inspector (pre-fetch antes de entrar al callback síncrono)
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

  // Datos del cliente (registrado o libre)
  const client = budget.clients ?? null
  const clienteNombre = client?.full_name ?? budget.cliente_nombre ?? "—"
  const clienteRut = client?.rut ?? budget.cliente_rut ?? ""
  const clienteTel = client?.phone ?? budget.cliente_telefono ?? ""
  const clienteEmail = client?.email ?? budget.cliente_email ?? ""
  const clienteDireccion = client?.address ?? budget.cliente_direccion ?? ""
  const clienteCiudad = client?.city ?? budget.cliente_ciudad ?? ""

  // Ítems activos
  const items = (budget.budget_items ?? []).sort((a: any, b: any) => a.orden - b.orden)

  await new Promise<void>(resolve => {
    doc.on("end", resolve)

    // ── HEADER ───────────────────────────────────────────────────────────
    const PAGE_W = 576 // LETTER 8.5in - margins
    doc.rect(35, 35, PAGE_W, 65).fill("#1e293b")

    // Logo
    let logoX = 50
    if (logoBuf) {
      try { doc.image(logoBuf, 50, 40, { height: 50, fit: [80, 50] }); logoX = 140 }
      catch { /* usa texto */ }
    }

    // Nombre empresa
    doc.fillColor("#ffffff").fontSize(15).font("Helvetica-Bold")
      .text(S.company_name || "AAEA Inspecciones", logoX, 43)
    doc.fontSize(7.5).font("Helvetica").fillColor("#94a3b8")
      .text(S.company_services || "SERVICIOS INTEGRALES DE INSPECCIÓN Y ASESORÍA AUTOMOTRIZ", logoX, 60)
    if (S.company_address) {
      const addr = S.company_address + (S.company_address2 ? " // " + S.company_address2 : "")
      doc.fontSize(6.5).fillColor("#64748b").text(addr, logoX, 73, { width: 280 })
    }
    if (S.company_phone || S.company_email) {
      doc.fontSize(6.5).fillColor("#64748b")
        .text([S.company_phone, S.company_email].filter(Boolean).join("   ·   "), logoX, 84, { width: 280 })
    }

    // RUT + OT + QR (lado derecho)
    const rightX = PAGE_W - 130
    doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text("R.U.T.", rightX, 40, { align: "right", width: 125 })
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold").text(S.company_rut || "—", rightX, 49, { align: "right", width: 125 })

    // Caja OT
    doc.roundedRect(rightX, 58, 125, 28, 3).fill("#334155")
    doc.fillColor("#94a3b8").fontSize(6.5).font("Helvetica").text("ORDEN DE TRABAJO", rightX, 61, { align: "center", width: 125 })
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text(budget.numero, rightX, 70, { align: "center", width: 125 })

    if (qrBuf) {
      try { doc.image(qrBuf, PAGE_W - 15, 38, { width: 58, height: 58 }) } catch { /* */ }
    }

    let y = 115

    // Nota válido por / boleta
    doc.fillColor("#1e293b").fontSize(7).font("Helvetica")
      .text(`Presupuesto válido por: ${budget.vigencia_dias ?? 30} días  ·  NO VÁLIDO COMO BOLETA/FACTURA`, 35, y)
    y += 14

    // ── TABLA DATOS CLIENTE / VEHÍCULO ────────────────────────────────────
    const drawCell = (label: string, value: string, x: number, cellY: number, w: number) => {
      doc.rect(x, cellY, w, 28).stroke("#d1d5db")
      doc.fillColor("#6b7280").fontSize(6.5).font("Helvetica").text(label, x + 3, cellY + 3)
      doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text(value || "—", x + 3, cellY + 12, { width: w - 6 })
    }

    const col5 = PAGE_W / 5
    // Row 1
    drawCell("PATENTE", budget.vehicle_patente ?? "—", 35, y, col5)
    drawCell("CLIENTE", clienteNombre, 35 + col5, y, col5 * 2)
    drawCell("TELÉFONO", clienteTel, 35 + col5 * 3, y, col5)
    drawCell("FECHA", fmtDate(budget.created_at), 35 + col5 * 4, y, col5)
    y += 28

    // Row 2
    drawCell("MARCA", budget.vehicle_marca ?? "—", 35, y, col5)
    drawCell("DIRECCIÓN", clienteDireccion, 35 + col5, y, col5 * 2)
    drawCell("EMAIL", clienteEmail, 35 + col5 * 3, y, col5)
    drawCell("FORMA PAGO", budget.forma_pago ?? "—", 35 + col5 * 4, y, col5)
    y += 28

    // Row 3
    drawCell("MODELO", budget.vehicle_modelo ?? "—", 35, y, col5)
    drawCell("VIN / CHASIS", budget.vehicle_vin ?? "—", 35 + col5, y, col5)
    drawCell("N° MOTOR", budget.vehicle_num_motor ?? "—", 35 + col5 * 2, y, col5)
    drawCell("COLOR", budget.vehicle_color ?? "—", 35 + col5 * 3, y, col5)
    drawCell("KM ACTUAL", budget.vehicle_km ? Number(budget.vehicle_km).toLocaleString("es-CL") : "—", 35 + col5 * 4, y, col5)
    y += 28

    // Row 4
    drawCell("AÑO", budget.vehicle_anio ? String(budget.vehicle_anio) : "—", 35, y, col5)
    drawCell("VERSIÓN", budget.vehicle_version ?? "—", 35 + col5, y, col5 * 4)
    y += 28 + 4

    // ── HEADER TABLA ÍTEMS ────────────────────────────────────────────────
    // Columnas: # | Trabajo | Gestión | $ Rep | $ MO | Dcto | Total | Descripción
    const COL = { num: 22, trab: 110, gest: 50, rep: 55, mo: 55, dcto: 32, total: 55, desc: 0 }
    COL.desc = PAGE_W - COL.num - COL.trab - COL.gest - COL.rep - COL.mo - COL.dcto - COL.total

    doc.rect(35, y, PAGE_W, 15).fill("#334155")
    const hdrY = y + 4
    doc.fillColor("#ffffff").fontSize(6.5).font("Helvetica-Bold")
    let cx = 35
    doc.text("#", cx, hdrY, { width: COL.num, align: "center" }); cx += COL.num
    doc.text("TRABAJO A REALIZAR / TIPO DE TRABAJO", cx, hdrY, { width: COL.trab }); cx += COL.trab
    doc.text("GESTIÓN", cx, hdrY, { width: COL.gest, align: "center" }); cx += COL.gest
    doc.text("$ REPUESTO", cx, hdrY, { width: COL.rep, align: "right" }); cx += COL.rep
    doc.text("$ MANO OBRA", cx, hdrY, { width: COL.mo, align: "right" }); cx += COL.mo
    doc.text("DCTOS", cx, hdrY, { width: COL.dcto, align: "center" }); cx += COL.dcto
    doc.text("VALOR TOTAL", cx, hdrY, { width: COL.total, align: "right" }); cx += COL.total
    doc.text("DESCRIPCIÓN TRABAJO", cx, hdrY, { width: COL.desc })
    y += 15

    // Filas
    items.forEach((item: any, idx: number) => {
      if (y > 680) { doc.addPage(); y = 40 }
      const rowH = 14
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc"
      doc.rect(35, y, PAGE_W, rowH).fill(bg)
      doc.fillColor("#374151").fontSize(7).font("Helvetica")
      let rx = 35
      const rv = y + 3.5
      const gestionLabel = item.gestion === "OTRO" ? (item.gestion_custom || "OTRO") : (item.gestion || "MECÁNICO")
      doc.text(String(item.orden ?? idx + 1), rx, rv, { width: COL.num, align: "center" }); rx += COL.num
      doc.text(item.descripcion ?? "", rx, rv, { width: COL.trab - 2 }); rx += COL.trab
      doc.text(gestionLabel, rx, rv, { width: COL.gest, align: "center" }); rx += COL.gest
      doc.text(item.val_repuesto > 0 ? `$${fmt(item.val_repuesto)}` : "—", rx, rv, { width: COL.rep, align: "right" }); rx += COL.rep
      doc.text(item.val_mano_obra > 0 ? `$${fmt(item.val_mano_obra)}` : "—", rx, rv, { width: COL.mo, align: "right" }); rx += COL.mo
      doc.text(item.dcto_pct > 0 ? `${item.dcto_pct}%` : "0%", rx, rv, { width: COL.dcto, align: "center" }); rx += COL.dcto
      doc.text(item.valor_item > 0 ? `$${fmt(item.valor_item)}` : "—", rx, rv, { width: COL.total, align: "right" }); rx += COL.total
      doc.fillColor("#6b7280").fontSize(6.5).text(item.notas ?? "", rx, rv, { width: COL.desc - 2 })
      y += rowH
    })

    // ── SUBTOTALES ROW ────────────────────────────────────────────────────
    if (y > 640) { doc.addPage(); y = 40 }
    doc.rect(35, y, PAGE_W, 16).fill("#f1f5f9")
    doc.fillColor("#1e293b").fontSize(7.5).font("Helvetica-Bold")
    let sx = 35
    doc.text("TOTALES", sx, y + 4, { width: COL.num + COL.trab + COL.gest }); sx += COL.num + COL.trab + COL.gest
    doc.text(`$${fmt(budget.total_repuestos)}`, sx, y + 4, { width: COL.rep, align: "right" }); sx += COL.rep
    doc.text(`$${fmt(budget.total_mano_obra)}`, sx, y + 4, { width: COL.mo, align: "right" }); sx += COL.mo
    sx += COL.dcto
    doc.text(`$${fmt(budget.gran_total)}`, sx, y + 4, { width: COL.total + COL.desc, align: "right" })
    y += 20

    // ── TOTALES FINALES ───────────────────────────────────────────────────
    const totW = 180
    const totX = PAGE_W + 35 - totW
    const drawTotal = (label: string, value: string, bold = false) => {
      if (bold) {
        doc.rect(totX - 5, y, totW + 5, 16).fill("#1e293b")
        doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
          .text(label, totX, y + 4, { width: totW / 2 })
          .text(value, totX, y + 4, { width: totW, align: "right" })
      } else {
        doc.fillColor("#374151").fontSize(7.5).font("Helvetica")
          .text(label, totX, y + 3, { width: totW / 2 })
        doc.fillColor("#1e293b").fontSize(7.5).font("Helvetica-Bold")
          .text(value, totX, y + 3, { width: totW, align: "right" })
      }
      y += bold ? 18 : 14
    }

    drawTotal("Gran Total:", `$${fmt(budget.gran_total)}`)
    if (budget.descuento_global > 0) drawTotal("Descuento:", `-$${fmt(budget.descuento_global)}`)
    drawTotal("Subtotal:", `$${fmt(budget.subtotal)}`)
    drawTotal(`IVA (${budget.iva_pct}%):`, `$${fmt(budget.iva_monto)}`)
    drawTotal("VALOR TOTAL:", `$${fmt(budget.total)}`, true)

    // ── DESCRIPCIÓN SERVICIO ──────────────────────────────────────────────
    if (budget.descripcion_servicio) {
      if (y > 630) { doc.addPage(); y = 40 }
      y += 8
      doc.rect(35, y, PAGE_W, 14).fill("#fef9c3")
      doc.fillColor("#92400e").fontSize(7).font("Helvetica-Bold").text("OBSERVACIONES / DESCRIPCIÓN DEL SERVICIO", 40, y + 4)
      y += 18
      doc.fillColor("#374151").fontSize(7.5).font("Helvetica")
        .text(budget.descripcion_servicio, 40, y, { width: PAGE_W - 10, lineGap: 2 })
      y += doc.heightOfString(budget.descripcion_servicio, { width: PAGE_W - 10 }) + 8
    }

    // ── DATOS DE PAGO ─────────────────────────────────────────────────────
    const payNote = S.payment_note
    const payInfo = [
      S.company_name,
      S.payment_rut ? `RUT: ${S.payment_rut}` : null,
      S.payment_account_type && S.payment_account_number ? `${S.payment_account_type}: ${S.payment_account_number}` : null,
      S.payment_bank || null,
      S.payment_email || null,
    ].filter(Boolean).join(" // ")

    if (payNote || payInfo) {
      if (y > 650) { doc.addPage(); y = 40 }
      y += 6
      doc.rect(35, y, PAGE_W, 14).fill("#eff6ff")
      doc.fillColor("#1d4ed8").fontSize(7).font("Helvetica-Bold").text("INFORMACIÓN DE PAGO", 40, y + 4)
      y += 16
      if (payNote) {
        doc.fillColor("#374151").fontSize(7).font("Helvetica").text(payNote, 40, y, { width: PAGE_W - 10 })
        y += 12
      }
      if (payInfo) {
        doc.fillColor("#1e293b").fontSize(7).font("Helvetica-Bold").text("TRANSFERIR A: " + payInfo, 40, y, { width: PAGE_W - 10, lineGap: 1 })
        y += doc.heightOfString("TRANSFERIR A: " + payInfo, { width: PAGE_W - 10 }) + 6
      }
    }

    // ── PIE: INSPECTOR ────────────────────────────────────────────────────
    if (y > 690) { doc.addPage(); y = 40 }
    y = Math.max(y + 10, 680)
    doc.moveTo(35, y).lineTo(PAGE_W + 35, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke()
    y += 8

    if (signatureBuf) {
      try { doc.image(signatureBuf, 35, y, { height: 30, fit: [90, 30] }) } catch { /* */ }
      y += 32
    }

    doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold")
      .text(insp?.full_name ?? S.company_name ?? "", 35, y)
    doc.fillColor("#94a3b8").fontSize(6.5).font("Helvetica")
      .text(insp?.professional_title ?? "Inspector AAEA", 35, y + 10)

    doc.fillColor("#94a3b8").fontSize(6.5)
      .text(S.company_name + " · " + fmtDate(budget.created_at), 35, y + 10, { align: "right", width: PAGE_W })
    y += 22

    doc.fillColor("#94a3b8").fontSize(5.5).font("Helvetica")
      .text("VALOR TOTAL PRESUPUESTO ES CON IVA INCLUIDO  ·  VALOR TOTAL PRESUPUESTO ES CON IVA INCLUIDO  ·  VALOR TOTAL PRESUPUESTO ES CON IVA INCLUIDO", 35, y, { align: "center", width: PAGE_W })

    doc.end()
  })

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presupuesto-${budget.numero}.pdf"`,
    },
  })
}
