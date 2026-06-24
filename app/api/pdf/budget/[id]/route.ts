import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import PDFDocument from "pdfkit"
import QRCode from "qrcode"

function fmt(n: number | null) {
  return (n ?? 0).toLocaleString("es-CL")
}

function formatDate(d: string) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const baseUrl = req.nextUrl.origin

  const { data: budget } = await supabase
    .from("budgets")
    .select(`*, clients(full_name, rut, phone, email), profiles(full_name, signature_url), budget_items(*)`)
    .eq("id", id)
    .single()

  if (!budget) return new NextResponse("Not found", { status: 404 })

  // QR code para el portal público del presupuesto
  const publicUrl = budget.public_token ? `${baseUrl}/q/${budget.public_token}` : null
  let qrBuf: Buffer | null = null
  if (publicUrl) {
    try {
      qrBuf = await QRCode.toBuffer(publicUrl, { type: "png", width: 90, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } }) as Buffer
    } catch { /* sin QR */ }
  }

  const doc = new PDFDocument({ margin: 40, size: "A4" })
  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  await new Promise<void>(resolve => {
    doc.on("end", resolve)

    // ── HEADER ──────────────────────────────────────
    doc.rect(40, 40, 515, 60).fill("#1e293b")
    doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold").text("AAEA Inspecciones", 60, 52)
    doc.fontSize(8).font("Helvetica").text("Sistema de inspección vehicular profesional", 60, 72)
    if (qrBuf) {
      doc.image(qrBuf, 460, 43, { width: 54, height: 54 })
      doc.fillColor("#93c5fd").fontSize(10).font("Helvetica-Bold").text("PRESUPUESTO DE REPARACIÓN", 290, 50, { align: "right", width: 165 })
      doc.fillColor("#94a3b8").fontSize(8).font("Helvetica-Bold").text(budget.numero, 290, 63, { align: "right", width: 165 })
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text(formatDate(budget.created_at), 290, 75, { align: "right", width: 165 })
    } else {
      doc.fillColor("#93c5fd").fontSize(11).font("Helvetica-Bold").text("PRESUPUESTO DE REPARACIÓN", 330, 52, { align: "right", width: 205 })
      doc.fillColor("#94a3b8").fontSize(9).font("Helvetica-Bold").text(budget.numero, 330, 66, { align: "right", width: 205 })
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text(formatDate(budget.created_at), 330, 78, { align: "right", width: 205 })
    }

    let y = 120

    // ── CLIENTE ──────────────────────────────────────
    doc.fillColor("#f1f5f9").rect(40, y, 515, 16).fill()
    doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text("DATOS DEL CLIENTE", 48, y + 4)
    y += 22
    const cCols = [
      ["Nombre", budget.clients?.full_name],
      ["RUT", budget.clients?.rut],
      ["Teléfono", budget.clients?.phone],
      ["Email", budget.clients?.email],
    ]
    cCols.forEach(([label, val], i) => {
      const x = 40 + i * 130
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text(label as string, x, y)
      doc.fillColor("#1e293b").fontSize(8.5).font("Helvetica-Bold").text((val ?? "—") as string, x, y + 9)
    })
    y += 40

    // ── TABLA ÍTEMS ──────────────────────────────────
    doc.fillColor("#f1f5f9").rect(40, y, 515, 16).fill()
    doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text("DETALLE DE REPUESTOS Y SERVICIOS", 48, y + 4)
    y += 18

    // Header tabla
    doc.fillColor("#334155").rect(40, y, 515, 14).fill()
    doc.fillColor("#ffffff").fontSize(7).font("Helvetica-Bold")
      .text("Descripción", 48, y + 3.5, { width: 230 })
      .text("Cant.", 280, y + 3.5, { width: 30, align: "center" })
      .text("$ Genuino", 315, y + 3.5, { width: 80, align: "right" })
      .text("$ Korea", 398, y + 3.5, { width: 70, align: "right" })
      .text("$ Multi", 472, y + 3.5, { width: 78, align: "right" })
    y += 16

    let totalG = 0, totalK = 0, totalM = 0
    budget.budget_items?.forEach((item: any, idx: number) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc"
      const subG = item.precio_genuino * item.cantidad
      const subK = item.precio_korea * item.cantidad
      const subMul = item.precio_multi * item.cantidad
      totalG += subG; totalK += subK; totalM += subMul

      doc.fillColor(bg).rect(40, y, 515, 13).fill()
      doc.fillColor("#374151").fontSize(8).font("Helvetica")
        .text(item.descripcion, 48, y + 2.5, { width: 230 })
        .text(String(item.cantidad), 280, y + 2.5, { width: 30, align: "center" })
        .text(`$${fmt(subG)}`, 315, y + 2.5, { width: 80, align: "right" })
        .text(`$${fmt(subK)}`, 398, y + 2.5, { width: 70, align: "right" })
        .text(`$${fmt(subMul)}`, 472, y + 2.5, { width: 78, align: "right" })
      y += 13
    })

    // Fila mano de obra
    if (budget.mano_de_obra > 0) {
      doc.fillColor("#f0f9ff").rect(40, y, 515, 13).fill()
      doc.fillColor("#0369a1").fontSize(8).font("Helvetica-Bold")
        .text("Mano de obra / Instalación", 48, y + 2.5, { width: 230 })
        .text("—", 280, y + 2.5, { width: 30, align: "center" })
        .text(`$${fmt(budget.mano_de_obra)}`, 315, y + 2.5, { width: 80, align: "right" })
        .text(`$${fmt(budget.mano_de_obra)}`, 398, y + 2.5, { width: 70, align: "right" })
        .text(`$${fmt(budget.mano_de_obra)}`, 472, y + 2.5, { width: 78, align: "right" })
      y += 13
    }

    y += 10

    // ── OPCIONES TOTALES ──────────────────────────────
    doc.fillColor("#f1f5f9").rect(40, y, 515, 16).fill()
    doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text("OPCIONES DE PRECIO (IVA incluido)", 48, y + 4)
    y += 22

    const opciones = [
      { label: "GENUINO", total: budget.total_genuino, accepted: budget.opcion_aceptada === "genuino", bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
      { label: "KOREA", total: budget.total_korea, accepted: budget.opcion_aceptada === "korea", bg: "#fefce8", border: "#eab308", color: "#854d0e" },
      { label: "MULTI ORIGEN", total: budget.total_multi, accepted: budget.opcion_aceptada === "multi", bg: "#f0fdf4", border: "#22c55e", color: "#15803d" },
    ]

    const optW = 165
    opciones.forEach((o, i) => {
      const ox = 40 + i * (optW + 8)
      doc.roundedRect(ox, y, optW, 55, 5).stroke(o.border)
      doc.fillColor(o.bg).roundedRect(ox, y, optW, 55, 5).fill()
      doc.fillColor(o.color).fontSize(8).font("Helvetica-Bold").text(o.label, ox, y + 8, { width: optW, align: "center" })
      doc.fillColor("#1e293b").fontSize(18).font("Helvetica-Bold").text(`$${fmt(o.total)}`, ox, y + 20, { width: optW, align: "center" })
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text(`IVA ${budget.iva_pct}% incluido`, ox, y + 42, { width: optW, align: "center" })
      if (o.accepted) {
        doc.fillColor("#16a34a").fontSize(7.5).font("Helvetica-Bold").text("✓ ACEPTADA", ox, y + 44, { width: optW, align: "center" })
      }
    })
    y += 68

    // ── NOTAS ────────────────────────────────────────
    if (budget.notes) {
      if (y > 700) { doc.addPage(); y = 40 }
      y += 8
      doc.fillColor("#f1f5f9").rect(40, y, 515, 16).fill()
      doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text("NOTAS ADICIONALES", 48, y + 4)
      y += 22
      doc.fillColor("#374151").fontSize(8.5).font("Helvetica").text(budget.notes, 48, y, { width: 500, lineGap: 3 })
      y += doc.heightOfString(budget.notes, { width: 500 }) + 10
    }

    // ── FIRMA / INSPECTOR ─────────────────────────────
    if (y > 700) { doc.addPage(); y = 40 }
    y += 10
    doc.moveTo(40, y).lineTo(555, y).strokeColor("#e2e8f0").lineWidth(0.5).stroke()
    y += 10
    doc.fillColor("#1e293b").fontSize(8.5).font("Helvetica-Bold").text(budget.profiles?.full_name ?? "", 40, y)
    doc.fillColor("#94a3b8").fontSize(7.5).font("Helvetica").text("Inspector AAEA", 40, y + 12)
    doc.fillColor("#94a3b8").fontSize(7).text(`AAEA Inspecciones · ${formatDate(budget.created_at)}`, 40, y + 12, { align: "right", width: 515 })

    doc.end()
  })

  const buffer = Buffer.concat(chunks)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presupuesto-${budget.numero}.pdf"`,
    },
  })
}
