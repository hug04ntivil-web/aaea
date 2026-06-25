import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import PDFDocument from "pdfkit"
import QRCode from "qrcode"

// ── Colors ──────────────────────────────────────────────────────────────────
const C = {
  brand:    "#1e3a5f",   // Dark navy — header
  accent:   "#2563eb",   // Blue accent
  good:     "#16a34a",   // Green
  warn:     "#d97706",   // Amber
  bad:      "#dc2626",   // Red
  na:       "#94a3b8",   // Gray
  text:     "#1e293b",   // Dark text
  muted:    "#64748b",   // Gray text
  light:    "#f8fafc",   // Light bg
  mid:      "#e2e8f0",   // Border
  white:    "#ffffff",
}

function hexRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]
}
function fill(doc: PDFKit.PDFDocument, col: string) { doc.fillColor(col) }
function stroke(doc: PDFKit.PDFDocument, col: string) { doc.strokeColor(col) }

function formatDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function estadoColor(estado: string): string {
  if (["Bueno","Sin Daño","Normal","Funciona","A nivel","No Presenta","No Encendido"].includes(estado)) return C.good
  if (["Con Daño","Regular"].includes(estado)) return C.warn
  if (["Malo","Anormal","No Funciona","Bajo nivel","Encendido","Presenta"].includes(estado)) return C.bad
  return C.na
}

// ── Zone mapping: inspection key → car zone ──────────────────────────────────
const ZONE_MAP: Record<string, string> = {
  capot: "hood",          parachoques_del: "front_bumper",
  parabrisas_del: "windshield_f", focos_opticos: "front_bumper", mascara: "front_bumper",
  techo: "roof",
  tapabarros_izq: "left",  puertas_izq: "left",   zocalo_izq: "left",  espejo_izq: "left", pilares_izq: "left",
  tapabarros_der: "right", puertas_der: "right",  zocalo_der: "right", espejo_der: "right", pilares_der: "right",
  portalon: "trunk",      parachoque_post: "rear_bumper", parabrisas_post: "windshield_r",
  neumatico_del_izq: "wheel_fl", llanta_del_izq: "wheel_fl",
  neumatico_del_der: "wheel_fr", llanta_del_der: "wheel_fr",
  neumatico_tra_izq: "wheel_rl", llanta_tra_izq: "wheel_rl",
  neumatico_tra_der: "wheel_rr", llanta_tra_der: "wheel_rr",
}

function calcZoneColors(items: any[]): Record<string, string> {
  const zones: Record<string, number> = {}  // 0=ok, 1=warn, 2=bad
  items?.forEach(item => {
    const zone = ZONE_MAP[item.item_key]
    if (!zone) return
    const lvl = ["Con Daño","Malo","Anormal","No Funciona","Bajo nivel","Presenta","Encendido"].includes(item.estado) ? 2
              : ["Regular"].includes(item.estado) ? 1 : 0
    if ((zones[zone] ?? -1) < lvl) zones[zone] = lvl
  })
  const map: Record<string, string> = {}
  Object.entries(zones).forEach(([z, lvl]) => {
    map[z] = lvl === 2 ? C.bad : lvl === 1 ? C.warn : C.good
  })
  return map
}

