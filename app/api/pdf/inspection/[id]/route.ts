import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import PDFDocument from "pdfkit"
import QRCode from "qrcode"

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:   "#0f172a",
  brand:  "#1e3a5f",
  accent: "#3b82f6",
  good:   "#16a34a",
  warn:   "#d97706",
  bad:    "#dc2626",
  muted:  "#64748b",
  border: "#cbd5e1",
  light:  "#f8fafc",
  mid:    "#e2e8f0",
  white:  "#ffffff",
  text:   "#1e293b",
  glass:  "#dbeafe",
  tire:   "#1e293b",
}

// A4 page dimensions
const PW = 595   // page width
const PH = 842   // page height
const ML = 28    // margin left
const MR = 28    // margin right
const CW = PW - ML - MR  // content width = 539

function formatDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function estadoColor(estado: string): string {
  if (["Bueno","Sin Daño","Normal","Funciona","A nivel","No Presenta","No Encendido"].includes(estado)) return C.good
  if (["Con Daño","Regular"].includes(estado)) return C.warn
  if (["Malo","Anormal","No Funciona","Bajo nivel","Encendido","Presenta"].includes(estado)) return C.bad
  return "#94a3b8"
}

function isBad(e: string) {
  return ["Con Daño","Malo","Anormal","No Funciona","Bajo nivel","Presenta","Encendido"].includes(e)
}

function isWarn(e: string) {
  return ["Regular"].includes(e)
}

// ─── Zone mapping ─────────────────────────────────────────────────────────────
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
    const lvl = isBad(item.estado) ? 2 : isWarn(item.estado) ? 1 : 0
    if ((zones[zone] ?? -1) < lvl) zones[zone] = lvl
  })
  const map: Record<string, string> = {}
  Object.entries(zones).forEach(([z, lvl]) => {
    if (lvl > 0) map[z] = lvl === 2 ? C.bad : C.warn
  })
  return map
}

