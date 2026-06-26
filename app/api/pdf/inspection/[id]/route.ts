import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import PDFDocument from "pdfkit"
import QRCode from "qrcode"

// ─── Constantes ────────────────────────────────────────────────────────────────
const PW  = 595   // A4 width
const PH  = 842   // A4 height
const ML  = 28    // margin left
const MR  = 28    // margin right
const CW  = PW - ML - MR   // 539

const C = {
  navy:    "#0f172a",
  brand:   "#1e3a5f",
  accent:  "#2563eb",
  good:    "#15803d",
  warn:    "#b45309",
  bad:     "#b91c1c",
  muted:   "#64748b",
  border:  "#cbd5e1",
  light:   "#f8fafc",
  mid:     "#e2e8f0",
  white:   "#ffffff",
  text:    "#1e293b",
  // header celeste
  hdrBg:   "#dbeafe",   // sky-100 claro
  hdrLine: "#3b82f6",   // blue-500
  hdrText: "#1e293b",   // casi negro → legible
  hdrSub:  "#475569",   // slate-600
}

function fmtDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function estadoColor(e: string) {
  if (["Bueno","Sin Daño","Normal","Funciona","A nivel","No Presenta","No Encendido","Presenta"].includes(e)) return C.good
  if (["Con Daño","Regular"].includes(e)) return C.warn
  if (["Malo","Anormal","No Funciona","Bajo nivel","Encendido"].includes(e)) return C.bad
  return "#94a3b8"
}
function isBad(e: string) {
  return ["Con Daño","Malo","Anormal","No Funciona","Bajo nivel","Encendido"].includes(e)
}
function isWarn(e: string) { return ["Regular", "Con Daño"].includes(e) }

// ─── Cálculo de zonas ─────────────────────────────────────────────────────────
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

function calcZones(items: any[]): Record<string, string> {
  const lvl: Record<string, number> = {}
  items.forEach(item => {
    const z = ZONE_MAP[item.item_key]; if (!z) return
    const l = isBad(item.estado) ? 2 : isWarn(item.estado) ? 1 : 0
    if ((lvl[z] ?? -1) < l) lvl[z] = l
  })
  const out: Record<string, string> = {}
  Object.entries(lvl).forEach(([z, l]) => { if (l > 0) out[z] = l === 2 ? C.bad : C.warn })
  return out
}

