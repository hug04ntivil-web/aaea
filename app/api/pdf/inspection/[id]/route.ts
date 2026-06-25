import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import PDFDocument from "pdfkit"
import QRCode from "qrcode"

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:    "#0f172a",
  brand:   "#1e3a5f",
  accent:  "#2563eb",
  good:    "#16a34a",
  warn:    "#d97706",
  bad:     "#dc2626",
  muted:   "#64748b",
  border:  "#cbd5e1",
  light:   "#f8fafc",
  mid:     "#e2e8f0",
  white:   "#ffffff",
  text:    "#1e293b",
  glass:   "#bfdbfe",
  tire:    "#1e293b",
  unset:   "#94a3b8",
}

function formatDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function estadoColor(estado: string): string {
  if (["Bueno","Sin Daño","Normal","Funciona","A nivel","No Presenta","No Encendido"].includes(estado)) return C.good
  if (["Con Daño","Regular"].includes(estado)) return C.warn
  if (["Malo","Anormal","No Funciona","Bajo nivel","Encendido","Presenta"].includes(estado)) return C.bad
  return C.unset
}

function isBadEstado(e: string) {
  return ["Con Daño","Malo","Anormal","No Funciona","Bajo nivel","Presenta","Encendido"].includes(e)
}

// ─── Zone → item_key mapping ──────────────────────────────────────────────────
const ZONE_MAP: Record<string, string> = {
  capot: "hood", mascara: "hood", parabrisas_del: "windshield_f",
  focos_opticos: "front_bumper", parachoques_del: "front_bumper",
  techo: "roof",
  tapabarros_izq: "left", puertas_izq: "left", zocalo_izq: "left", espejo_izq: "left",
  tapabarros_der: "right", puertas_der: "right", zocalo_der: "right", espejo_der: "right",
  portalon: "trunk", parachoque_post: "rear_bumper", parabrisas_post: "windshield_r",
  neumatico_del_izq: "wheel_fl", llanta_del_izq: "wheel_fl",
  neumatico_del_der: "wheel_fr", llanta_del_der: "wheel_fr",
  neumatico_tra_izq: "wheel_rl", llanta_tra_izq: "wheel_rl",
  neumatico_tra_der: "wheel_rr", llanta_tra_der: "wheel_rr",
}

function calcZoneColors(items: any[]): Record<string, string> {
  const zones: Record<string, number> = {}
  items?.forEach(item => {
    const zone = ZONE_MAP[item.item_key]
    if (!zone) return
    const lvl = isBadEstado(item.estado) ? 2 : ["Con Daño","Regular"].includes(item.estado) ? 1 : 0
    if ((zones[zone] ?? -1) < lvl) zones[zone] = lvl
  })
  const map: Record<string, string> = {}
  Object.entries(zones).forEach(([z, lvl]) => {
    map[z] = lvl === 2 ? C.bad : lvl === 1 ? C.warn : C.good
  })
  return map
}