// ── Car diagram (top-down view) using PDFKit ─────────────────────────────────
function drawCarDiagram(doc: PDFKit.PDFDocument, ox: number, oy: number, zones: Record<string, string>) {
  const z = (k: string) => zones[k] ?? C.mid
  const W = 130, H = 220

  // Body outline
  fill(doc, C.mid); stroke(doc, C.muted)
  doc.roundedRect(ox, oy, W, H, 18).fillAndStroke()

  // Front bumper
  fill(doc, z("front_bumper")); stroke(doc, C.muted)
  doc.roundedRect(ox+8, oy+2, W-16, 18, 8).fillAndStroke(z("front_bumper"), C.muted)

  // Hood
  fill(doc, z("hood"))
  doc.rect(ox+8, oy+20, W-16, 40).fillAndStroke(z("hood"), C.muted)

  // Windshield front
  fill(doc, z("windshield_f"))
  doc.rect(ox+18, oy+60, W-36, 22).fillAndStroke(z("windshield_f") !== C.mid ? z("windshield_f") : "#dbeafe", C.muted)

  // Left side (doors+fenders)
  doc.rect(ox+2, oy+60, 16, 100).fillAndStroke(z("left"), C.muted)

  // Right side (doors+fenders)
  doc.rect(ox+W-18, oy+60, 16, 100).fillAndStroke(z("right"), C.muted)

  // Roof
  doc.rect(ox+18, oy+82, W-36, 56).fillAndStroke(z("roof") !== C.mid ? z("roof") : C.light, C.muted)

  // Windshield rear
  doc.rect(ox+18, oy+138, W-36, 18).fillAndStroke(z("windshield_r") !== C.mid ? z("windshield_r") : "#dbeafe", C.muted)

  // Trunk
  doc.rect(ox+8, oy+156, W-16, 40).fillAndStroke(z("trunk"), C.muted)

  // Rear bumper
  doc.roundedRect(ox+8, oy+H-22, W-16, 18, 8).fillAndStroke(z("rear_bumper"), C.muted)

  // Wheels (4 ellipses)
  const wZones = [
    { x: ox-8, y: oy+38, z: "wheel_fl" },
    { x: ox+W-4, y: oy+38, z: "wheel_fr" },
    { x: ox-8, y: oy+H-68, z: "wheel_rl" },
    { x: ox+W-4, y: oy+H-68, z: "wheel_rr" },
  ]
  wZones.forEach(w => {
    doc.ellipse(w.x+6, w.y+14, 8, 16).fillAndStroke(z(w.z), "#334155")
  })

  // Direction arrow
  fill(doc, C.accent)
  doc.polygon([ox+W/2-5, oy-14], [ox+W/2+5, oy-14], [ox+W/2, oy-2]).fill()
  fill(doc, C.muted)
  doc.fontSize(5).font("Helvetica").text("FRENTE", ox, oy-22, { width: W, align: "center" })
  doc.text("POSTERIOR", ox, oy+H+4, { width: W, align: "center" })

  // Zone labels inside diagram
  const labels: [string, number, number][] = [
    ["CAPOT", ox+W/2, oy+32],
    ["TECHO", ox+W/2, oy+100],
    ["MAL.", ox+W/2, oy+170],
  ]
  fill(doc, C.white)
  doc.fontSize(4.5).font("Helvetica-Bold")
  labels.forEach(([txt, lx, ly]) => doc.text(txt, lx-20, ly, { width: 40, align: "center" }))
}

// ── Legend ───────────────────────────────────────────────────────────────────
function drawLegend(doc: PDFKit.PDFDocument, x: number, y: number) {
  const items = [["Sin daño", C.good], ["Con advertencia", C.warn], ["Con daño", C.bad], ["Sin evaluar", C.mid]]
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.text).text("LEYENDA:", x, y); y += 10
  items.forEach(([label, color]) => {
    fill(doc, color as string); stroke(doc, C.muted)
    doc.roundedRect(x, y, 10, 8, 2).fillAndStroke()
    fill(doc, C.muted); doc.fontSize(6).font("Helvetica").text(label as string, x+13, y+1)
    y += 12
  })
}

// ── Section header ─────────────────────────────────────────────────────────
function sectionHeader(doc: PDFKit.PDFDocument, label: string, y: number): number {
  fill(doc, C.brand); stroke(doc, C.brand)
  doc.rect(40, y, 515, 14).fill()
  fill(doc, C.white)
  doc.fontSize(7).font("Helvetica-Bold").text(label, 46, y+3.5)
  return y + 18
}

function subHeader(doc: PDFKit.PDFDocument, label: string, y: number): number {
  fill(doc, "#e0e7ef")
  doc.rect(40, y, 515, 11).fill()
  fill(doc, C.brand)
  doc.fontSize(6.5).font("Helvetica-Bold").text(label.replace(/^\d+\.\d+\s*/, ""), 46, y+2.5)
  return y + 14
}