// ─── Car top-down diagram (neutral body, colored damage dots) ─────────────────
function drawCarTopDown(doc: PDFKit.PDFDocument, ox: number, oy: number, zones: Record<string, string>) {
  const W = 100
  const H = 162
  const cx = ox + W / 2

  const BODY   = "#dde3ea"
  const DBODY  = "#c5cdd6"
  const GLASS2 = "#d4e6f8"
  const DARK   = "#374151"
  const STROKE = "#5a6879"

  // Drop shadow
  doc.fillColor("#00000014").roundedRect(ox + 3, oy + 5, W, H, 12).fill()

  // ── Outer body silhouette ──────────────────────────────────────────────────
  doc.fillColor(BODY).strokeColor(STROKE).lineWidth(1.2)
  doc.moveTo(cx, oy + 3)
    .bezierCurveTo(cx + W * 0.30, oy + 3,  cx + W * 0.46, oy + 13, cx + W * 0.46, oy + 26)
    .bezierCurveTo(cx + W * 0.47, oy + 34, cx + W * 0.47, oy + 40, cx + W * 0.45, oy + 48)
    .lineTo(cx + W * 0.45, oy + 114)
    .bezierCurveTo(cx + W * 0.47, oy + 120, cx + W * 0.47, oy + 126, cx + W * 0.46, oy + 136)
    .bezierCurveTo(cx + W * 0.46, oy + 148, cx + W * 0.30, oy + H - 3, cx, oy + H - 3)
    .bezierCurveTo(cx - W * 0.30, oy + H - 3, cx - W * 0.46, oy + 148, cx - W * 0.46, oy + 136)
    .bezierCurveTo(cx - W * 0.47, oy + 126, cx - W * 0.47, oy + 120, cx - W * 0.45, oy + 114)
    .lineTo(cx - W * 0.45, oy + 48)
    .bezierCurveTo(cx - W * 0.47, oy + 40, cx - W * 0.47, oy + 34, cx - W * 0.46, oy + 26)
    .bezierCurveTo(cx - W * 0.46, oy + 13, cx - W * 0.30, oy + 3, cx, oy + 3)
    .fillAndStroke()

  // Front bumper strip
  doc.fillColor(DBODY).strokeColor(STROKE).lineWidth(0.6)
  doc.moveTo(cx - W * 0.28, oy + 5)
    .bezierCurveTo(cx - W * 0.43, oy + 9, cx - W * 0.43, oy + 18, cx - W * 0.41, oy + 22)
    .lineTo(cx + W * 0.41, oy + 22)
    .bezierCurveTo(cx + W * 0.43, oy + 18, cx + W * 0.43, oy + 9, cx + W * 0.28, oy + 5)
    .closePath().fillAndStroke()

  // Hood
  doc.fillColor(BODY).strokeColor(STROKE).lineWidth(0.5)
  doc.rect(cx - W * 0.41, oy + 22, W * 0.82, 26).fillAndStroke()

  // Grille detail
  doc.fillColor(DARK).rect(cx - W * 0.18, oy + 7, W * 0.36, 8).fill()
  doc.fillColor("#60a5fa").rect(cx - W * 0.08, oy + 7, W * 0.16, 8).fill()  // badge

  // Front windshield
  doc.fillColor(GLASS2).strokeColor(STROKE).lineWidth(0.5)
  doc.roundedRect(cx - W * 0.32, oy + 48, W * 0.64, 13, 2).fillAndStroke()

  // Left door strip
  doc.fillColor(DBODY).strokeColor(STROKE).lineWidth(0.5)
  doc.rect(cx - W * 0.45, oy + 48, W * 0.055, 60).fillAndStroke()

  // Right door strip
  doc.rect(cx + W * 0.395, oy + 48, W * 0.055, 60).fillAndStroke()

  // Cabin / roof area
  doc.fillColor("#e4ebf2").strokeColor(STROKE).lineWidth(0.5)
  doc.rect(cx - W * 0.32, oy + 61, W * 0.64, 40).fillAndStroke()

  // Rear windshield
  doc.fillColor(GLASS2).strokeColor(STROKE).lineWidth(0.5)
  doc.roundedRect(cx - W * 0.32, oy + 101, W * 0.64, 13, 2).fillAndStroke()

  // Trunk
  doc.fillColor(BODY).strokeColor(STROKE).lineWidth(0.5)
  doc.rect(cx - W * 0.41, oy + 114, W * 0.82, 24).fillAndStroke()

  // Rear bumper strip
  doc.fillColor(DBODY).strokeColor(STROKE).lineWidth(0.6)
  doc.moveTo(cx - W * 0.41, oy + 138)
    .lineTo(cx + W * 0.41, oy + 138)
    .bezierCurveTo(cx + W * 0.43, oy + 144, cx + W * 0.43, oy + 152, cx + W * 0.28, oy + H - 5)
    .bezierCurveTo(cx + W * 0.10, oy + H - 3, cx - W * 0.10, oy + H - 3, cx - W * 0.28, oy + H - 5)
    .bezierCurveTo(cx - W * 0.43, oy + 152, cx - W * 0.43, oy + 144, cx - W * 0.41, oy + 138)
    .closePath().fillAndStroke()

  // ── Wheels ─────────────────────────────────────────────────────────────────
  const wheels = [
    { wx: ox - 12, wy: oy + 18, zone: "wheel_fl" },
    { wx: ox + W + 2, wy: oy + 18, zone: "wheel_fr" },
    { wx: ox - 12, wy: oy + 112, zone: "wheel_rl" },
    { wx: ox + W + 2, wy: oy + 112, zone: "wheel_rr" },
  ]
  wheels.forEach(w => {
    const wc = zones[w.zone]
    doc.fillColor(DARK).strokeColor("#0f172a").lineWidth(1)
    doc.roundedRect(w.wx, w.wy, 10, 28, 3).fillAndStroke()
    doc.fillColor("#6b7280").roundedRect(w.wx + 2, w.wy + 5, 6, 18, 1.5).fill()
    if (wc) {
      doc.strokeColor(wc).lineWidth(2.5).roundedRect(w.wx, w.wy, 10, 28, 3).stroke()
      doc.lineWidth(1)
    }
  })

  // ── Damage dots (ONLY for zones with issues) ──────────────────────────────
  const dotPos: Record<string, [number, number]> = {
    "front_bumper": [cx,            oy + 12],
    "hood":         [cx,            oy + 35],
    "windshield_f": [cx,            oy + 55],
    "left":         [cx - W * 0.42, oy + 78],
    "right":        [cx + W * 0.42, oy + 78],
    "roof":         [cx,            oy + 81],
    "windshield_r": [cx,            oy + 107],
    "trunk":        [cx,            oy + 126],
    "rear_bumper":  [cx,            oy + 145],
  }

  Object.entries(zones).forEach(([zone, color]) => {
    const p = dotPos[zone]
    if (!p) return
    // White halo
    doc.fillColor("#ffffff").circle(p[0], p[1], 6).fill()
    // Colored fill
    doc.fillColor(color).circle(p[0], p[1], 5).fill()
    // Dark border
    doc.strokeColor("#00000040").lineWidth(0.5).circle(p[0], p[1], 5).stroke()
  })

  // ── Direction arrow ────────────────────────────────────────────────────────
  doc.fillColor(C.accent).polygon([cx - 4, oy - 8], [cx + 4, oy - 8], [cx, oy]).fill()
  doc.fillColor(C.muted).font("Helvetica").fontSize(5)
    .text("FRENTE", ox, oy - 16, { width: W, align: "center" })
  doc.font("Helvetica").fontSize(5)
    .text("POSTERIOR", ox, oy + H + 3, { width: W, align: "center" })
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function drawLegend(doc: PDFKit.PDFDocument, x: number, y: number) {
  const items: [string, string][] = [
    ["Con daño",    C.bad],
    ["Advertencia", C.warn],
  ]
  doc.font("Helvetica-Bold").fontSize(6).fillColor(C.text).text("MARCADORES:", x, y)
  y += 8
  items.forEach(([label, color]) => {
    doc.fillColor("#ffffff").circle(x + 5, y + 4, 5).fill()
    doc.fillColor(color).circle(x + 5, y + 4, 4).fill()
    doc.strokeColor("#00000030").lineWidth(0.5).circle(x + 5, y + 4, 4).stroke()
    doc.fillColor(C.muted).font("Helvetica").fontSize(5.5).text(label, x + 13, y + 1)
    y += 11
  })
  // Wheel border indicator
  doc.fillColor("#ffffff").roundedRect(x, y, 10, 7, 2).fill()
  doc.strokeColor(C.bad).lineWidth(2).roundedRect(x, y, 10, 7, 2).stroke()
  doc.fillColor(C.muted).font("Helvetica").fontSize(5.5).text("Neumático", x + 13, y + 1)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sectionBar(doc: PDFKit.PDFDocument, label: string, y: number, w = CW): number {
  doc.fillColor(C.brand).rect(ML, y, w, 13).fill()
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7).text(label, ML + 7, y + 3)
  return y + 16
}

function miniHeader(doc: PDFKit.PDFDocument, title: string, sub: string, logoBuf: Buffer | null) {
  doc.fillColor(C.navy).rect(0, 0, PW, 30).fill()
  doc.fillColor(C.accent).rect(0, 30, PW, 3).fill()
  if (logoBuf) {
    try { doc.image(logoBuf, ML, 4, { height: 22, fit: [80, 22] }) } catch { }
  }
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8.5)
    .text(title, 110, 7, { width: 370, align: "center" })
  doc.fillColor("#94a3b8").font("Helvetica").fontSize(6.5)
    .text(sub, 110, 18, { width: 370, align: "center" })
}