// ─── Ilustración profesional del auto (vista superior — tipo blueprint) ────────
function drawCarBlueprint(doc: PDFKit.PDFDocument, cx: number, cy: number, zones: Record<string, string>) {
  const BH = 310      // body height (front → rear)
  const halfH = BH / 2

  // Y references
  const fy = cy - halfH   // front (top)
  const ry = cy + halfH   // rear  (bottom)

  const STROKE  = "#1e2d40"
  const FILL    = "#f4f6f8"
  const GLASS   = "#ddeaf6"
  const TIRE    = "#1a202c"
  const LW      = 1.3

  doc.save()

  // ── Outer body silhouette ───────────────────────────────────────────────────
  doc.fillColor(FILL).strokeColor(STROKE).lineWidth(LW)
  doc.moveTo(cx, fy)
    .bezierCurveTo(cx + 42, fy,     cx + 64, fy + 12,  cx + 82, fy + 28)
    .bezierCurveTo(cx + 92, fy + 38, cx + 95, fy + 52, cx + 95, fy + 72)
    .lineTo(cx + 95, ry - 72)
    .bezierCurveTo(cx + 95, ry - 52, cx + 92, ry - 38, cx + 80, ry - 24)
    .bezierCurveTo(cx + 62, ry - 10, cx + 38, ry,      cx,      ry)
    .bezierCurveTo(cx - 38, ry,      cx - 62, ry - 10, cx - 80, ry - 24)
    .bezierCurveTo(cx - 92, ry - 38, cx - 95, ry - 52, cx - 95, ry - 72)
    .lineTo(cx - 95, fy + 72)
    .bezierCurveTo(cx - 95, fy + 52, cx - 92, fy + 38, cx - 82, fy + 28)
    .bezierCurveTo(cx - 64, fy + 12, cx - 42, fy,      cx,      fy)
    .closePath().fillAndStroke()

  // ── Front bumper strip ──────────────────────────────────────────────────────
  doc.strokeColor(STROKE).lineWidth(LW * 0.9)
  doc.moveTo(cx - 42, fy + 2)
    .bezierCurveTo(cx - 58, fy + 6, cx - 72, fy + 14, cx - 80, fy + 22)
    .stroke()
  doc.moveTo(cx + 42, fy + 2)
    .bezierCurveTo(cx + 58, fy + 6, cx + 72, fy + 14, cx + 80, fy + 22)
    .stroke()
  // bumper center bar
  doc.moveTo(cx - 36, fy + 4).bezierCurveTo(cx - 18, fy + 2, cx + 18, fy + 2, cx + 36, fy + 4).stroke()

  // ── Front headlights ────────────────────────────────────────────────────────
  doc.fillColor("#e8eff8").strokeColor(STROKE).lineWidth(LW * 0.8)
  // Left
  doc.moveTo(cx - 82, fy + 24)
    .bezierCurveTo(cx - 90, fy + 28, cx - 93, fy + 38, cx - 88, fy + 46)
    .bezierCurveTo(cx - 82, fy + 50, cx - 68, fy + 50, cx - 60, fy + 44)
    .lineTo(cx - 58, fy + 36).bezierCurveTo(cx - 62, fy + 28, cx - 74, fy + 22, cx - 82, fy + 24)
    .closePath().fillAndStroke()
  // Right
  doc.moveTo(cx + 82, fy + 24)
    .bezierCurveTo(cx + 90, fy + 28, cx + 93, fy + 38, cx + 88, fy + 46)
    .bezierCurveTo(cx + 82, fy + 50, cx + 68, fy + 50, cx + 60, fy + 44)
    .lineTo(cx + 58, fy + 36).bezierCurveTo(cx + 62, fy + 28, cx + 74, fy + 22, cx + 82, fy + 24)
    .closePath().fillAndStroke()

  // ── Hood ────────────────────────────────────────────────────────────────────
  doc.strokeColor(STROKE).lineWidth(LW * 0.7)
  // Hood top edge (separates bumper/hood)
  doc.moveTo(cx - 78, fy + 26).bezierCurveTo(cx - 52, fy + 20, cx - 20, fy + 18, cx, fy + 18)
    .bezierCurveTo(cx + 20, fy + 18, cx + 52, fy + 20, cx + 78, fy + 26).stroke()
  // Hood bottom edge (hood/windshield)
  doc.moveTo(cx - 84, fy + 74).bezierCurveTo(cx - 54, fy + 68, cx - 26, fy + 66, cx, fy + 66)
    .bezierCurveTo(cx + 26, fy + 66, cx + 54, fy + 68, cx + 84, fy + 74).stroke()
  // Hood crease center
  doc.lineWidth(LW * 0.5)
  doc.moveTo(cx, fy + 22).lineTo(cx, fy + 66).stroke()
  // Hood crease sides
  doc.moveTo(cx - 60, fy + 26).bezierCurveTo(cx - 40, fy + 32, cx - 28, fy + 50, cx - 24, fy + 66).stroke()
  doc.moveTo(cx + 60, fy + 26).bezierCurveTo(cx + 40, fy + 32, cx + 28, fy + 50, cx + 24, fy + 66).stroke()

  // ── Front windshield ────────────────────────────────────────────────────────
  doc.fillColor(GLASS).strokeColor(STROKE).lineWidth(LW)
  doc.moveTo(cx - 82, fy + 76)
    .bezierCurveTo(cx - 56, fy + 72, cx - 28, fy + 70, cx, fy + 70)
    .bezierCurveTo(cx + 28, fy + 70, cx + 56, fy + 72, cx + 82, fy + 76)
    .lineTo(cx + 72, fy + 104)
    .bezierCurveTo(cx + 46, fy + 106, cx + 24, fy + 107, cx, fy + 107)
    .bezierCurveTo(cx - 24, fy + 107, cx - 46, fy + 106, cx - 72, fy + 104)
    .closePath().fillAndStroke()

  // A-pillars
  doc.strokeColor(STROKE).lineWidth(LW * 1.2)
  doc.moveTo(cx - 82, fy + 76).lineTo(cx - 88, fy + 114).stroke()
  doc.moveTo(cx + 82, fy + 76).lineTo(cx + 88, fy + 114).stroke()

  // ── Cabin / roof ────────────────────────────────────────────────────────────
  const cabinTop = fy + 112
  const cabinBot = fy + 112 + BH * 0.305

  doc.fillColor("#e9eef4").strokeColor(STROKE).lineWidth(LW)
  doc.rect(cx - 88, cabinTop, 176, cabinBot - cabinTop).fillAndStroke()

  // Sunroof inner border
  doc.fillColor("#dce5ef").strokeColor(STROKE).lineWidth(LW * 0.6)
  doc.roundedRect(cx - 54, cabinTop + 8, 108, cabinBot - cabinTop - 16, 5).fillAndStroke()
  // Center line
  doc.lineWidth(LW * 0.5).moveTo(cx, cabinTop).lineTo(cx, cabinBot).stroke()
  // Inner window top + bottom arcs
  doc.lineWidth(LW * 0.7)
  doc.moveTo(cx - 88, cabinTop + 14).lineTo(cx - 54, cabinTop + 8).stroke()
  doc.moveTo(cx + 88, cabinTop + 14).lineTo(cx + 54, cabinTop + 8).stroke()
  doc.moveTo(cx - 88, cabinBot - 14).lineTo(cx - 54, cabinBot - 8).stroke()
  doc.moveTo(cx + 88, cabinBot - 14).lineTo(cx + 54, cabinBot - 8).stroke()

  // B-pillar
  doc.lineWidth(LW * 1.5)
  const bPillarY = cabinTop + (cabinBot - cabinTop) * 0.46
  doc.moveTo(cx - 88, bPillarY - 4).lineTo(cx - 88, bPillarY + 6).stroke()
  doc.moveTo(cx + 88, bPillarY - 4).lineTo(cx + 88, bPillarY + 6).stroke()

  // ── Rear windshield ─────────────────────────────────────────────────────────
  doc.fillColor(GLASS).strokeColor(STROKE).lineWidth(LW)
  doc.moveTo(cx - 88, cabinBot)
    .lineTo(cx - 78, cabinBot + 30)
    .bezierCurveTo(cx - 52, cabinBot + 34, cx - 26, cabinBot + 36, cx, cabinBot + 36)
    .bezierCurveTo(cx + 26, cabinBot + 34, cx + 52, cabinBot + 34, cx + 78, cabinBot + 30)
    .lineTo(cx + 88, cabinBot)
    .closePath().fillAndStroke()

  // C-pillars
  doc.strokeColor(STROKE).lineWidth(LW * 1.2)
  doc.moveTo(cx - 88, cabinBot).lineTo(cx - 78, cabinBot + 30).stroke()
  doc.moveTo(cx + 88, cabinBot).lineTo(cx + 78, cabinBot + 30).stroke()

  // ── Trunk ───────────────────────────────────────────────────────────────────
  const trunkTop = cabinBot + 38
  doc.strokeColor(STROKE).lineWidth(LW * 0.9)
  // Trunk top edge
  doc.moveTo(cx - 80, trunkTop)
    .bezierCurveTo(cx - 54, trunkTop - 3, cx - 26, trunkTop - 5, cx, trunkTop - 5)
    .bezierCurveTo(cx + 26, trunkTop - 5, cx + 54, trunkTop - 3, cx + 80, trunkTop).stroke()
  // Trunk bottom edge
  doc.moveTo(cx - 64, ry - 22)
    .bezierCurveTo(cx - 38, ry - 18, cx - 16, ry - 16, cx, ry - 16)
    .bezierCurveTo(cx + 16, ry - 16, cx + 38, ry - 18, cx + 64, ry - 22).stroke()
  // Trunk crease
  doc.lineWidth(LW * 0.5)
  doc.moveTo(cx, trunkTop - 5).lineTo(cx, ry - 18).stroke()
  doc.moveTo(cx - 46, trunkTop).bezierCurveTo(cx - 34, trunkTop + 16, cx - 26, trunkTop + 30, cx - 22, ry - 20).stroke()
  doc.moveTo(cx + 46, trunkTop).bezierCurveTo(cx + 34, trunkTop + 16, cx + 26, trunkTop + 30, cx + 22, ry - 20).stroke()

  // ── Rear bumper + taillights ─────────────────────────────────────────────────
  // Taillights
  doc.fillColor("#fca5a5").strokeColor(STROKE).lineWidth(LW * 0.9)
  doc.moveTo(cx - 94, ry - 16)
    .bezierCurveTo(cx - 94, ry - 28, cx - 86, ry - 36, cx - 72, ry - 36)
    .lineTo(cx - 58, ry - 28).lineTo(cx - 56, ry - 16).closePath().fillAndStroke()
  doc.moveTo(cx + 94, ry - 16)
    .bezierCurveTo(cx + 94, ry - 28, cx + 86, ry - 36, cx + 72, ry - 36)
    .lineTo(cx + 58, ry - 28).lineTo(cx + 56, ry - 16).closePath().fillAndStroke()

  // Rear bumper bar
  doc.fillColor(FILL).strokeColor(STROKE).lineWidth(LW)
  doc.moveTo(cx - 56, ry - 6).bezierCurveTo(cx - 30, ry - 3, cx - 12, ry - 2, cx, ry - 2)
    .bezierCurveTo(cx + 12, ry - 2, cx + 30, ry - 3, cx + 56, ry - 6).stroke()

  // Exhausts
  doc.fillColor("#c0c4cc").strokeColor(STROKE).lineWidth(LW * 0.7)
  doc.ellipse(cx - 28, ry + 2, 7, 3).fillAndStroke()
  doc.ellipse(cx + 28, ry + 2, 7, 3).fillAndStroke()

  // ── Door lines ───────────────────────────────────────────────────────────────
  doc.strokeColor(STROKE).lineWidth(LW * 0.8)
  // Door gap lines (left)
  doc.moveTo(cx - 92, cabinTop + 2).lineTo(cx - 92, cabinBot - 2).stroke()
  // Door divider (between front and rear door)
  const midDoor = cabinTop + (cabinBot - cabinTop) * 0.48
  doc.moveTo(cx - 95, midDoor).lineTo(cx - 72, midDoor).stroke()
  // Door handles
  doc.lineWidth(LW * 0.7)
  doc.roundedRect(cx - 94, midDoor - 28, 6, 10, 1.5).fillAndStroke()
  doc.roundedRect(cx - 94, midDoor + 18, 6, 10, 1.5).fillAndStroke()
  // Same right side
  doc.lineWidth(LW * 0.8)
  doc.moveTo(cx + 92, cabinTop + 2).lineTo(cx + 92, cabinBot - 2).stroke()
  doc.moveTo(cx + 95, midDoor).lineTo(cx + 72, midDoor).stroke()
  doc.lineWidth(LW * 0.7)
  doc.roundedRect(cx + 88, midDoor - 28, 6, 10, 1.5).fillAndStroke()
  doc.roundedRect(cx + 88, midDoor + 18, 6, 10, 1.5).fillAndStroke()

  // ── Side mirrors ─────────────────────────────────────────────────────────────
  doc.fillColor("#d0d5dd").strokeColor(STROKE).lineWidth(LW * 0.8)
  // Left mirror
  doc.moveTo(cx - 90, fy + 90)
    .bezierCurveTo(cx - 100, fy + 84, cx - 112, fy + 86, cx - 114, fy + 98)
    .bezierCurveTo(cx - 114, fy + 108, cx - 104, fy + 112, cx - 92, fy + 110)
    .closePath().fillAndStroke()
  // Right mirror
  doc.moveTo(cx + 90, fy + 90)
    .bezierCurveTo(cx + 100, fy + 84, cx + 112, fy + 86, cx + 114, fy + 98)
    .bezierCurveTo(cx + 114, fy + 108, cx + 104, fy + 112, cx + 92, fy + 110)
    .closePath().fillAndStroke()

  // ── Wheels (con detalle rim/tire) ────────────────────────────────────────────
  const WW = 26, WH = 58
  const wFY = fy + 28
  const wRY = ry - 28 - WH
  const wLX = cx - 95 - WW
  const wRX = cx + 95

  const wheelData: [number, number, string][] = [
    [wLX, wFY, "wheel_fl"], [wRX, wFY, "wheel_fr"],
    [wLX, wRY, "wheel_rl"], [wRX, wRY, "wheel_rr"],
  ]

  wheelData.forEach(([wx, wy, zone]) => {
    // Tire
    doc.fillColor(TIRE).strokeColor(STROKE).lineWidth(LW)
    doc.roundedRect(wx, wy, WW, WH, WW * 0.25).fillAndStroke()
    // Sidewall groove
    doc.strokeColor("#3a4150").lineWidth(0.5)
    doc.roundedRect(wx + 2, wy + 3, WW - 4, WH - 6, WW * 0.18).stroke()
    // Rim face
    doc.fillColor("#bec3cc").strokeColor(STROKE).lineWidth(0.8)
    doc.roundedRect(wx + 4, wy + 8, WW - 8, WH - 16, WW * 0.15).fill()
    // Hub
    doc.fillColor("#9ba4af").circle(wx + WW / 2, wy + WH / 2, 4).fill()
    // Spokes
    doc.strokeColor("#8a929e").lineWidth(0.5)
    doc.moveTo(wx + WW / 2, wy + 10).lineTo(wx + WW / 2, wy + WH - 10).stroke()
    doc.moveTo(wx + 6, wy + WH / 2).lineTo(wx + WW - 6, wy + WH / 2).stroke()

    // Damage dot on wheel if issue
    const wc = zones[zone]
    if (wc) {
      doc.fillColor("#ffffff").circle(wx + WW / 2, wy + WH / 2, 7).fill()
      doc.fillColor(wc).circle(wx + WW / 2, wy + WH / 2, 6).fill()
      doc.strokeColor("#00000025").lineWidth(0.5).circle(wx + WW / 2, wy + WH / 2, 6).stroke()
    }
  })

  // ── Damage dots en zonas del cuerpo ─────────────────────────────────────────
  const dotPos: Record<string, [number, number]> = {
    "front_bumper": [cx,       fy + 10],
    "hood":         [cx,       fy + 46],
    "windshield_f": [cx,       fy + 88],
    "left":         [cx - 90,  midDoor],
    "right":        [cx + 90,  midDoor],
    "roof":         [cx,       cabinTop + (cabinBot - cabinTop) / 2],
    "windshield_r": [cx,       cabinBot + 18],
    "trunk":        [cx,       trunkTop + 30],
    "rear_bumper":  [cx,       ry - 10],
  }

  Object.entries(zones).forEach(([zone, color]) => {
    const p = dotPos[zone]; if (!p) return
    doc.fillColor("#ffffff").circle(p[0], p[1], 8).fill()
    doc.fillColor(color).circle(p[0], p[1], 6.5).fill()
    doc.strokeColor("#00000030").lineWidth(0.5).circle(p[0], p[1], 6.5).stroke()
  })

  doc.restore()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sectionBar(doc: PDFKit.PDFDocument, label: string, y: number, w = CW): number {
  doc.fillColor(C.brand).rect(ML, y, w, 13).fill()
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7).text(label, ML + 7, y + 3)
  return y + 16
}