// ── Table row ────────────────────────────────────────────────────────────────
function tableRow(doc: PDFKit.PDFDocument, item: any, y: number, even: boolean): number {
  const rowH = 11
  if (even) { fill(doc, "#f1f5f9"); doc.rect(40, y, 515, rowH).fill() }

  const color = estadoColor(item.estado)
  const isBad = ["Con Daño","Malo","Anormal","No Funciona","Bajo nivel","Presenta","Encendido"].includes(item.estado)

  fill(doc, C.text)
  doc.fontSize(7).font("Helvetica").text(item.item_label, 46, y+2, { width: 330 })
  fill(doc, color)
  doc.fontSize(7).font("Helvetica-Bold").text(item.estado, 380, y+2, { width: 90, align: "center" })

  if (isBad) {
    fill(doc, color); doc.circle(372, y+5.5, 3).fill()
  }

  if (item.observaciones) {
    fill(doc, C.muted)
    doc.fontSize(5.5).font("Helvetica").text(`↳ ${item.observaciones}`, 46, y+rowH-1, { width: 460 })
    return rowH + 7
  }

  return rowH
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const baseUrl = req.nextUrl.origin

  const [{ data: ins }, { data: settings }] = await Promise.all([
    supabase.from("inspections")
      .select(`*, vehicles(*), clients(full_name, rut, phone, email, city), profiles(full_name)`)
      .eq("id", id).single(),
    supabase.from("settings").select("*").limit(1).single(),
  ])

  if (!ins) return new NextResponse("Not found", { status: 404 })

  const { data: inspItems } = await supabase
    .from("inspection_items").select("*").eq("inspection_id", id).order("section").order("sort_order")

  const items = inspItems ?? []
  const zoneColors = calcZoneColors(items)

  // QR code
  const publicUrl = ins.public_token ? `${baseUrl}/p/${ins.public_token}` : null
  let qrBuf: Buffer | null = null
  if (publicUrl) {
    try { qrBuf = await QRCode.toBuffer(publicUrl, { type: "png", width: 80, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } }) as Buffer }
    catch { /* sin QR */ }
  }

  // Logo
  const logoUrl = settings?.company_logo_url
  let logoBuf: Buffer | null = null
  if (logoUrl && !logoUrl.endsWith(".svg")) {
    try {
      const r = await fetch(logoUrl)
      if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer())
    } catch { /* sin logo */ }
  }

  // Photo buffers
  const photoBuffers: Buffer[] = []
  for (const url of (ins.photos ?? []) as string[]) {
    try { const r = await fetch(url); if (r.ok) photoBuffers.push(Buffer.from(await r.arrayBuffer())) } catch { }
  }

  const companyName = settings?.company_name || "AAEA Inspecciones"
  const companyPhone = settings?.company_phone || ""
  const companyEmail = settings?.company_email || ""
  const v = ins.vehicles ?? {}
  const c = ins.clients ?? {}
  const badItems = items.filter(i => ["Con Daño","Malo","Anormal","No Funciona","Bajo nivel"].includes(i.estado))

  const doc = new PDFDocument({ margin: 0, size: "A4" })
  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  await new Promise<void>(resolve => {
    doc.on("end", resolve)

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 1 — HEADER + VEHICLE + SCORES + DIAGRAM
    // ══════════════════════════════════════════════════════════════════════════

    // ── Header bar ──────────────────────────────────────────────────────────
    fill(doc, C.brand)
    doc.rect(0, 0, 595, 68).fill()

    // Logo
    if (logoBuf) {
      try { doc.image(logoBuf, 14, 12, { height: 44, fit: [110, 44] }) }
      catch { fill(doc, C.white); doc.fontSize(14).font("Helvetica-Bold").text(companyName, 14, 22) }
    } else {
      fill(doc, C.white)
      doc.fontSize(14).font("Helvetica-Bold").text(companyName, 14, 16)
      if (companyPhone) doc.fontSize(7).font("Helvetica").text(`Tel: ${companyPhone}`, 14, 34)
      if (companyEmail) doc.fontSize(7).font("Helvetica").text(companyEmail, 14, 44)
    }

    // Title & metadata (center)
    fill(doc, C.white)
    doc.fontSize(15).font("Helvetica-Bold").text("INFORME DE INSPECCIÓN VEHICULAR", 130, 14, { width: 320, align: "center" })
    doc.fontSize(7.5).font("Helvetica").text(`Fecha: ${formatDate(ins.fecha_inspeccion)}`, 130, 34, { width: 320, align: "center" })
    doc.fontSize(7).text(`Inspector: ${ins.profiles?.full_name ?? "—"}`, 130, 45, { width: 320, align: "center" })

    // QR code (right)
    if (qrBuf) {
      try { doc.image(qrBuf, 522, 4, { width: 58, height: 58 }) } catch { }
    }

    // ── Colored accent band ──────────────────────────────────────────────────
    fill(doc, C.accent); doc.rect(0, 68, 595, 4).fill()

    let y = 80

    // ── Vehicle data grid ────────────────────────────────────────────────────
    y = sectionHeader(doc, "  ⊡  DATOS DEL VEHÍCULO", y)

    const vFields: [string, string][] = [
      ["Patente",      v.patente ?? "—"],
      ["Marca",        v.marca ?? "—"],
      ["Modelo",       v.modelo ?? "—"],
      ["Año",          v.anio ? String(v.anio) : "—"],
      ["Color",        v.color ?? "—"],
      ["Kilometraje",  ins.kilometraje ? `${Number(ins.kilometraje).toLocaleString("es-CL")} km` : "—"],
      ["Combustible",  v.combustible ?? "—"],
      ["Transmisión",  v.transmision ?? "—"],
      ["VIN / Chasis", v.vin ?? "—"],
      ["N° Motor",     v.num_motor ?? "—"],
      ["Tipo",         v.tipo_vehiculo ?? "—"],
      ["Tracción",     v.traccion ?? "—"],
    ]

    const colW = 128, cols = 4
    vFields.forEach(([label, val], i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const x = 40 + col * colW, vy = y + row * 22
      if (row % 2 === 1) { fill(doc, C.light); doc.rect(x, vy-2, colW, 22).fill() }
      fill(doc, C.muted); doc.fontSize(6.5).font("Helvetica").text(label, x+4, vy+1)
      fill(doc, C.text); doc.fontSize(8.5).font("Helvetica-Bold").text(val, x+4, vy+10)
    })
    y += Math.ceil(vFields.length / cols) * 22 + 6

    // ── Client data ──────────────────────────────────────────────────────────
    y = sectionHeader(doc, "  ◉  DATOS DEL CLIENTE", y)
    const cFields: [string, string][] = [
      ["Nombre",    c.full_name ?? "—"],
      ["RUT",       c.rut ?? "—"],
      ["Teléfono",  c.phone ?? "—"],
      ["Email",     c.email ?? "—"],
    ]
    cFields.forEach(([label, val], i) => {
      const x = 40 + i * 130
      fill(doc, C.muted); doc.fontSize(6.5).font("Helvetica").text(label, x, y)
      fill(doc, C.text); doc.fontSize(8.5).font("Helvetica-Bold").text(val, x, y+10)
    })
    y += 28

    // ── Documents ───────────────────────────────────────────────────────────
    if (v.soap_estado || v.rev_tecnica_estado || v.permiso_circulacion || v.multas) {
      y += 2
      const docFields: [string, string][] = [
        ["SOAP",            v.soap_estado ? `${v.soap_estado}${v.soap_vencimiento ? " · " + v.soap_vencimiento : ""}` : "—"],
        ["Rev. Técnica",    v.rev_tecnica_estado ? `${v.rev_tecnica_estado}${v.rev_tecnica_vencimiento ? " · " + v.rev_tecnica_vencimiento : ""}` : "—"],
        ["Perm. Circulación", v.permiso_circulacion ?? "—"],
        ["Multas",          v.multas ?? "$0"],
      ]
      fill(doc, "#fef9c3"); doc.rect(40, y, 515, 20).fill()
      docFields.forEach(([label, val], i) => {
        const x = 40 + i * 130
        fill(doc, C.muted); doc.fontSize(6).font("Helvetica").text(label, x+4, y+2)
        fill(doc, C.text); doc.fontSize(7.5).font("Helvetica-Bold").text(val, x+4, y+11)
      })
      y += 24
    }

    // ── Scores + Car Diagram ─────────────────────────────────────────────────
    y = sectionHeader(doc, "  ★  RESULTADO DE LA INSPECCIÓN", y)
    const scores = [
      { label: "NOTA FINAL", nota: ins.nota_final, big: true },
      { label: "Visual",     nota: ins.nota_visual },
      { label: "Carrocería", nota: ins.nota_carroceria },
      { label: "Mecánica",   nota: ins.nota_mecanica },
    ]
    const scoreStartY = y
    let sx = 40
    scores.forEach(s => {
      const w = s.big ? 85 : 70, h = s.big ? 72 : 62
      const col = estadoColor(s.nota >= 6.5 ? "Bueno" : s.nota >= 5 ? "Regular" : "Malo")
      fill(doc, col); stroke(doc, col)
      doc.roundedRect(sx, y, w, h, 6).fill()
      fill(doc, C.white)
      doc.fontSize(s.big ? 30 : 22).font("Helvetica-Bold")
        .text(s.nota?.toFixed(1) ?? "—", sx, y+(s.big?12:10), { width: w, align: "center" })
      doc.fontSize(7).font("Helvetica")
        .text(`/7.0 · ${Math.round((s.nota/7)*100)}%`, sx, y+(s.big?47:38), { width: w, align: "center" })
      doc.fontSize(6).font("Helvetica-Bold").text(s.label, sx, y+(s.big?60:52), { width: w, align: "center" })
      sx += w + 8
    })

    // Car diagram (right side)
    const diagX = 370, diagY = scoreStartY - 4
    drawCarDiagram(doc, diagX, diagY, zoneColors)
    drawLegend(doc, diagX + 148, diagY + 10)

    y = scoreStartY + 90

    // ── Bad items summary ─────────────────────────────────────────────────────
    if (badItems.length > 0) {
      y += 4
      y = sectionHeader(doc, `  ⚠  DEFECTOS DETECTADOS (${badItems.length} ítem${badItems.length > 1 ? "s" : ""})`, y)
      fill(doc, "#fff7ed"); doc.rect(40, y, 515, Math.min(badItems.length * 11, 110)).fill()
      let bi = 0
      for (const item of badItems.slice(0, 10)) {
        if (y + 12 > 750) break
        const col = estadoColor(item.estado)
        fill(doc, col); doc.circle(50, y+5.5, 3).fill()
        fill(doc, C.text); doc.fontSize(7).font("Helvetica")
          .text(`${item.item_label}`, 58, y+1.5, { width: 300 })
        fill(doc, col); doc.fontSize(7).font("Helvetica-Bold")
          .text(item.estado, 360, y+1.5, { width: 100, align: "right" })
        y += 11; bi++
      }
      if (badItems.length > 10) {
        fill(doc, C.muted); doc.fontSize(6.5).font("Helvetica").text(`... y ${badItems.length - 10} defectos más. Ver detalle completo.`, 50, y+1)
        y += 11
      }
      y += 4
    }

    // ── Observations ─────────────────────────────────────────────────────────
    if (ins.comentarios) {
      if (y > 720) { doc.addPage(); y = 40 }
      y += 2
      y = sectionHeader(doc, "  ✎  OBSERVACIONES DEL INSPECTOR", y)
      fill(doc, "#f0fdf4"); doc.rect(40, y, 515, 42).fill()
      stroke(doc, "#bbf7d0"); doc.rect(40, y, 515, 42).stroke()
      fill(doc, C.text)
      doc.fontSize(8.5).font("Helvetica").text(ins.comentarios, 48, y+6, { width: 500, lineGap: 2 })
      y += 50
    }

    // Footer p1
    fill(doc, C.mid); doc.rect(0, 820, 595, 22).fill()
    fill(doc, C.muted); doc.fontSize(6.5).font("Helvetica")
      .text(`${companyName} · Informe generado el ${new Date().toLocaleDateString("es-CL")}`, 14, 826, { width: 400 })
      .text("Página 1", 14, 826, { width: 566, align: "right" })

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 2 — INSPECTION ITEMS
    // ══════════════════════════════════════════════════════════════════════════
    doc.addPage({ margin: 0, size: "A4" })

    // Mini header
    fill(doc, C.brand); doc.rect(0, 0, 595, 28).fill()
    fill(doc, C.accent); doc.rect(0, 28, 595, 3).fill()
    fill(doc, C.white)
    if (logoBuf) { try { doc.image(logoBuf, 10, 2, { height: 24, fit: [70, 24] }) } catch { } }
    doc.fontSize(10).font("Helvetica-Bold").text("DETALLE DE INSPECCIÓN", 130, 8, { width: 330, align: "center" })
    doc.fontSize(7).font("Helvetica").text(`${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""} ${v.anio ?? ""}`, 130, 20, { width: 330, align: "center" })

    y = 40

    // Column headers
    fill(doc, C.accent); doc.rect(40, y, 515, 12).fill()
    fill(doc, C.white); doc.fontSize(6.5).font("Helvetica-Bold")
      .text("ÍTEM DE INSPECCIÓN", 46, y+2.5, { width: 330 })
      .text("RESULTADO", 376, y+2.5, { width: 90, align: "center" })
      .text("OBSERVACIONES", 476, y+2.5, { width: 75 })
    y += 14

    let currentSection = 0, currentSub = "", rowCount = 0
    items.forEach(item => {
      if (y > 790) {
        // Footer
        fill(doc, C.mid); doc.rect(0, 820, 595, 22).fill()
        fill(doc, C.muted); doc.fontSize(6.5).font("Helvetica").text(`${companyName}`, 14, 826, { width: 400 })
        doc.addPage({ margin: 0, size: "A4" })

        // mini header
        fill(doc, C.brand); doc.rect(0, 0, 595, 28).fill()
        fill(doc, C.accent); doc.rect(0, 28, 595, 3).fill()
        fill(doc, C.white)
        if (logoBuf) { try { doc.image(logoBuf, 10, 2, { height: 24, fit: [70, 24] }) } catch { } }
        doc.fontSize(10).font("Helvetica-Bold").text("DETALLE DE INSPECCIÓN (cont.)", 130, 8, { width: 330, align: "center" })
        y = 38

        // re-draw column headers
        fill(doc, C.accent); doc.rect(40, y, 515, 12).fill()
        fill(doc, C.white); doc.fontSize(6.5).font("Helvetica-Bold")
          .text("ÍTEM DE INSPECCIÓN", 46, y+2.5, { width: 330 })
          .text("RESULTADO", 376, y+2.5, { width: 90, align: "center" })
        y += 14
        rowCount = 0
      }

      // Section header
      if (item.section !== currentSection) {
        currentSection = item.section; currentSub = ""
        const sectionNames: Record<number, string> = { 1: "  1. INSPECCIÓN VISUAL", 2: "  2. CARROCERÍA", 3: "  3. MECÁNICA" }
        y = sectionHeader(doc, sectionNames[item.section] ?? "", y)
        rowCount = 0
      }

      // Subsection header
      if (item.subsection !== currentSub) {
        currentSub = item.subsection
        y = subHeader(doc, item.subsection, y)
        rowCount = 0
      }

      const dy = tableRow(doc, item, y, rowCount % 2 === 1)
      y += dy; rowCount++
    })

    // ── Photos page ────────────────────────────────────────────────────────
    if (photoBuffers.length > 0) {
      doc.addPage({ margin: 0, size: "A4" })
      fill(doc, C.brand); doc.rect(0, 0, 595, 28).fill()
      fill(doc, C.accent); doc.rect(0, 28, 595, 3).fill()
      fill(doc, C.white)
      if (logoBuf) { try { doc.image(logoBuf, 10, 2, { height: 24, fit: [70, 24] }) } catch { } }
      doc.fontSize(10).font("Helvetica-Bold").text("FOTOGRAFÍAS DEL VEHÍCULO", 130, 8, { width: 330, align: "center" })
      doc.fontSize(7).font("Helvetica").text(`${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""}`, 130, 20, { width: 330, align: "center" })

      y = 40
      const imgW = 170, imgH = 128, gap = 8
      let col = 0
      for (let pi = 0; pi < photoBuffers.length; pi++) {
        if (y + imgH > 800) { doc.addPage(); y = 20 }
        const px = 14 + col * (imgW + gap)
        try { doc.image(photoBuffers[pi], px, y, { width: imgW, height: imgH }) }
        catch {
          fill(doc, C.light); doc.rect(px, y, imgW, imgH).fill()
          fill(doc, C.muted); doc.fontSize(8).text("Sin imagen", px, y+imgH/2-5, { width: imgW, align: "center" })
        }
        // Border + label
        stroke(doc, C.mid); doc.rect(px, y, imgW, imgH).stroke()
        fill(doc, C.muted); doc.fontSize(6).text(`Foto ${pi+1}`, px, y+imgH+2, { width: imgW, align: "center" })
        col++
        if (col === 3) { col = 0; y += imgH + 18 }
      }
      if (col > 0) y += imgH + 18
    }

    // ── Signature block (last page) ────────────────────────────────────────
    if (y > 700) { doc.addPage({ margin: 0, size: "A4" }); y = 60 }
    else y += 20

    const sigY = Math.max(y + 20, 660)
    fill(doc, C.light); doc.rect(40, sigY, 515, 90).fill()
    stroke(doc, C.mid); doc.rect(40, sigY, 515, 90).stroke()

    // Inspector signature
    fill(doc, C.muted); doc.rect(60, sigY+50, 180, 0.5).fill()
    fill(doc, C.text); doc.fontSize(7.5).font("Helvetica-Bold").text(ins.profiles?.full_name ?? "Inspector", 60, sigY+55, { width: 180, align: "center" })
    fill(doc, C.muted); doc.fontSize(6.5).font("Helvetica").text("Firma del inspector", 60, sigY+65, { width: 180, align: "center" })

    // Client signature
    fill(doc, C.muted); doc.rect(360, sigY+50, 180, 0.5).fill()
    fill(doc, C.muted); doc.fontSize(6.5).font("Helvetica").text("Nombre y firma del cliente", 360, sigY+55, { width: 180, align: "center" })
    fill(doc, C.muted); doc.fontSize(6.5).text("RUT:", 360, sigY+68, { width: 180, align: "center" })

    // Date + Result
    fill(doc, C.text)
    doc.fontSize(7).font("Helvetica").text(`Fecha: ${formatDate(ins.fecha_inspeccion)}`, 60, sigY+8)
    doc.text(`Lugar de inspección: _____________________`, 60, sigY+20)

    const notaFinal = ins.nota_final ?? 0
    const verdict = notaFinal >= 6.5 ? "APROBADO" : notaFinal >= 5 ? "CONDICIONADO" : "RECHAZADO"
    const verdictColor = notaFinal >= 6.5 ? C.good : notaFinal >= 5 ? C.warn : C.bad
    fill(doc, verdictColor); doc.roundedRect(370, sigY+6, 150, 22, 4).fill()
    fill(doc, C.white); doc.fontSize(11).font("Helvetica-Bold").text(verdict, 370, sigY+12, { width: 150, align: "center" })

    // Final footer
    fill(doc, C.brand); doc.rect(0, 820, 595, 22).fill()
    fill(doc, C.white); doc.fontSize(6.5).font("Helvetica")
      .text(`${companyName} · Sistema de Inspección Vehicular · www.aaea.cl`, 14, 826, { width: 400 })
      .text(`Generado: ${new Date().toLocaleString("es-CL")}`, 14, 826, { width: 566, align: "right" })

    doc.end()
  })

  const buffer = Buffer.concat(chunks)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="inspeccion-${ins.vehicles?.patente}-${ins.fecha_inspeccion?.slice(0,10)}.pdf"`,
    },
  })
}