function pageFooter(doc: PDFKit.PDFDocument, companyName: string, page: number) {
  doc.fillColor(C.brand).rect(0, PH - 20, PW, 20).fill()
  doc.fillColor("#64748b").font("Helvetica").fontSize(6)
    .text(`${companyName} · Sistema de Inspección Vehicular`, ML, PH - 13, { width: 360 })
    .text(`Página ${page}`, ML, PH - 13, { width: CW, align: "right" })
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
  const v   = ins.vehicles ?? {}
  const cl  = ins.clients  ?? {}

  const badItems   = items.filter(i => isBad(i.estado))
  const warnItems  = items.filter(i => isWarn(i.estado))
  const allDefects = [...badItems, ...warnItems]

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
  const photoBufs: Buffer[] = []
  for (const url of (ins.photos ?? []) as string[]) {
    try { const r = await fetch(url); if (r.ok) photoBufs.push(Buffer.from(await r.arrayBuffer())) } catch { }
  }

  const doc = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))

  await new Promise<void>(resolve => {
    doc.on("end", resolve)

    // ══════════════════════════════════════════════════════════════════════════
    // PÁGINA 1 — RESUMEN
    // ══════════════════════════════════════════════════════════════════════════

    // ── Header ────────────────────────────────────────────────────────────────
    doc.fillColor(C.navy).rect(0, 0, PW, 76).fill()
    // Subtle stripe pattern
    doc.save()
    doc.fillColor("#ffffff06")
    for (let xi = -20; xi < PW + 20; xi += 16) {
      doc.moveTo(xi, 0).lineTo(xi + 76, 76).lineWidth(8).stroke()
    }
    doc.restore()
    doc.fillColor(C.accent).rect(0, 76, PW, 3).fill()

    // Logo (left)
    if (logoBuf) {
      try { doc.image(logoBuf, ML, 12, { height: 50, fit: [140, 50] }) }
      catch {
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(12).text(companyName, ML, 18)
      }
    } else {
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(12).text(companyName, ML, 14)
      if (companyRut)     doc.fillColor("#94a3b8").font("Helvetica").fontSize(7).text(`RUT: ${companyRut}`, ML, 30)
      if (companyPhone)   doc.fillColor("#94a3b8").font("Helvetica").fontSize(7).text(`Tel: ${companyPhone}`, ML, 40)
      if (companyAddress) doc.fillColor("#94a3b8").font("Helvetica").fontSize(6.5).text(companyAddress, ML, 50, { width: 160 })
    }

    // Title (center)
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(14.5)
      .text("INFORME DE INSPECCIÓN VEHICULAR", 170, 12, { width: 255, align: "center" })
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(7.5)
      .text(`Fecha: ${formatDate(ins.fecha_inspeccion)}`, 170, 32, { width: 255, align: "center" })
    doc.fillColor("#7dd3fc").font("Helvetica-Bold").fontSize(7.5)
      .text(`Inspector: ${ins.profiles?.full_name ?? "—"}`, 170, 44, { width: 255, align: "center" })
    doc.fillColor("#475569").font("Helvetica").fontSize(6.5)
      .text(`N° ${id.slice(0, 8).toUpperCase()}`, 170, 56, { width: 255, align: "center" })

    // QR (right)
    if (qrBuf) {
      try {
        doc.image(qrBuf, PW - 80, 4, { width: 66, height: 66 })
        doc.fillColor("#475569").font("Helvetica").fontSize(5)
          .text("Ver informe online", PW - 80, 71, { width: 66, align: "center" })
      } catch { }
    }

    let y = 84

    // ── Datos del vehículo ────────────────────────────────────────────────────
    y = sectionBar(doc, "DATOS DEL VEHÍCULO", y)

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

    const cols = 4
    const colW = CW / cols
    const rowH = 22

    vFields.forEach(([label, val], i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const fx = ML + col * colW
      const fy = y + row * rowH
      if (row % 2 === 0) doc.fillColor("#f1f5f9").rect(fx, fy - 1, colW, rowH).fill()
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(label, fx + 5, fy + 2)
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(8.5).text(val, fx + 5, fy + 11, { width: colW - 8 })
    })
    y += Math.ceil(vFields.length / cols) * rowH + 5

    // ── Datos del cliente ─────────────────────────────────────────────────────
    y = sectionBar(doc, "DATOS DEL CLIENTE", y)

    const cFields: [string, string][] = [
      ["Nombre",   cl.full_name ?? "—"],
      ["RUT",      cl.rut ?? "—"],
      ["Teléfono", cl.phone ?? "—"],
      ["Email",    cl.email ?? "—"],
    ]
    const cColW = CW / cFields.length
    cFields.forEach(([label, val], i) => {
      const fx = ML + i * cColW
      if (i % 2 === 0) doc.fillColor("#f8fafc").rect(fx, y - 1, cColW, 22).fill()
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(label, fx + 5, y + 1)
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(8).text(val, fx + 5, y + 10, { width: cColW - 8 })
    })
    y += 22

    // Documents strip (optional)
    if (v.soap_estado || v.rev_tecnica_estado || v.permiso_circulacion) {
      doc.fillColor("#fef9c3").rect(ML, y, CW, 20).fill()
      doc.strokeColor("#fde68a").lineWidth(0.5).rect(ML, y, CW, 20).stroke()
      const docFields: [string, string][] = [
        ["SOAP",              v.soap_estado ?? "—"],
        ["Rev. Técnica",      v.rev_tecnica_estado ?? "—"],
        ["Perm. Circulación", v.permiso_circulacion ?? "—"],
        ["Multas",            v.multas ?? "$0"],
      ]
      const dColW = CW / docFields.length
      docFields.forEach(([label, val], i) => {
        const fx = ML + i * dColW
        doc.fillColor("#92400e").font("Helvetica").fontSize(6).text(label, fx + 5, y + 2)
        doc.fillColor("#78350f").font("Helvetica-Bold").fontSize(7).text(val, fx + 5, y + 11)
      })
      y += 22
    }

    y += 4

    // ── Resultado + Diagrama ──────────────────────────────────────────────────
    y = sectionBar(doc, "RESULTADO DE LA INSPECCIÓN", y)

    const resultSectionY = y

    // Score boxes — left portion (width ≈ 320pt)
    const SCORE_COL_W = 320
    const scores = [
      { label: "NOTA FINAL",  nota: ins.nota_final,      big: true  },
      { label: "Visual",      nota: ins.nota_visual,     big: false },
      { label: "Carrocería",  nota: ins.nota_carroceria, big: false },
      { label: "Mecánica",    nota: ins.nota_mecanica,   big: false },
    ]

    const BIG_W = 88, SM_W = 72, GAP = 7
    const SCORE_H = 74
    let sx = ML

    scores.forEach(s => {
      const nota = s.nota ?? 0
      const bw = s.big ? BIG_W : SM_W
      const bh = SCORE_H
      const col = nota >= 6.5 ? "#15803d" : nota >= 5 ? "#b45309" : "#b91c1c"
      const colLight = nota >= 6.5 ? "#dcfce7" : nota >= 5 ? "#fef3c7" : "#fee2e2"

      // Card background
      doc.fillColor(colLight).roundedRect(sx, resultSectionY, bw, bh, 6).fill()
      doc.strokeColor(col).lineWidth(1.5).roundedRect(sx, resultSectionY, bw, bh, 6).stroke()

      // Top color stripe
      doc.fillColor(col).roundedRect(sx, resultSectionY, bw, 26, 6).fill()
      doc.fillColor(col).rect(sx, resultSectionY + 14, bw, 12).fill()

      // Note value
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(s.big ? 22 : 18)
        .text(nota ? nota.toFixed(1) : "—", sx, resultSectionY + 3, { width: bw, align: "center" })

      // /7.0
      doc.fillColor("#ffffff99").font("Helvetica").fontSize(6)
        .text("/7.0", sx, resultSectionY + 18, { width: bw, align: "center" })

      // Percentage
      const pct = Math.round((nota / 7) * 100)
      doc.fillColor(col).font("Helvetica-Bold").fontSize(s.big ? 20 : 16)
        .text(`${pct}%`, sx, resultSectionY + 32, { width: bw, align: "center" })

      // Progress bar background
      const barX = sx + 8, barW2 = bw - 16
      doc.fillColor("#0000001a").roundedRect(barX, resultSectionY + bh - 14, barW2, 5, 2.5).fill()
      doc.fillColor(col).roundedRect(barX, resultSectionY + bh - 14, barW2 * (nota / 7), 5, 2.5).fill()

      // Label
      doc.fillColor(col).font("Helvetica-Bold").fontSize(s.big ? 7 : 6)
        .text(s.label, sx, resultSectionY + bh - 7, { width: bw, align: "center" })

      sx += bw + GAP
    })

    // Car diagram — right portion, starts at x ≈ 340
    const carX = ML + BIG_W + SM_W * 3 + GAP * 4 + 10  // ≈ 342
    const carY = resultSectionY - 8

    drawCarTopDown(doc, carX, carY, zoneColors)
    drawLegend(doc, carX + 110, carY + 40)

    // The car is 162pt tall, scores are 74pt — use max
    y = resultSectionY + 162 + 8

    // ── Defectos detectados ───────────────────────────────────────────────────
    if (allDefects.length > 0) {
      y = sectionBar(doc, `ÍTEMS CON OBSERVACIONES  (${allDefects.length})`, y)

      const defH = Math.min(Math.ceil(allDefects.length / 2) * 11, 110) + 6
      doc.fillColor("#fff7ed").rect(ML, y, CW, defH).fill()
      doc.strokeColor("#fed7aa").lineWidth(0.5).rect(ML, y, CW, defH).stroke()

      const limit = Math.min(allDefects.length, 20)
      const half = Math.ceil(limit / 2)
      const colDefW = CW / 2 - 8

      for (let i = 0; i < limit; i++) {
        const item = allDefects[i]
        const right = i >= half
        const ix = ML + (right ? CW / 2 + 6 : 5)
        const iy = y + (right ? i - half : i) * 11 + 4
        const ec = estadoColor(item.estado)

        doc.fillColor(ec).circle(ix + 4, iy + 5, 2.5).fill()
        doc.fillColor(C.text).font("Helvetica").fontSize(6.5)
          .text(item.item_label, ix + 10, iy + 1, { width: colDefW - 64 })
        doc.fillColor(ec).font("Helvetica-Bold").fontSize(6.5)
          .text(item.estado, ix + colDefW - 58, iy + 1, { width: 56, align: "right" })
      }

      if (allDefects.length > limit) {
        doc.fillColor(C.muted).font("Helvetica").fontSize(6)
          .text(`... y ${allDefects.length - limit} más — ver tabla completa en pág. 2`, ML + 5, y + defH - 8)
      }

      y += defH + 4
    }

    // ── Observaciones ─────────────────────────────────────────────────────────
    if (ins.comentarios && y < 700) {
      y = sectionBar(doc, "OBSERVACIONES DEL INSPECTOR", y)
      const obsText = ins.comentarios.slice(0, 500)
      const lines = obsText.split("\n").length
      const obsH = Math.min(Math.max(lines * 10, 30), 50)
      doc.fillColor("#f0fdf4").rect(ML, y, CW, obsH).fill()
      doc.strokeColor("#86efac").lineWidth(0.5).rect(ML, y, CW, obsH).stroke()
      doc.fillColor(C.text).font("Helvetica").fontSize(7.5)
        .text(obsText, ML + 7, y + 5, { width: CW - 14, lineGap: 1.5, height: obsH - 8, ellipsis: true })
      y += obsH + 4
    }

    // ── Veredicto + Firmas ────────────────────────────────────────────────────
    const sigMinY = y + 14
    const sigActualY = sigMinY > 720 ? 720 : sigMinY

    const notaFinal = ins.nota_final ?? 0
    const verdict = notaFinal >= 6.5 ? "APROBADO" : notaFinal >= 5 ? "CONDICIONADO" : "RECHAZADO"
    const verdictBg = notaFinal >= 6.5 ? "#15803d" : notaFinal >= 5 ? "#b45309" : "#b91c1c"

    // Verdict badge
    doc.fillColor(verdictBg).roundedRect(ML, sigActualY, 180, 24, 5).fill()
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(12)
      .text(verdict, ML, sigActualY + 6, { width: 180, align: "center" })

    // Date + Place
    doc.fillColor(C.muted).font("Helvetica").fontSize(7)
      .text(`Fecha: ${formatDate(ins.fecha_inspeccion)}`, ML + 190, sigActualY + 4)
      .text("Lugar: ________________________________________", ML + 190, sigActualY + 14)

    // Signature lines
    const sl = sigActualY + 56
    // Inspector
    doc.fillColor(C.border).rect(ML, sl, 170, 0.8).fill()
    doc.fillColor(C.text).font("Helvetica-Bold").fontSize(7.5)
      .text(ins.profiles?.full_name ?? "Inspector", ML, sl + 4, { width: 170, align: "center" })
    doc.fillColor(C.muted).font("Helvetica").fontSize(6.5)
      .text("Firma del Inspector", ML, sl + 14, { width: 170, align: "center" })
    // Client
    doc.fillColor(C.border).rect(ML + 360, sl, 170, 0.8).fill()
    doc.fillColor(C.muted).font("Helvetica").fontSize(7)
      .text("_____________________________", ML + 360, sl + 4, { width: 170, align: "center" })
    doc.fillColor(C.muted).font("Helvetica").fontSize(6.5)
      .text("Nombre y Firma del Cliente", ML + 360, sl + 14, { width: 170, align: "center" })

    pageFooter(doc, companyName, 1)

    // ══════════════════════════════════════════════════════════════════════════
    // PÁGINA 2 — DETALLE COMPLETO
    // ══════════════════════════════════════════════════════════════════════════
    doc.addPage({ margin: 0, size: "A4" })

    miniHeader(doc, "DETALLE COMPLETO DE INSPECCIÓN",
      `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""} ${v.anio ?? ""}  ·  Cliente: ${cl.full_name ?? ""}`,
      logoBuf)

    y = 36

    // Column header
    doc.fillColor(C.accent).rect(ML, y, CW, 12).fill()
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(6.5)
      .text("ÍTEM", ML + 6, y + 2.5, { width: 296 })
      .text("ESTADO", ML + 304, y + 2.5, { width: 110, align: "center" })
      .text("OBSERVACIONES", ML + 418, y + 2.5, { width: 110 })
    y += 14

    let pageNum = 2
    let curSection = 0, curSub = ""
    let rowIdx = 0
    const sectionNames: Record<number, string> = {
      1: "1.  INSPECCIÓN VISUAL",
      2: "2.  INSPECCIÓN DE CARROCERÍA",
      3: "3.  INSPECCIÓN MECÁNICA",
    }

    items.forEach(item => {
      const hasObs = !!item.observaciones
      const rowH2 = hasObs ? 15 : 10

      // Page break
      if (y + rowH2 > PH - 24) {
        pageFooter(doc, companyName, pageNum)
        doc.addPage({ margin: 0, size: "A4" })
        pageNum++
        miniHeader(doc, "DETALLE COMPLETO (cont.)",
          `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""}`, logoBuf)
        y = 36
        // Column header repeat
        doc.fillColor(C.accent).rect(ML, y, CW, 12).fill()
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(6.5)
          .text("ÍTEM", ML + 6, y + 2.5, { width: 296 })
          .text("ESTADO", ML + 304, y + 2.5, { width: 110, align: "center" })
          .text("OBSERVACIONES", ML + 418, y + 2.5, { width: 110 })
        y += 14
        rowIdx = 0; curSection = 0; curSub = ""
      }

      // Section header
      if (item.section !== curSection) {
        curSection = item.section; curSub = ""
        doc.fillColor(C.brand).rect(ML, y, CW, 13).fill()
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7)
          .text(sectionNames[item.section] ?? "", ML + 8, y + 3)
        y += 14; rowIdx = 0
      }

      // Subsection header
      if (item.subsection !== curSub) {
        curSub = item.subsection
        doc.fillColor("#dde4ee").rect(ML, y, CW, 11).fill()
        doc.fillColor(C.brand).font("Helvetica-Bold").fontSize(6.5)
          .text(item.subsection.replace(/^\d+\.\d+\s*/, ""), ML + 8, y + 2)
        y += 12; rowIdx = 0
      }

      // Alternating row bg
      if (rowIdx % 2 === 0) doc.fillColor("#f8fafc").rect(ML, y, CW, rowH2).fill()

      const ec = estadoColor(item.estado)
      const isIssue = isBad(item.estado) || isWarn(item.estado)

      // Status dot (only if issue)
      if (isIssue) {
        doc.fillColor(ec).circle(ML + 6, y + rowH2 / 2, 2.5).fill()
      }

      // Item label
      doc.fillColor(C.text).font("Helvetica").fontSize(6.8)
        .text(item.item_label, ML + 12, y + (hasObs ? 2 : 1.5), { width: 288 })

      // Estado
      doc.fillColor(ec).font(isIssue ? "Helvetica-Bold" : "Helvetica").fontSize(6.8)
        .text(item.estado, ML + 304, y + (hasObs ? 2 : 1.5), { width: 110, align: "center" })

      // Observations (right column or below label)
      if (hasObs) {
        doc.fillColor(C.muted).font("Helvetica").fontSize(5.8)
          .text(item.observaciones!, ML + 12, y + 9, { width: 510 })
      }

      // Row separator
      doc.strokeColor(C.mid).lineWidth(0.3)
        .moveTo(ML, y + rowH2).lineTo(ML + CW, y + rowH2).stroke()

      y += rowH2; rowIdx++
    })

    // ── Fotos ─────────────────────────────────────────────────────────────────
    if (photoBufs.length > 0) {
      pageFooter(doc, companyName, pageNum)
      doc.addPage({ margin: 0, size: "A4" })
      pageNum++
      miniHeader(doc, "FOTOGRAFÍAS DEL VEHÍCULO",
        `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""}`, logoBuf)

      y = 38
      const imgW = 170, imgH = 128, imgGap = 6
      let col2 = 0

      for (let pi = 0; pi < photoBufs.length; pi++) {
        if (y + imgH > PH - 24) {
          pageFooter(doc, companyName, pageNum)
          doc.addPage({ margin: 0, size: "A4" })
          pageNum++
          miniHeader(doc, "FOTOGRAFÍAS (cont.)", `${v.patente ?? ""}`, logoBuf)
          y = 38; col2 = 0
        }
        const px = ML + col2 * (imgW + imgGap)
        try {
          doc.image(photoBufs[pi], px, y, { width: imgW, height: imgH })
        } catch {
          doc.fillColor(C.light).rect(px, y, imgW, imgH).fill()
          doc.fillColor(C.muted).font("Helvetica").fontSize(8)
            .text("Sin imagen", px, y + imgH / 2 - 5, { width: imgW, align: "center" })
        }
        doc.strokeColor(C.border).lineWidth(0.8).rect(px, y, imgW, imgH).stroke()
        doc.fillColor(C.muted).font("Helvetica").fontSize(6)
          .text(`Foto ${pi + 1}`, px, y + imgH + 2, { width: imgW, align: "center" })

        col2++
        if (col2 === 3) { col2 = 0; y += imgH + 18 }
      }
    }

    pageFooter(doc, companyName, pageNum)
    doc.end()
  })

  const buf = Buffer.concat(chunks)
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="inspeccion-${v.patente ?? id}-${ins.fecha_inspeccion?.slice(0, 10) ?? ""}.pdf"`,
    },
  })
}
