import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { inspectionId } = await req.json()
  if (!inspectionId) return NextResponse.json({ error: "inspectionId requerido" }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 })

  // Obtener datos de la inspección
  const { data: inspection } = await supabase
    .from("inspections")
    .select(`
      kilometraje, fecha_inspeccion, nota_visual, nota_carroceria, nota_mecanica, nota_final, comentarios,
      vehicles(patente, marca, modelo, anio, version),
      clients(full_name)
    `)
    .eq("id", inspectionId)
    .single()

  if (!inspection) return NextResponse.json({ error: "Inspección no encontrada" }, { status: 404 })

  const { data: items } = await supabase
    .from("inspection_items")
    .select("section, subsection, item_label, estado, observaciones")
    .eq("inspection_id", inspectionId)
    .neq("estado", "N/A")
    .order("section")
    .order("sort_order")

  // Filtrar solo ítems con problemas relevantes
  const problemas = (items ?? []).filter(i =>
    i.estado && !["Bueno", "Buen estado", "N/A", ""].includes(i.estado)
  )
  const buenos = (items ?? []).filter(i =>
    i.estado && ["Bueno", "Buen estado"].includes(i.estado)
  )

  const v = (inspection as any).vehicles
  const c = (inspection as any).clients

  const prompt = `Eres un inspector técnico automotriz profesional chileno. Genera un resumen de inspección vehicular claro y profesional en español, redactado para el cliente propietario del vehículo.

DATOS DEL VEHÍCULO:
- Patente: ${v?.patente ?? "S/I"}
- Vehículo: ${v?.marca ?? ""} ${v?.modelo ?? ""} ${v?.anio ?? ""} ${v?.version ?? ""}
- Kilometraje: ${inspection.kilometraje ? `${inspection.kilometraje.toLocaleString("es-CL")} km` : "S/I"}
- Fecha inspección: ${inspection.fecha_inspeccion ?? "S/I"}
- Cliente: ${c?.full_name ?? "S/I"}

NOTAS DE INSPECCIÓN:
- Visual: ${inspection.nota_visual ?? "--"}/7.0
- Carrocería: ${inspection.nota_carroceria ?? "--"}/7.0
- Mecánica: ${inspection.nota_mecanica ?? "--"}/7.0
- NOTA FINAL: ${inspection.nota_final ?? "--"}/7.0

ÍTEMS CON OBSERVACIONES (${problemas.length} problemas detectados):
${problemas.slice(0, 30).map(i => `• ${i.item_label} (${i.subsection}): ${i.estado}${i.observaciones ? ` — ${i.observaciones}` : ""}`).join("\n")}

ÍTEMS EN BUEN ESTADO: ${buenos.length} ítems sin observaciones.

${inspection.comentarios ? `COMENTARIOS DEL INSPECTOR: ${inspection.comentarios}` : ""}

INSTRUCCIONES:
- Escribe 3 párrafos: (1) Estado general del vehículo, (2) Puntos que requieren atención o reparación, (3) Recomendaciones y conclusión.
- Usa lenguaje técnico pero comprensible.
- Sé específico con los problemas encontrados.
- Máximo 250 palabras en total.
- No uses formato markdown (sin asteriscos ni encabezados).
- Escribe en primera persona como el inspector.`

  try {
    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    return NextResponse.json({ summary: text })
  } catch (err: any) {
    return NextResponse.json({ error: `Error Gemini: ${err?.message}` }, { status: 500 })
  }
}