// ─── Car top-down diagram ─────────────────────────────────────────────────────
function drawCarTopDown(doc: PDFKit.PDFDocument, ox: number, oy: number, zones: Record<string, string>) {
  const W = 108, H = 200
  const cx = ox + W / 2
  const z = (k: string) => zones[k] ?? C.unset

  // Drop shadow
  doc.fillColor("#00000018").roundedRect(ox + 4, oy + 4, W, H, 14).fill()

  // ── Outer silhouette (body + doors) ─────────────────────────────────────────
  // Drawn as a smooth body shape using bezier curves
  doc.save()
  doc.fillColor("#374151").strokeColor(C.navy).lineWidth(1.2)
  doc.moveTo(cx, oy + 2)
    .bezierCurveTo(cx + W * 0.34, oy + 2,  cx + W * 0.50, oy + 14, cx + W * 0.50, oy + 28)
    .bezierCurveTo(cx + W * 0.50, oy + 38, cx + W * 0.48, oy + 44, cx + W * 0.46, oy + 52)
    .lineTo(cx + W * 0.46, oy + 148)
    .bezierCurveTo(cx + W * 0.48, oy + 156, cx + W * 0.50, oy + 162, cx + W * 0.50, oy + 172)
    .bezierCurveTo(cx + W * 0.50, oy + 186, cx + W * 0.34, oy + H - 2, cx, oy + H - 2)
    .bezierCurveTo(cx - W * 0.34, oy + H - 2, cx - W * 0.50, oy + 186, cx - W * 0.50, oy + 172)
    .bezierCurveTo(cx - W * 0.50, oy + 162, cx - W * 0.48, oy + 156, cx - W * 0.46, oy + 148)
    .lineTo(cx - W * 0.46, oy + 52)
    .bezierCurveTo(cx - W * 0.48, oy + 44, cx - W * 0.50, oy + 38, cx - W * 0.50, oy + 28)
    .bezierCurveTo(cx - W * 0.50, oy + 14, cx - W * 0.34, oy + 2, cx, oy + 2)
    .fillAndStroke()
  doc.restore()

  // ── Interior zones (drawn inside silhouette) ─────────────────────────────────

  // Front bumper
  doc.save()
  doc.fillColor(z("front_bumper")).strokeColor(C.navy).lineWidth(0.8)
  doc.moveTo(cx, oy + 4)
    .bezierCurveTo(cx + W * 0.30, oy + 4, cx + W * 0.44, oy + 12, cx + W * 0.44, oy + 22)
    .lineTo(cx - W * 0.44, oy + 22)
    .bezierCurveTo(cx - W * 0.44, oy + 12, cx - W * 0.30, oy + 4, cx, oy + 4)
    .fillAndStroke()
  doc.restore()

  // Hood
  doc.fillColor(z("hood")).strokeColor(C.navy).lineWidth(0.8)
  doc.rect(cx - W * 0.44, oy + 22, W * 0.88, 38).fillAndStroke()

  // Front windshield (glass tint)
  const fwc = z("windshield_f") !== C.unset ? z("windshield_f") : C.glass
  doc.fillColor(fwc).strokeColor(C.navy).lineWidth(0.8)
  doc.rect(cx - W * 0.36, oy + 60, W * 0.72, 16).fillAndStroke()

  // Left side panels
  doc.fillColor(z("left")).strokeColor(C.navy).lineWidth(0.8)
  doc.rect(cx - W * 0.46, oy + 60, W * 0.1, 80).fillAndStroke()

  // Right side panels
  doc.fillColor(z("right")).strokeColor(C.navy).lineWidth(0.8)
  doc.rect(cx + W * 0.36, oy + 60, W * 0.1, 80).fillAndStroke()

  // Roof / cabin interior
  const rc = z("roof") !== C.unset ? z("roof") : "#e2e8f0"
  doc.fillColor(rc).strokeColor(C.navy).lineWidth(0.8)
  doc.rect(cx - W * 0.36, oy + 76, W * 0.72, 48).fillAndStroke()

  // Rear windshield
  const rwc = z("windshield_r") !== C.unset ? z("windshield_r") : C.glass
  doc.fillColor(rwc).strokeColor(C.navy).lineWidth(0.8)
  doc.rect(cx - W * 0.36, oy + 124, W * 0.72, 16).fillAndStroke()

  // Trunk
  doc.fillColor(z("trunk")).strokeColor(C.navy).lineWidth(0.8)
  doc.rect(cx - W * 0.44, oy + 140, W * 0.88, 36).fillAndStroke()

  // Rear bumper
  doc.save()
  doc.fillColor(z("rear_bumper")).strokeColor(C.navy).lineWidth(0.8)
  doc.moveTo(cx - W * 0.44, oy + 176)
    .lineTo(cx + W * 0.44, oy + 176)
    .bezierCurveTo(cx + W * 0.44, oy + 192, cx + W * 0.30, oy + H - 4, cx, oy + H - 4)
    .bezierCurveTo(cx - W * 0.30, oy + H - 4, cx - W * 0.44, oy + 192, cx - W * 0.44, oy + 176)
    .fillAndStroke()
  doc.restore()

  // ── Wheels ───────────────────────────────────────────────────────────────────
  const wheels = [
    { x: ox - 14, y: oy + 24, zone: "wheel_fl" },
    { x: ox + W + 2, y: oy + 24, zone: "wheel_fr" },
    { x: ox - 14, y: oy + 140, zone: "wheel_rl" },
    { x: ox + W + 2, y: oy + 140, zone: "wheel_rr" },
  ]
  wheels.forEach(w => {
    const wc = z(w.zone)
    // Tire
    doc.fillColor(C.tire).strokeColor(C.navy).lineWidth(1.2)
    doc.roundedRect(w.x, w.y, 12, 32, 3).fillAndStroke()
    // Rim
    doc.fillColor("#94a3b8").roundedRect(w.x + 2, w.y + 4, 8, 24, 2).fill()
    // Status ring if issue
    if (wc !== C.unset) {
      doc.strokeColor(wc).lineWidth(2.5)
      doc.roundedRect(w.x, w.y, 12, 32, 3).stroke()
      doc.lineWidth(1)
    }
  })

  // ── Labels ────────────────────────────────────────────────────────────────────
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(4.5)
  doc.text("FRENTE", cx - W * 0.44, oy + 28, { width: W * 0.88, align: "center" })
  doc.text("TECHO", cx - W * 0.36, oy + 96, { width: W * 0.72, align: "center" })
  doc.text("MALETERO", cx - W * 0.44, oy + 152, { width: W * 0.88, align: "center" })

  // Arrow indicating front
  doc.fillColor(C.accent)
  doc.polygon([cx - 5, oy - 10], [cx + 5, oy - 10], [cx, oy]).fill()
  doc.fillColor(C.muted).font("Helvetica").fontSize(5)
  doc.text("VISTA SUPERIOR", ox, oy - 18, { width: W, align: "center" })
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function drawLegend(doc: PDFKit.PDFDocument, x: number, y: number) {
  const items = [
    ["Sin daño",     C.good],
    ["Advertencia",  C.warn],
    ["Con daño",     C.bad],
    ["Sin evaluar",  C.unset],
  ]
  doc.font("Helvetica-Bold").fontSize(6).fillColor(C.text).text("LEYENDA:", x, y)
  y += 9
  items.forEach(([label, color]) => {
    doc.fillColor(color as string).roundedRect(x, y, 9, 7, 1.5).fill()
    doc.strokeColor(C.border).lineWidth(0.5).roundedRect(x, y, 9, 7, 1.5).stroke()
    doc.fillColor(C.muted).font("Helvetica").fontSize(5.5).text(label as string, x + 12, y + 0.5)
    y += 10
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sectionBar(doc: PDFKit.PDFDocument, label: string, x: number, y: number, w: number): number {
  doc.fillColor(C.brand).rect(x, y, w, 14).fill()
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7).text(label, x + 8, y + 3.5)
  return y + 18
}

function miniHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string, logoBuf: Buffer | null, companyName: string) {
  doc.fillColor(C.navy).rect(0, 0, 595, 32).fill()
  doc.fillColor(C.accent).rect(0, 32, 595, 3).fill()
  if (logoBuf) {
    try { doc.image(logoBuf, 10, 4, { height: 24, fit: [80, 24] }) } catch { }
  }
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(9).text(title, 100, 7, { width: 390, align: "center" })
  doc.font("Helvetica").fontSize(7).fillColor("#94a3b8").text(subtitle, 100, 19, { width: 390, align: "center" })
}

function pageFooter(doc: PDFKit.PDFDocument, companyName: string, page: number) {
  doc.fillColor(C.navy).rect(0, 821, 595, 21).fill()
  doc.fillColor("#64748b").font("Helvetica").fontSize(6)
    .text(`${companyName} · Sistema de Inspección Vehicular · www.aaea.cl`, 14, 826, { width: 380 })
    .text(`Pág. ${page}`, 14, 826, { width: 566, align: "right" })
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const baseUrl = req.nextUrl.origin

  const [{ data: ins }, { data: settingsRows }] = await Promise.all([
    supabase.from("inspections")
      .select(`*, vehicles(*), clients(full_name, rut, phone, email, city), profiles(full_name)`)
      .eq("id", id).single(),
    supabase.from("settings").select("key, value"),
  ])

  if (!ins) return new NextResponse("Not found", { status: 404 })

  const settings: Record<string, string> = {}
  settingsRows?.forEach(r => { settings[r.key] = r.value ?? "" })

  const companyName    = settings.company_name    || "AAEA Inspecciones"
  const companyPhone   = settings.company_phone   || ""
  const companyEmail   = settings.company_email   || ""
  const companyAddress = settings.company_address || ""
  const companyRut     = settings.company_rut     || ""
  const companyLogoUrl = settings.company_logo_url || ""

  const { data: inspItems } = await supabase
    .from("inspection_items").select("*").eq("inspection_id", id).order("section").order("sort_order")

  const items = inspItems ?? []
  const zoneColors = calcZoneColors(items)
  const v = ins.vehicles ?? {}
  const cl = ins.clients ?? {}

  const badItems = items.filter(i => isBadEstado(i.estado))
  const warnItems = items.filter(i => ["Con Daño","Regular"].includes(i.estado))
  const allDefects = [...badItems, ...warnItems.filter(i => !badItems.includes(i))]

  // QR
  const publicUrl = ins.public_token ? `${baseUrl}/p/${ins.public_token}` : null
  let qrBuf: Buffer | null = null
  if (publicUrl) {
    try { qrBuf = await QRCode.toBuffer(publicUrl, { type: "png", width: 90, margin: 1, color: { dark: C.navy, light: "#ffffff" } }) as Buffer }
    catch { }
  }

  // Logo
  let logoBuf: Buffer | null = null
  if (companyLogoUrl && !companyLogoUrl.endsWith(".svg")) {
    try { const r = await fetch(companyLogoUrl); if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer()) }
    catch { }
  }

  // Photos
  const photoBuffers: Buffer[] = []
  for (const url of (ins.photos ?? []) as string[]) {
    try { const r = await fetch(url); if (r.ok) photoBuffers.push(Buffer.from(await r.arrayBuffer())) } catch { }
  }

  const doc = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))

  await new Promise<void>(resolve => {
    doc.on("end", resolve)

    const ML = 30   // margin left
    const CW = 535  // content width

    // ════════════════════════════════════════════════════════════════════════════
    // PAGE 1
    // ════════════════════════════════════════════════════════════════════════════

    // ── Header ──────────────────────────────────────────────────────────────────
    // Navy background
    doc.fillColor(C.navy).rect(0, 0, 595, 78).fill()
    // Blue accent stripe at bottom of header
    doc.fillColor(C.accent).rect(0, 74, 595, 4).fill()
    // Subtle diagonal pattern in header
    doc.fillColor("#ffffff08")
    for (let i = -10; i < 620; i += 18) {
      doc.moveTo(i, 0).lineTo(i + 80, 78).stroke()
    }

    // Logo area (left)
    if (logoBuf) {
      try { doc.image(logoBuf, ML, 14, { height: 46, fit: [130, 46] }) }
      catch {
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(13).text(companyName, ML, 20)
      }
    } else {
      // Company name as text logo
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(13).text(companyName, ML, 16)
      doc.fillColor("#94a3b8").font("Helvetica").fontSize(7)
      if (companyRut) doc.text(`RUT: ${companyRut}`, ML, 32)
      if (companyPhone) doc.text(`Tel: ${companyPhone}`, ML, 42)
      if (companyAddress) doc.text(companyAddress, ML, 52)
    }

    // Title (center)
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(14)
      .text("INFORME DE INSPECCIÓN VEHICULAR", 160, 14, { width: 270, align: "center" })
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(7.5)
      .text(`Fecha: ${formatDate(ins.fecha_inspeccion)}`, 160, 34, { width: 270, align: "center" })
    doc.fillColor("#7dd3fc").font("Helvetica-Bold").fontSize(7.5)
      .text(`Inspector: ${ins.profiles?.full_name ?? "—"}`, 160, 46, { width: 270, align: "center" })
    doc.fillColor("#64748b").font("Helvetica").fontSize(6.5)
      .text(`N° Inspección: ${id.slice(0, 8).toUpperCase()}`, 160, 58, { width: 270, align: "center" })

    // QR (right)
    if (qrBuf) {
      try {
        doc.image(qrBuf, 525, 4, { width: 64, height: 64 })
        doc.fillColor("#475569").font("Helvetica").fontSize(5)
          .text("Ver informe online", 523, 69, { width: 66, align: "center" })
      } catch { }
    }

    let y = 82

    // ── Vehicle data ─────────────────────────────────────────────────────────────
    y = sectionBar(doc, "DATOS DEL VEHÍCULO", ML, y, CW)

    const vFields: [string, string][] = [
      ["Patente",      v.patente ?? "—"],
      ["Marca",        v.marca ?? "—"],
      ["Modelo",       v.modelo ?? "—"],
      ["Año",          v.anio ? String(v.anio) : "—"],
      ["Color",        v.color ?? "—"],
      ["Kilometraje",  ins.kilometraje ? `${Number(ins.kilometraje).toLocaleString("es-CL")} km` : "—"],
      ["Combustible",  v.combustible ?? "—"],
      ["Transmisión",  v.transmision ?? "—"],
      ["Tipo",         v.tipo_vehiculo ?? "—"],
      ["Tracción",     v.traccion ?? "—"],
      ["N° Chasis",    v.vin ?? "—"],
      ["N° Motor",     v.num_motor ?? "—"],
    ]

    const cols4 = 4
    const colW4 = CW / cols4
    vFields.forEach(([label, val], i) => {
      const col = i % cols4
      const row = Math.floor(i / cols4)
      const fx = ML + col * colW4
      const fy = y + row * 24
      if (row % 2 === 0) { doc.fillColor("#f1f5f9").rect(fx, fy - 1, colW4, 24).fill() }
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(label, fx + 6, fy + 2)
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(8.5).text(val, fx + 6, fy + 11)
    })
    y += Math.ceil(vFields.length / cols4) * 24 + 6

    // ── Client + Documents ───────────────────────────────────────────────────────
    y = sectionBar(doc, "DATOS DEL CLIENTE", ML, y, CW)

    const cFields: [string, string][] = [
      ["Nombre",   cl.full_name ?? "—"],
      ["RUT",      cl.rut ?? "—"],
      ["Teléfono", cl.phone ?? "—"],
      ["Email",    cl.email ?? "—"],
    ]
    cFields.forEach(([label, val], i) => {
      const fx = ML + i * (CW / 4)
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(label, fx, y)
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(8).text(val, fx, y + 9, { width: CW / 4 - 4 })
    })
    y += 26

    // Documents strip
    if (v.soap_estado || v.rev_tecnica_estado || v.permiso_circulacion) {
      doc.fillColor("#fef3c7").rect(ML, y, CW, 22).fill()
      doc.strokeColor("#fde68a").lineWidth(0.5).rect(ML, y, CW, 22).stroke()
      const docFields: [string, string][] = [
        ["SOAP",               v.soap_estado ?? "—"],
        ["Rev. Técnica",       v.rev_tecnica_estado ?? "—"],
        ["Perm. Circulación",  v.permiso_circulacion ?? "—"],
        ["Multas",             v.multas ?? "$0"],
      ]
      docFields.forEach(([label, val], i) => {
        const fx = ML + i * (CW / 4)
        doc.fillColor("#92400e").font("Helvetica").fontSize(6).text(label, fx + 6, y + 3)
        doc.fillColor("#78350f").font("Helvetica-Bold").fontSize(7.5).text(val, fx + 6, y + 12)
      })
      y += 26
    }

    y += 4

    // ── Scores + Car Diagram ──────────────────────────────────────────────────────
    y = sectionBar(doc, "RESULTADO DE LA INSPECCIÓN", ML, y, CW)

    const scoreY = y
    const scoreH = 80

    // Score boxes
    const scores = [
      { label: "NOTA FINAL",  nota: ins.nota_final,     big: true  },
      { label: "Visual",      nota: ins.nota_visual,    big: false },
      { label: "Carrocería",  nota: ins.nota_carroceria, big: false },
      { label: "Mecánica",    nota: ins.nota_mecanica,  big: false },
    ]

    let sx = ML
    scores.forEach(s => {
      const nota = s.nota ?? 0
      const bw = s.big ? 94 : 76
      const bh = scoreH
      const col = nota >= 6.5 ? C.good : nota >= 5 ? C.warn : C.bad
      const pct = Math.round((nota / 7) * 100)

      // Box
      doc.fillColor(col).roundedRect(sx, scoreY, bw, bh, 8).fill()
      // Light top stripe
      doc.fillColor("#ffffff30").roundedRect(sx, scoreY, bw, 28, 8).fill()
      doc.fillColor("#ffffff00").rect(sx, scoreY + 14, bw, 14).fill()

      // Note number
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(s.big ? 34 : 26)
        .text(nota ? nota.toFixed(1) : "—", sx, scoreY + (s.big ? 8 : 11), { width: bw, align: "center" })

      // /7.0 and %
      doc.fillColor("#ffffff99").font("Helvetica").fontSize(7)
        .text(`/7.0  ${pct}%`, sx, scoreY + (s.big ? 48 : 42), { width: bw, align: "center" })

      // Progress bar
      const barW = bw - 16, barX = sx + 8
      doc.fillColor("#ffffff30").roundedRect(barX, scoreY + bh - 16, barW, 6, 3).fill()
      doc.fillColor(C.white).roundedRect(barX, scoreY + bh - 16, barW * (nota / 7), 6, 3).fill()

      // Label
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(s.big ? 7.5 : 6.5)
        .text(s.label, sx, scoreY + bh - 7, { width: bw, align: "center" })

      sx += bw + 8
    })

    // Car diagram (right of scores)
    const carX = ML + 94 + 76 * 3 + 8 * 4 + 6  // after score boxes
    const carDiagX = 360
    const carDiagY = scoreY - 24

    drawCarTopDown(doc, carDiagX, carDiagY, zoneColors)
    drawLegend(doc, carDiagX + 124, carDiagY + 10)

    y = scoreY + scoreH + 10

    // ── Defects ──────────────────────────────────────────────────────────────────
    if (allDefects.length > 0) {
      y = sectionBar(doc, `OBSERVACIONES DETECTADAS  (${allDefects.length} ítem${allDefects.length !== 1 ? "s" : ""})`, ML, y, CW)

      doc.fillColor("#fff7ed").rect(ML, y, CW, Math.min(allDefects.length * 12, 132) + 4).fill()
      doc.strokeColor("#fed7aa").lineWidth(0.5).rect(ML, y, CW, Math.min(allDefects.length * 12, 132) + 4).stroke()

      const limit = Math.min(allDefects.length, 11)
      const half = Math.ceil(limit / 2)

      for (let i = 0; i < limit; i++) {
        const item = allDefects[i]
        const col2 = i >= half
        const ix = ML + (col2 ? CW / 2 + 4 : 6)
        const iy = y + (col2 ? i - half : i) * 12 + 4
        const ec = estadoColor(item.estado)

        doc.fillColor(ec).circle(ix + 4, iy + 5, 3).fill()
        doc.fillColor(C.text).font("Helvetica").fontSize(6.5)
          .text(item.item_label, ix + 10, iy + 1, { width: CW / 2 - 80 })
        doc.fillColor(ec).font("Helvetica-Bold").fontSize(6.5)
          .text(item.estado, ix + CW / 2 - 88, iy + 1, { width: 72, align: "right" })
      }

      if (allDefects.length > limit) {
        doc.fillColor(C.muted).font("Helvetica").fontSize(6)
          .text(`... y ${allDefects.length - limit} ítems más — ver tabla completa en pág. 2`, ML + 6, y + limit * 12 / 2 + 2)
      }

      y += Math.min(allDefects.length, limit) / 2 * 12 + 14
    }

    // ── Observations ────────────────────────────────────────────────────────────
    if (ins.comentarios && y < 720) {
      y = sectionBar(doc, "OBSERVACIONES DEL INSPECTOR", ML, y, CW)
      const obsText = ins.comentarios.slice(0, 400)
      const obsH = 36
      doc.fillColor("#f0fdf4").rect(ML, y, CW, obsH).fill()
      doc.strokeColor("#86efac").lineWidth(0.5).rect(ML, y, CW, obsH).stroke()
      doc.fillColor(C.text).font("Helvetica").fontSize(7.5)
        .text(obsText, ML + 8, y + 6, { width: CW - 16, lineGap: 2, height: obsH - 10, ellipsis: true })
      y += obsH + 6
    }

    // ── Signatures ───────────────────────────────────────────────────────────────
    const sigY = Math.max(y + 10, 700)
    if (sigY < 760) {
      // Verdict badge
      const notaFinal = ins.nota_final ?? 0
      const verdict = notaFinal >= 6.5 ? "APROBADO" : notaFinal >= 5 ? "CONDICIONADO" : "RECHAZADO"
      const verdictColor = notaFinal >= 6.5 ? C.good : notaFinal >= 5 ? C.warn : C.bad

      doc.fillColor(verdictColor).roundedRect(ML, sigY, 180, 26, 5).fill()
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(13)
        .text(verdict, ML, sigY + 6, { width: 180, align: "center" })

      // Date/place
      doc.fillColor(C.muted).font("Helvetica").fontSize(7.5)
        .text(`Fecha: ${formatDate(ins.fecha_inspeccion)}`, ML + 190, sigY + 2)
        .text("Lugar: ____________________________", ML + 190, sigY + 14)

      // Inspector sig line
      const sigLineY = sigY + 58
      doc.fillColor(C.border).rect(ML, sigLineY, 180, 0.8).fill()
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(7.5)
        .text(ins.profiles?.full_name ?? "Inspector", ML, sigLineY + 4, { width: 180, align: "center" })
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5)
        .text("Firma del Inspector", ML, sigLineY + 14, { width: 180, align: "center" })

      // Client sig line
      doc.fillColor(C.border).rect(ML + 350, sigLineY, 180, 0.8).fill()
      doc.fillColor(C.muted).font("Helvetica").fontSize(7.5)
        .text("Nombre: __________________________", ML + 350, sigLineY + 4, { width: 180, align: "center" })
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5)
        .text("Firma del Cliente", ML + 350, sigLineY + 14, { width: 180, align: "center" })
    }

    pageFooter(doc, companyName, 1)

    // ════════════════════════════════════════════════════════════════════════════
    // PAGE 2 — FULL ITEM TABLE
    // ════════════════════════════════════════════════════════════════════════════
    doc.addPage({ margin: 0, size: "A4" })

    miniHeader(doc, "DETALLE COMPLETO DE INSPECCIÓN",
      `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""} ${v.anio ?? ""}  ·  Cliente: ${cl.full_name ?? ""}`,
      logoBuf, companyName)

    y = 42

    // Column header
    doc.fillColor(C.accent).rect(ML, y, CW, 13).fill()
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(6.5)
      .text("ÍTEM", ML + 6, y + 3, { width: 300 })
      .text("ESTADO", ML + 308, y + 3, { width: 100, align: "center" })
      .text("OBSERVACIONES", ML + 412, y + 3, { width: 118 })
    y += 15

    let pageNum = 2
    let currentSection = 0
    let currentSub = ""
    let rowIdx = 0

    const sectionNames: Record<number, string> = {
      1: "1. INSPECCIÓN VISUAL",
      2: "2. INSPECCIÓN DE CARROCERÍA",
      3: "3. INSPECCIÓN MECÁNICA",
    }

    items.forEach(item => {
      // Check page overflow
      if (y > 790) {
        pageFooter(doc, companyName, pageNum)
        doc.addPage({ margin: 0, size: "A4" })
        pageNum++
        miniHeader(doc, "DETALLE COMPLETO (cont.)",
          `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""}`, logoBuf, companyName)
        y = 42
        // re-draw col header
        doc.fillColor(C.accent).rect(ML, y, CW, 13).fill()
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(6.5)
          .text("ÍTEM", ML + 6, y + 3, { width: 300 })
          .text("ESTADO", ML + 308, y + 3, { width: 100, align: "center" })
          .text("OBSERVACIONES", ML + 412, y + 3, { width: 118 })
        y += 15
        rowIdx = 0
        currentSection = 0; currentSub = ""
      }

      // Section header
      if (item.section !== currentSection) {
        currentSection = item.section; currentSub = ""
        doc.fillColor(C.brand).rect(ML, y, CW, 14).fill()
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7.5)
          .text(sectionNames[item.section] ?? "", ML + 8, y + 3.5)
        y += 16; rowIdx = 0
      }

      // Subsection header
      if (item.subsection !== currentSub) {
        currentSub = item.subsection
        doc.fillColor("#dde4f0").rect(ML, y, CW, 11).fill()
        doc.fillColor(C.brand).font("Helvetica-Bold").fontSize(6.5)
          .text(item.subsection.replace(/^\d+\.\d+\s*/, ""), ML + 10, y + 2.5)
        y += 13; rowIdx = 0
      }

      // Row
      const rowH = item.observaciones ? 16 : 11
      if (rowIdx % 2 === 0) { doc.fillColor("#f8fafc").rect(ML, y, CW, rowH).fill() }

      const ec = estadoColor(item.estado)
      const isBad2 = isBadEstado(item.estado)

      // Indicator dot
      if (isBad2 || ["Con Daño","Regular"].includes(item.estado)) {
        doc.fillColor(ec).circle(ML + 7, y + (rowH / 2), 2.5).fill()
      }

      doc.fillColor(C.text).font("Helvetica").fontSize(6.8)
        .text(item.item_label, ML + 14, y + 2, { width: 288 })

      doc.fillColor(ec).font("Helvetica-Bold").fontSize(6.8)
        .text(item.estado, ML + 308, y + 2, { width: 100, align: "center" })

      if (item.observaciones) {
        doc.fillColor(C.muted).font("Helvetica").fontSize(5.8)
          .text(`↳ ${item.observaciones}`, ML + 14, y + 9, { width: 420 })
      }

      doc.strokeColor(C.mid).lineWidth(0.3)
        .moveTo(ML, y + rowH).lineTo(ML + CW, y + rowH).stroke()

      y += rowH; rowIdx++
    })

    // ── Photos ───────────────────────────────────────────────────────────────────
    if (photoBuffers.length > 0) {
      pageFooter(doc, companyName, pageNum)
      doc.addPage({ margin: 0, size: "A4" })
      pageNum++
      miniHeader(doc, "FOTOGRAFÍAS DEL VEHÍCULO",
        `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""}`, logoBuf, companyName)
      y = 44
      const imgW = 172, imgH = 130, gap = 8
      let col2 = 0

      for (let pi = 0; pi < photoBuffers.length; pi++) {
        if (y + imgH > 800) {
          pageFooter(doc, companyName, pageNum)
          doc.addPage({ margin: 0, size: "A4" })
          pageNum++
          y = 20; col2 = 0
        }
        const px = ML + col2 * (imgW + gap)
        try {
          doc.image(photoBuffers[pi], px, y, { width: imgW, height: imgH })
          doc.strokeColor(C.border).lineWidth(0.8).rect(px, y, imgW, imgH).stroke()
        } catch {
          doc.fillColor(C.light).rect(px, y, imgW, imgH).fill()
          doc.fillColor(C.muted).font("Helvetica").fontSize(8).text("Sin imagen", px, y + imgH / 2 - 4, { width: imgW, align: "center" })
        }
        doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(`Foto ${pi + 1}`, px, y + imgH + 2, { width: imgW, align: "center" })
        col2++
        if (col2 === 3) { col2 = 0; y += imgH + 18 }
      }
    }

    pageFooter(doc, companyName, pageNum)
    doc.end()
  })

  const buffer = Buffer.concat(chunks)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="inspeccion-${v.patente ?? id}-${ins.fecha_inspeccion?.slice(0, 10) ?? ""}.pdf"`,
    },
  })
}
