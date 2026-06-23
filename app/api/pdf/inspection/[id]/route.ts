import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import PDFDocument from "pdfkit"

function scoreColor(nota: number): string {
  return nota >= 6.5 ? "#16a34a" : nota >= 5 ? "#d97706" : "#dc2626"
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function formatDate(d: string) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ins } = await supabase
    .from("inspections")
    .select(`*, vehicles(*), clients(full_name, rut, phone, email), profiles(full_name)`)
    .eq("id", id)
    .single()

  if (!ins) return new NextResponse("Not found", { status: 404 })

  const { data: items } = await supabase
    .from("inspection_items")
    .select("*")
    .eq("inspection_id", id)
    .order("section")
    .order("sort_order")

  const doc = new PDFDocument({ margin: 40, size: "A4" })
  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  await new Promise<void>(resolve => {
    doc.on("end", resolve)

    // ── HEADER ──────────────────────────────────────
    doc.rect(40, 40, 515, 60).fill("#1e293b")
    doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold").text("AAEA Inspecciones", 60, 52)
    doc.fontSize(8).font("Helvetica").text("Sistema de inspección vehicular profesional", 60, 72)
    doc.fillColor("#93c5fd").fontSize(11).font("Helvetica-Bold").text("INFORME DE INSPECCIÓN", 380, 52, { align: "right", width: 155 })
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text(formatDate(ins.fecha_inspeccion), 380, 68, { align: "right", width: 155 })

    let y = 120

    // ── VEHÍCULO ─────────────────────────────────────
    doc.fillColor("#f1f5f9").rect(40, y, 515, 16).fill()
    doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text("DATOS DEL VEHÍCULO", 48, y + 4)
    y += 22
    const vCols = [
      ["Patente", ins.vehicles?.patente], ["Marca", ins.vehicles?.marca],
      ["Modelo", ins.vehicles?.modelo], ["Año", ins.vehicles?.anio],
      ["Color", ins.vehicles?.color], ["Combustible", ins.vehicles?.combustible],
      ["Transmisión", ins.vehicles?.transmision], ["Kilometraje", ins.kilometraje ? `${ins.kilometraje.toLocaleString("es-CL")} km` : "—"],
    ]
    vCols.forEach(([label, val], i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      const x = 40 + col * 130
      const rowY = y + row * 28
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text(label as string, x, rowY)
      doc.fillColor("#1e293b").fontSize(8.5).font("Helvetica-Bold").text((val ?? "—") as string, x, rowY + 9)
    })
    y += 64

    // ── CLIENTE ──────────────────────────────────────
    doc.fillColor("#f1f5f9").rect(40, y, 515, 16).fill()
    doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text("CLIENTE", 48, y + 4)
    y += 22
    const cCols = [
      ["Nombre", ins.clients?.full_name], ["RUT", ins.clients?.rut],
      ["Teléfono", ins.clients?.phone], ["Email", ins.clients?.email],
    ]
    cCols.forEach(([label, val], i) => {
      const x = 40 + i * 130
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text(label as string, x, y)
      doc.fillColor("#1e293b").fontSize(8.5).font("Helvetica-Bold").text((val ?? "—") as string, x, y + 9)
    })
    y += 40

    // ── NOTAS ────────────────────────────────────────
    doc.fillColor("#f1f5f9").rect(40, y, 515, 16).fill()
    doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text("RESULTADO DE LA INSPECCIÓN", 48, y + 4)
    y += 22

    const scores = [
      { label: "NOTA FINAL", nota: ins.nota_final, w: 90, h: 70 },
      { label: "Visual", nota: ins.nota_visual, w: 70, h: 50 },
      { label: "Carrocería", nota: ins.nota_carroceria, w: 70, h: 50 },
      { label: "Mecánica", nota: ins.nota_mecanica, w: 70, h: 50 },
    ]
    let sx = 40
    scores.forEach(s => {
      const [r, g, b] = hexToRgb(scoreColor(s.nota))
      doc.roundedRect(sx, y, s.w, s.h, 6).fill(`rgb(${r},${g},${b})`)
      doc.fillColor("#ffffff").fontSize(s.w > 80 ? 28 : 18).font("Helvetica-Bold")
        .text(s.nota?.toFixed(1), sx, y + (s.h > 60 ? 12 : 8), { width: s.w, align: "center" })
      doc.fontSize(7).font("Helvetica")
        .text("/7.0", sx, y + (s.h > 60 ? 44 : 30), { width: s.w, align: "center" })
      doc.text(s.label, sx, y + (s.h > 60 ? 56 : 40), { width: s.w, align: "center" })
      sx += s.w + 8
    })
    y += 80

    // ── ÍTEMS ────────────────────────────────────────
    const secciones: Record<number, string> = { 1: "1. INSPECCIÓN VISUAL", 2: "2. CARROCERÍA", 3: "3. MECÁNICA" }
    let currentSection = 0
    let currentSubsection = ""

    items?.forEach(item => {
      if (y > 760) { doc.addPage(); y = 40 }

      if (item.section !== currentSection) {
        currentSection = item.section
        currentSubsection = ""
        y += 6
        doc.fillColor("#1e293b").rect(40, y, 515, 16).fill()
        doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold").text(secciones[item.section] ?? "", 48, y + 4)
        y += 22
      }

      if (item.subsection !== currentSubsection) {
        currentSubsection = item.subsection
        doc.fillColor("#64748b").fontSize(7.5).font("Helvetica-Bold").text(item.subsection, 48, y)
        y += 12
      }

      const estadoColor = item.estado === "N/A" ? "#94a3b8" :
        ["Bueno", "Sin Daño", "Normal", "Funciona", "A nivel", "No Presenta", "No Encendido"].includes(item.estado) ? "#16a34a" :
        ["Con Daño", "Regular"].includes(item.estado) ? "#d97706" :
        ["Malo", "Anormal", "No Funciona", "Bajo nivel", "Encendido"].includes(item.estado) ? "#dc2626" : "#374151"

      doc.fillColor(y % 20 < 10 ? "#f8fafc" : "#ffffff").rect(40, y - 1, 515, 13).fill()
      doc.fillColor("#374151").fontSize(8).font("Helvetica").text(item.item_label, 48, y, { width: 380 })
      doc.fillColor(estadoColor).fontSize(8).font("Helvetica-Bold").text(item.estado, 400, y, { width: 155, align: "right" })
      y += 13
    })

    // ── COMENTARIOS ──────────────────────────────────
    if (ins.comentarios) {
      if (y > 700) { doc.addPage(); y = 40 }
      y += 8
      doc.fillColor("#f1f5f9").rect(40, y, 515, 16).fill()
      doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text("COMENTARIOS DEL INSPECTOR", 48, y + 4)
      y += 22
      doc.fillColor("#374151").fontSize(8.5).font("Helvetica").text(ins.comentarios, 48, y, { width: 500, lineGap: 3 })
    }

    // ── FOOTER ───────────────────────────────────────
    doc.fillColor("#e2e8f0").rect(40, 780, 515, 0.5).fill()
    doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold").text(ins.profiles?.full_name ?? "", 40, 786)
    doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text("Inspector AAEA", 40, 796)
    doc.fillColor("#94a3b8").fontSize(7).text(`AAEA Inspecciones · ${formatDate(ins.fecha_inspeccion)}`, 40, 796, { align: "right", width: 515 })

    doc.end()
  })

  const buffer = Buffer.concat(chunks)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="inspeccion-${ins.vehicles?.patente}.pdf"`,
    },
  })
}