function miniHeader(doc: PDFKit.PDFDocument, title: string, sub: string, logoBuf: Buffer | null) {
  doc.fillColor(C.hdrBg).rect(0, 0, PW, 30).fill()
  doc.fillColor(C.hdrLine).rect(0, 30, PW, 3).fill()
  if (logoBuf) {
    try { doc.image(logoBuf, ML, 4, { height: 22, fit: [80, 22] }) } catch { }
  }
  doc.fillColor(C.hdrText).font("Helvetica-Bold").fontSize(9).text(title, 110, 7, { width: 370, align: "center" })
  doc.fillColor(C.hdrSub).font("Helvetica").fontSize(6.5).text(sub, 110, 19, { width: 370, align: "center" })
}

function pgFooter(doc: PDFKit.PDFDocument, company: string, pg: number) {
  doc.fillColor(C.brand).rect(0, PH - 18, PW, 18).fill()
  doc.fillColor("#64748b").font("Helvetica").fontSize(6)
    .text(`${company} · Sistema de Inspección Vehicular`, ML, PH - 11, { width: 340 })
    .text(`Página ${pg}`, ML, PH - 11, { width: CW, align: "right" })
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

  const cfg: Record<string, string> = {}
  settingsRows?.forEach(r => { cfg[r.key] = r.value ?? "" })

  const company    = cfg.company_name    || "AAEA Inspecciones"
  const compPhone  = cfg.company_phone   || ""
  const compEmail  = cfg.company_email   || ""
  const compAddr   = cfg.company_address || ""
  const compRut    = cfg.company_rut     || ""
  const logoUrl    = cfg.company_logo_url || ""

  const { data: rawItems } = await supabase
    .from("inspection_items").select("*").eq("inspection_id", id).order("section").order("sort_order")
  const items = rawItems ?? []
  const zones = calcZones(items)
  const v   = ins.vehicles ?? {}
  const cl  = ins.clients  ?? {}

  const badItems  = items.filter(i => isBad(i.estado))
  const warnItems = items.filter(i => isWarn(i.estado))
  const defects   = [...badItems, ...warnItems]

  // QR
  let qrBuf: Buffer | null = null
  const pubUrl = ins.public_token ? `${baseUrl}/p/${ins.public_token}` : null
  if (pubUrl) {
    try { qrBuf = await QRCode.toBuffer(pubUrl, { type: "png", width: 90, margin: 1, color: { dark: C.navy, light: "#ffffff" } }) as Buffer }
    catch { }
  }

  // Logo
  let logoBuf: Buffer | null = null
  if (logoUrl && !logoUrl.endsWith(".svg")) {
    try { const r = await fetch(logoUrl); if (r.ok) logoBuf = Buffer.from(await r.arrayBuffer()) }
    catch { }
  }

  // Photos
  const photos: Buffer[] = []
  for (const u of (ins.photos ?? []) as string[]) {
    try { const r = await fetch(u); if (r.ok) photos.push(Buffer.from(await r.arrayBuffer())) } catch { }
  }

  const doc = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))

  await new Promise<void>(resolve => {
    doc.on("end", resolve)

    // ════════════════════════════════════════════════════════════════════════════
    // PÁGINA 1 — RESUMEN EJECUTIVO
    // ════════════════════════════════════════════════════════════════════════════

    // ── Header — fondo celeste claro, texto negro ─────────────────────────────
    doc.fillColor(C.hdrBg).rect(0, 0, PW, 78).fill()
    doc.fillColor(C.hdrLine).rect(0, 78, PW, 3).fill()
    // Thin decorative left bar
    doc.fillColor(C.accent).rect(0, 0, 4, 78).fill()

    // Logo (fondo claro, logo visible)
    if (logoBuf) {
      try { doc.image(logoBuf, ML + 4, 8, { height: 60, fit: [148, 60] }) }
      catch { doc.fillColor(C.hdrText).font("Helvetica-Bold").fontSize(12).text(company, ML + 4, 14) }
    } else {
      doc.fillColor(C.hdrText).font("Helvetica-Bold").fontSize(12).text(company, ML + 4, 12)
      const infoY = 28
      if (compRut)   doc.fillColor(C.hdrSub).font("Helvetica").fontSize(7).text(`RUT: ${compRut}`, ML + 4, infoY)
      if (compPhone) doc.fillColor(C.hdrSub).font("Helvetica").fontSize(7).text(`Tel: ${compPhone}`, ML + 4, infoY + 10)
      if (compEmail) doc.fillColor(C.hdrSub).font("Helvetica").fontSize(7).text(compEmail, ML + 4, infoY + 20)
      if (compAddr)  doc.fillColor(C.hdrSub).font("Helvetica").fontSize(6.5).text(compAddr, ML + 4, infoY + 30, { width: 160 })
    }

    // Title block (centro)
    doc.fillColor(C.hdrText).font("Helvetica-Bold").fontSize(15)
      .text("INFORME DE INSPECCIÓN VEHICULAR", 168, 8, { width: 256, align: "center" })
    doc.fillColor(C.hdrSub).font("Helvetica").fontSize(8)
      .text(`Fecha: ${fmtDate(ins.fecha_inspeccion)}`, 168, 38, { width: 256, align: "center" })
    doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(8.5)
      .text(`Inspector: ${ins.profiles?.full_name ?? "—"}`, 168, 48, { width: 256, align: "center" })
    doc.fillColor(C.hdrSub).font("Helvetica").fontSize(6.5)
      .text(`N° ${id.slice(0, 8).toUpperCase()}`, 168, 60, { width: 256, align: "center" })
    doc.fillColor(C.hdrSub).font("Helvetica").fontSize(6)
      .text(`Patente: ${v.patente ?? "—"}  ·  ${v.marca ?? ""} ${v.modelo ?? ""}`, 168, 69, { width: 256, align: "center" })

    // QR (fondo blanco para que se lea el QR oscuro sobre fondo celeste)
    if (qrBuf) {
      try {
        doc.fillColor(C.white).roundedRect(PW - 82, 4, 72, 72, 4).fill()
        doc.image(qrBuf, PW - 80, 6, { width: 62, height: 62 })
        doc.fillColor(C.hdrSub).font("Helvetica").fontSize(5.5)
          .text("Ver online", PW - 82, 70, { width: 72, align: "center" })
      } catch { }
    }

    let y = 86

    // ── Datos vehículo ────────────────────────────────────────────────────────
    y = sectionBar(doc, "DATOS DEL VEHÍCULO", y)
    const vFields: [string, string][] = [
      ["Patente",     v.patente     ?? "—"], ["Marca",       v.marca       ?? "—"],
      ["Modelo",      v.modelo      ?? "—"], ["Año",         v.anio ? String(v.anio) : "—"],
      ["Color",       v.color       ?? "—"], ["Kilometraje", ins.kilometraje ? `${Number(ins.kilometraje).toLocaleString("es-CL")} km` : "—"],
      ["Combustible", v.combustible ?? "—"], ["Transmisión", v.transmision ?? "—"],
      ["Tipo",        v.tipo_vehiculo ?? "—"], ["Tracción",  v.traccion    ?? "—"],
      ["N° Chasis",   v.vin         ?? "—"], ["N° Motor",   v.num_motor   ?? "—"],
    ]
    const VCols = 4, vColW = CW / VCols, vRowH = 22
    vFields.forEach(([label, val], i) => {
      const col = i % VCols, row = Math.floor(i / VCols)
      const fx = ML + col * vColW, fy2 = y + row * vRowH
      if (row % 2 === 0) doc.fillColor("#f1f5f9").rect(fx, fy2 - 1, vColW, vRowH).fill()
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(label, fx + 5, fy2 + 2)
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(8.5).text(val, fx + 5, fy2 + 11, { width: vColW - 8 })
    })
    y += Math.ceil(vFields.length / VCols) * vRowH + 5

    // ── Datos cliente ─────────────────────────────────────────────────────────
    y = sectionBar(doc, "DATOS DEL CLIENTE", y)
    const cFields: [string, string][] = [
      ["Nombre", cl.full_name ?? "—"], ["RUT", cl.rut ?? "—"],
      ["Teléfono", cl.phone ?? "—"],   ["Email", cl.email ?? "—"],
    ]
    const cColW = CW / cFields.length
    cFields.forEach(([label, val], i) => {
      const fx = ML + i * cColW
      if (i % 2 === 0) doc.fillColor("#f8fafc").rect(fx, y - 1, cColW, 22).fill()
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(label, fx + 5, y + 1)
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(8).text(val, fx + 5, y + 10, { width: cColW - 8 })
    })
    y += 22

    // Documents strip
    if (v.soap_estado || v.rev_tecnica_estado || v.permiso_circulacion) {
      doc.fillColor("#fef9c3").rect(ML, y, CW, 19).fill()
      doc.strokeColor("#fde68a").lineWidth(0.5).rect(ML, y, CW, 19).stroke()
      const dFields: [string, string][] = [
        ["SOAP", v.soap_estado ?? "—"], ["Rev. Técnica", v.rev_tecnica_estado ?? "—"],
        ["Perm. Circulación", v.permiso_circulacion ?? "—"], ["Multas", v.multas ?? "$0"],
      ]
      const dColW = CW / dFields.length
      dFields.forEach(([label, val], i) => {
        const fx = ML + i * dColW
        doc.fillColor("#92400e").font("Helvetica").fontSize(6).text(label, fx + 5, y + 2)
        doc.fillColor("#78350f").font("Helvetica-Bold").fontSize(7).text(val, fx + 5, y + 10)
      })
      y += 21
    }

    y += 4

    // ── Resultado — score boxes centrados, Nota Final diferenciada ────────────
    y = sectionBar(doc, "RESULTADO DE LA INSPECCIÓN", y)

    const SH_BIG = 72   // alto caja nota final
    const SH_SM  = 56   // alto cajas sub-notas
    const BW     = 98   // ancho nota final
    const SW     = 60   // ancho sub-notas
    const SGAP   = 10
    // Centrar horizontalmente: total = BW + 3*SW + 3*SGAP
    const totalScoreW = BW + 3 * SW + 3 * SGAP
    let sx = ML + Math.round((CW - totalScoreW) / 2)
    const scoreBaseY = y + 4  // margen superior

    const scores = [
      { label: "Visual",      nota: ins.nota_visual,     big: false },
      { label: "Carrocería",  nota: ins.nota_carroceria, big: false },
      { label: "Mecánica",    nota: ins.nota_mecanica,   big: false },
      { label: "NOTA FINAL",  nota: ins.nota_final,      big: true  },
    ]

    scores.forEach(s => {
      const nota  = s.nota ?? 0
      const bw    = s.big ? BW : SW
      const bh    = s.big ? SH_BIG : SH_SM
      // Para Nota Final: fondo diferenciado siempre con borde oscuro
      const col    = nota >= 6.5 ? "#166534" : nota >= 5 ? "#92400e" : "#991b1b"
      const colLt  = nota >= 6.5 ? "#f0fdf4" : nota >= 5 ? "#fffbeb" : "#fff1f2"
      const colMid = nota >= 6.5 ? "#22c55e" : nota >= 5 ? "#f59e0b" : "#ef4444"
      // Nota final: banner color del rating más borde grueso
      const sy = s.big ? scoreBaseY : scoreBaseY + (SH_BIG - SH_SM) / 2  // centrar verticalmente con el grande

      if (s.big) {
        // Caja grande con borde de 2px y estilo destacado
        doc.fillColor(col).roundedRect(sx - 1, sy - 1, bw + 2, bh + 2, 7).fill()
        doc.fillColor(colLt).roundedRect(sx + 1, sy + 1, bw - 2, bh - 2, 6).fill()
      } else {
        doc.fillColor(colLt).roundedRect(sx, sy, bw, bh, 5).fill()
        doc.strokeColor(col).lineWidth(0.8).roundedRect(sx, sy, bw, bh, 5).stroke()
      }

      // Banda superior de color
      const stripeH = s.big ? 26 : 20
      doc.fillColor(col).roundedRect(sx, sy, bw, stripeH, s.big ? 6 : 5).fill()
      doc.fillColor(col).rect(sx, sy + stripeH - 8, bw, 8).fill()

      // Nota (número)
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(s.big ? 22 : 16)
        .text(nota ? nota.toFixed(1) : "—", sx, sy + (s.big ? 2 : 1), { width: bw, align: "center" })
      doc.fillColor("#ffffff99").font("Helvetica").fontSize(s.big ? 6 : 5.5)
        .text("/7.0", sx, sy + (s.big ? 18 : 14), { width: bw, align: "center" })

      // Porcentaje — centrado en el espacio entre la banda y la barra de progreso
      const barY2  = sy + bh - (s.big ? 13 : 11)
      const pctH   = s.big ? 14 : 10   // altura aproximada del texto en pts
      const pctY   = Math.round(sy + stripeH + (barY2 - sy - stripeH - pctH) / 2)
      doc.fillColor(col).font("Helvetica-Bold").fontSize(s.big ? 19 : 13)
        .text(`${Math.round((nota / 7) * 100)}%`, sx, pctY, { width: bw, align: "center" })

      // Barra de progreso
      const bx = sx + 6, bbarW = bw - 12
      doc.fillColor("#0000001a").roundedRect(bx, barY2, bbarW, 4, 2).fill()
      doc.fillColor(colMid).roundedRect(bx, barY2, bbarW * Math.min(nota / 7, 1), 4, 2).fill()

      // Etiqueta
      doc.fillColor(col).font("Helvetica-Bold").fontSize(s.big ? 7 : 5.5)
        .text(s.label, sx, sy + bh - (s.big ? 7 : 5), { width: bw, align: "center" })

      sx += bw + SGAP
    })

    y += SH_BIG + 12

    // ── Ítems con observaciones (rojo=malo, amarillo=alerta, verde=correcto) ───
    if (defects.length > 0) {
      y = sectionBar(doc, `ÍTEMS CON OBSERVACIONES  (${defects.length})`, y)
      const DMAX = 22
      const limit = Math.min(defects.length, DMAX)
      const half  = Math.ceil(limit / 2)
      const defRH = 10
      const defBoxH = Math.ceil(limit / 2) * defRH + 6

      doc.fillColor("#f8fafc").rect(ML, y, CW, defBoxH).fill()
      doc.strokeColor(C.border).lineWidth(0.5).rect(ML, y, CW, defBoxH).stroke()

      const colDefW = CW / 2 - 10
      for (let i = 0; i < limit; i++) {
        const itm = defects[i]
        const right = i >= half
        const ix = ML + (right ? CW / 2 + 6 : 5)
        const iy = y + (right ? i - half : i) * defRH + 3
        const ec = estadoColor(itm.estado)  // verde/amarillo/rojo según estado
        // Punto siempre coloreado
        doc.fillColor("#ffffff").circle(ix + 5, iy + 5, 3.5).fill()
        doc.fillColor(ec).circle(ix + 5, iy + 5, 3).fill()
        doc.fillColor(C.text).font("Helvetica").fontSize(6.5)
          .text(itm.item_label, ix + 12, iy + 1, { width: colDefW - 62 })
        doc.fillColor(ec).font("Helvetica-Bold").fontSize(6.5)
          .text(itm.estado, ix + colDefW - 52, iy + 1, { width: 52, align: "right" })
      }
      if (defects.length > DMAX) {
        doc.fillColor(C.muted).font("Helvetica").fontSize(6)
          .text(`... y ${defects.length - DMAX} más → ver tabla completa pág. 2`, ML + 5, y + defBoxH - 7)
      }
      y += defBoxH + 4
    }

    // ── Firmas — ANCLADAS AL PIE DE LA PÁGINA ────────────────────────────────
    const SIG_TOP = PH - 118  // siempre al pie (724pt)

    // ── Observaciones inspector — ancladas justo encima de las firmas ─────────
    if (ins.comentarios) {
      const obsLines = (ins.comentarios.match(/\n/g) || []).length + 1
      const obsH = Math.min(Math.max(obsLines * 10, 28), 64)
      const barY  = SIG_TOP - 12 - obsH - 16
      const obsY  = barY + 16
      doc.fillColor(C.brand).rect(ML, barY, CW, 13).fill()
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7)
        .text("OBSERVACIONES DEL INSPECTOR", ML + 7, barY + 3)
      doc.fillColor("#f0fdf4").rect(ML, obsY, CW, obsH).fill()
      doc.strokeColor("#86efac").lineWidth(0.5).rect(ML, obsY, CW, obsH).stroke()
      doc.fillColor(C.text).font("Helvetica").fontSize(7.5)
        .text(ins.comentarios, ML + 8, obsY + 5, { width: CW - 16, lineGap: 2, height: obsH - 8, ellipsis: true })
    }

    const notaFinal = ins.nota_final ?? 0
    const verdict = notaFinal >= 6.5 ? "APROBADO" : notaFinal >= 5 ? "CONDICIONADO" : "RECHAZADO"
    const verdictBg = notaFinal >= 6.5 ? "#166534" : notaFinal >= 5 ? "#92400e" : "#991b1b"

    // Separator line
    doc.fillColor(C.mid).rect(ML, SIG_TOP - 6, CW, 0.8).fill()

    // Verdict
    doc.fillColor(verdictBg).roundedRect(ML, SIG_TOP, 170, 22, 4).fill()
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(12)
      .text(verdict, ML, SIG_TOP + 5, { width: 170, align: "center" })

    // Date + Place
    doc.fillColor(C.muted).font("Helvetica").fontSize(7)
      .text(`Fecha: ${fmtDate(ins.fecha_inspeccion)}`, ML + 180, SIG_TOP + 4)
      .text("Lugar: _____________________________________________", ML + 180, SIG_TOP + 15)

    // Sig lines
    const sl = SIG_TOP + 52
    doc.fillColor(C.border).rect(ML, sl, 175, 0.8).fill()
    doc.fillColor(C.text).font("Helvetica-Bold").fontSize(7.5)
      .text(ins.profiles?.full_name ?? "Inspector", ML, sl + 4, { width: 175, align: "center" })
    doc.fillColor(C.muted).font("Helvetica").fontSize(6.5)
      .text("Firma y nombre del Inspector", ML, sl + 14, { width: 175, align: "center" })

    doc.fillColor(C.border).rect(ML + 355, sl, 175, 0.8).fill()
    doc.fillColor(C.muted).font("Helvetica").fontSize(7)
      .text("_____________________________", ML + 355, sl + 4, { width: 175, align: "center" })
    doc.fillColor(C.muted).font("Helvetica").fontSize(6.5)
      .text("Nombre y Firma del Cliente", ML + 355, sl + 14, { width: 175, align: "center" })

    pgFooter(doc, company, 1)

    // ════════════════════════════════════════════════════════════════════════════
    // PÁGINA 2+ — TABLA DETALLE EN 2 COLUMNAS
    // ════════════════════════════════════════════════════════════════════════════
    doc.addPage({ margin: 0, size: "A4" })

    miniHeader(doc, "DETALLE COMPLETO DE INSPECCIÓN",
      `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""} ${v.anio ?? ""}  ·  Cliente: ${cl.full_name ?? ""}`,
      logoBuf)

    // 2-column layout
    const COL_W  = (CW - 6) / 2    // ≈ 266
    const COL2_X = ML + COL_W + 6

    function colHeader(yy: number) {
      // Left col
      doc.fillColor(C.accent).rect(ML, yy, COL_W, 11).fill()
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(6)
        .text("ÍTEM", ML + 4, yy + 2.5, { width: 178 })
        .text("ESTADO", ML + 184, yy + 2.5, { width: 78, align: "center" })
      // Right col
      doc.fillColor(C.accent).rect(COL2_X, yy, COL_W, 11).fill()
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(6)
        .text("ÍTEM", COL2_X + 4, yy + 2.5, { width: 178 })
        .text("ESTADO", COL2_X + 184, yy + 2.5, { width: 78, align: "center" })
    }

    y = 34
    colHeader(y)
    y += 13

    let pgNum = 2
    let curSec = 0, curSub = ""

    // Group items by section+subsection
    type ItemGroup = { sec: number; sub: string; items: any[] }
    const groups: ItemGroup[] = []
    let curGrp: ItemGroup | null = null
    items.forEach(item => {
      if (!curGrp || curGrp.sec !== item.section || curGrp.sub !== item.subsection) {
        curGrp = { sec: item.section, sub: item.subsection, items: [] }
        groups.push(curGrp)
      }
      curGrp.items.push(item)
    })

    const secNames: Record<number, string> = {
      1: "1.  INSPECCIÓN VISUAL",
      2: "2.  INSPECCIÓN DE CARROCERÍA",
      3: "3.  INSPECCIÓN MECÁNICA",
    }

    function ensureSpace(need: number) {
      if (y + need > PH - 22) {
        pgFooter(doc, company, pgNum)
        doc.addPage({ margin: 0, size: "A4" })
        pgNum++
        miniHeader(doc, "DETALLE COMPLETO (cont.)",
          `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""}`, logoBuf)
        y = 34
        colHeader(y)
        y += 13
        curSec = 0; curSub = ""
      }
    }

    groups.forEach(grp => {
      // Section header (full width)
      if (grp.sec !== curSec) {
        ensureSpace(14)
        curSec = grp.sec; curSub = ""
        doc.fillColor(C.brand).rect(ML, y, CW, 13).fill()
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7.5)
          .text(secNames[grp.sec] ?? "", ML + 6, y + 3)
        y += 14
      }

      // Subsection header (full width)
      ensureSpace(12)
      curSub = grp.sub
      doc.fillColor("#dde4ee").rect(ML, y, CW, 10).fill()
      doc.fillColor(C.brand).font("Helvetica-Bold").fontSize(6.5)
        .text(grp.sub.replace(/^\d+\.\d+\s*/, ""), ML + 6, y + 2)
      y += 11

      // Items 2 per row
      for (let i = 0; i < grp.items.length; i += 2) {
        const i1 = grp.items[i]
        const i2 = grp.items[i + 1] as any | undefined
        const hasObs = !!i1.observaciones || (i2 && !!i2.observaciones)
        const rowH2  = hasObs ? 13 : 8   // reducido para caber en página 2

        ensureSpace(rowH2)

        // Alternating row bg (spans full width)
        if ((i / 2) % 2 === 0) doc.fillColor("#f8fafc").rect(ML, y, CW, rowH2).fill()

        // Render item — siempre muestra punto de color (verde/rojo/amarillo)
        function renderItem(item: any, rx: number) {
          const ec       = estadoColor(item.estado)
          const isIssue  = isBad(item.estado) || isWarn(item.estado)
          // Punto de color siempre visible
          doc.fillColor("#ffffff").circle(rx + 5, y + rowH2 / 2, 3).fill()
          doc.fillColor(ec).circle(rx + 5, y + rowH2 / 2, 2.5).fill()
          doc.fillColor(C.text).font("Helvetica").fontSize(6)
            .text(item.item_label, rx + 11, y + (hasObs ? 2 : 1), { width: 168 })
          doc.fillColor(ec).font(isIssue ? "Helvetica-Bold" : "Helvetica").fontSize(6)
            .text(item.estado, rx + 180, y + (hasObs ? 2 : 1), { width: 82, align: "center" })
          if (item.observaciones) {
            doc.fillColor(C.muted).font("Helvetica").fontSize(5)
              .text(`↳ ${item.observaciones}`, rx + 11, y + 8, { width: COL_W - 14 })
          }
        }

        renderItem(i1, ML)
        if (i2) renderItem(i2, COL2_X)

        // Divider line (light, between items)
        doc.strokeColor("#e5eaf0").lineWidth(0.3)
          .moveTo(ML, y + rowH2).lineTo(ML + CW, y + rowH2).stroke()
        // Vertical divider between columns
        doc.strokeColor(C.border).lineWidth(0.5)
          .moveTo(COL2_X - 3, y).lineTo(COL2_X - 3, y + rowH2).stroke()

        y += rowH2
      }
    })

    // ── Fotos ─────────────────────────────────────────────────────────────────
    if (photos.length > 0) {
      pgFooter(doc, company, pgNum)
      doc.addPage({ margin: 0, size: "A4" })
      pgNum++
      miniHeader(doc, "FOTOGRAFÍAS DEL VEHÍCULO",
        `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""}`, logoBuf)

      y = 38
      const IW = 170, IH = 128, IGAP = 6
      let col2 = 0
      for (let pi = 0; pi < photos.length; pi++) {
        if (y + IH > PH - 22) {
          pgFooter(doc, company, pgNum)
          doc.addPage({ margin: 0, size: "A4" })
          pgNum++
          miniHeader(doc, "FOTOGRAFÍAS (cont.)", `${v.patente ?? ""}`, logoBuf)
          y = 38; col2 = 0
        }
        const px = ML + col2 * (IW + IGAP)
        try { doc.image(photos[pi], px, y, { width: IW, height: IH }) }
        catch {
          doc.fillColor(C.light).rect(px, y, IW, IH).fill()
          doc.fillColor(C.muted).font("Helvetica").fontSize(8)
            .text("Sin imagen", px, y + IH / 2 - 5, { width: IW, align: "center" })
        }
        doc.strokeColor(C.border).lineWidth(0.8).rect(px, y, IW, IH).stroke()
        doc.fillColor(C.muted).font("Helvetica").fontSize(6)
          .text(`Foto ${pi + 1}`, px, y + IH + 2, { width: IW, align: "center" })
        col2++
        if (col2 === 3) { col2 = 0; y += IH + 18 }
      }
    }

    pgFooter(doc, company, pgNum)

    // ════════════════════════════════════════════════════════════════════════════
    // ÚLTIMA PÁGINA — DIAGRAMA DEL VEHÍCULO
    // ════════════════════════════════════════════════════════════════════════════
    pgNum++
    doc.addPage({ margin: 0, size: "A4" })

    miniHeader(doc, "DIAGRAMA DEL VEHÍCULO — PUNTOS DE OBSERVACIÓN",
      `${v.patente ?? ""} · ${v.marca ?? ""} ${v.modelo ?? ""} ${v.anio ?? ""}  ·  Inspector: ${ins.profiles?.full_name ?? ""}`,
      logoBuf)

    // Car illustration (centered)
    drawCarBlueprint(doc, PW / 2, PH / 2 - 10, zones)

    // Zone label panel (right side)
    const legendX = PW - 145
    let legendY = 80

    doc.fillColor(C.brand).rect(legendX, legendY, 114, 13).fill()
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(7).text("ZONAS DEL VEHÍCULO", legendX + 5, legendY + 3)
    legendY += 16

    const allZones: [string, string][] = [
      ["Parachoques delantero", "front_bumper"],
      ["Capot / Máscara",       "hood"],
      ["Parabrisas delantero",  "windshield_f"],
      ["Lado izquierdo",        "left"],
      ["Techo / Cabina",        "roof"],
      ["Lado derecho",          "right"],
      ["Parabrisas trasero",    "windshield_r"],
      ["Maletero / Portón",     "trunk"],
      ["Parachoques trasero",   "rear_bumper"],
      ["Neumático del. izq.",   "wheel_fl"],
      ["Neumático del. der.",   "wheel_fr"],
      ["Neumático tra. izq.",   "wheel_rl"],
      ["Neumático tra. der.",   "wheel_rr"],
    ]

    // Solo mostrar zonas con daño o advertencia (omitir las OK)
    const damagedZones = allZones.filter(([, zk]) => !!zones[zk])

    if (damagedZones.length === 0) {
      // Si no hay daños, mostrar mensaje positivo
      doc.fillColor("#f0fdf4").roundedRect(legendX, legendY, 114, 36, 4).fill()
      doc.strokeColor("#86efac").lineWidth(0.5).roundedRect(legendX, legendY, 114, 36, 4).stroke()
      doc.fillColor(C.good).font("Helvetica-Bold").fontSize(7)
        .text("SIN DAÑOS", legendX, legendY + 6, { width: 114, align: "center" })
      doc.fillColor(C.good).font("Helvetica").fontSize(6)
        .text("Todas las zonas en buen estado", legendX + 4, legendY + 18, { width: 106, align: "center" })
      legendY += 40
    } else {
      damagedZones.forEach(([label, zk], idx) => {
        const zc = zones[zk]!
        doc.fillColor(idx % 2 === 0 ? "#fff7ed" : "#fef9f5").rect(legendX, legendY, 114, 16).fill()
        doc.fillColor("#ffffff").circle(legendX + 9, legendY + 8, 5.5).fill()
        doc.fillColor(zc).circle(legendX + 9, legendY + 8, 4.5).fill()
        doc.fillColor(C.text).font("Helvetica-Bold").fontSize(6.5)
          .text(label, legendX + 18, legendY + 2, { width: 90 })
        doc.fillColor(zc).font("Helvetica-Bold").fontSize(5.5)
          .text(zc === C.bad ? "CON DAÑO" : "ADVERTENCIA", legendX + 18, legendY + 9, { width: 90 })
        doc.strokeColor(C.mid).lineWidth(0.3)
          .moveTo(legendX, legendY + 16).lineTo(legendX + 114, legendY + 16).stroke()
        legendY += 16
      })
    }

    // Legend box at bottom
    legendY += 8
    doc.fillColor(C.light).roundedRect(legendX, legendY, 114, 44, 4).fill()
    doc.strokeColor(C.border).lineWidth(0.5).roundedRect(legendX, legendY, 114, 44, 4).stroke()
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(6.5).text("SIMBOLOGÍA", legendX + 5, legendY + 4)

    const syms = [
      [C.bad,  "Con daño (rojo)"],
      [C.warn, "Advertencia (naranjo)"],
      ["#9ca3af", "Sin observaciones"],
    ] as [string, string][]

    syms.forEach(([col, lbl], si) => {
      const sy = legendY + 14 + si * 10
      doc.fillColor("#ffffff").circle(legendX + 10, sy + 4, 6).fill()
      doc.fillColor(col).circle(legendX + 10, sy + 4, 5).fill()
      doc.strokeColor("#00000020").lineWidth(0.5).circle(legendX + 10, sy + 4, 5).stroke()
      doc.fillColor(C.text).font("Helvetica").fontSize(6.5).text(lbl, legendX + 20, sy + 1)
    })

    pgFooter(doc, company, pgNum)
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
