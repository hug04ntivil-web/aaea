import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { inspectionId, style = "estandar" } = await req.json()
  if (!inspectionId) return NextResponse.json({ error: "inspectionId requerido" }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 })

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

  const problemas = (items ?? []).filter(i =>
    i.estado && !["Bueno","Buen estado","N/A","","Presenta","Sin Daño","Normal","Funciona","A nivel","No Encendido","No Presenta"].includes(i.estado)
  )
  const buenos = (items ?? []).filter(i =>
    i.estado && ["Bueno","Buen estado","Presenta","Sin Daño","Normal","Funciona","A nivel","No Encendido","No Presenta"].includes(i.estado)
  )

  const v = (inspection as any).vehicles
  const c = (inspection as any).clients
  const notaFinal = inspection.nota_final ?? 0
  const veredicto = notaFinal >= 6.5 ? "APROBADO" : notaFinal >= 5 ? "CONDICIONADO" : "RECHAZADO"

  const datosBase = `DATOS DEL VEHÍCULO:
- Patente: ${v?.patente ?? "S/I"}
- Vehículo: ${v?.marca ?? ""} ${v?.modelo ?? ""} ${v?.anio ?? ""} ${v?.version ?? ""}
- Kilometraje: ${inspection.kilometraje ? `${inspection.kilometraje.toLocaleString("es-CL")} km` : "S/I"}
- Fecha inspección: ${inspection.fecha_inspeccion ?? "S/I"}
- Cliente: ${c?.full_name ?? "S/I"}

NOTAS DE INSPECCIÓN:
- Visual: ${inspection.nota_visual ?? "--"}/7.0
- Carrocería: ${inspection.nota_carroceria ?? "--"}/7.0
- Mecánica: ${inspection.nota_mecanica ?? "--"}/7.0
- NOTA FINAL: ${notaFinal}/7.0 — ${veredicto}

ÍTEMS CON PROBLEMAS (${problemas.length}):
${problemas.slice(0, 30).map(i => `• ${i.item_label} (${i.subsection}): ${i.estado}${i.observaciones ? ` — ${i.observaciones}` : ""}`).join("\n")}

ÍTEMS EN BUEN ESTADO: ${buenos.length} ítems sin observaciones.
${inspection.comentarios ? `\nCOMENTARIOS DEL INSPECTOR: ${inspection.comentarios}` : ""}`

  const prompts: Record<string, string> = {
    compacto: `Eres un inspector técnico automotriz profesional chileno. Genera un resumen MUY BREVE de inspección vehicular en español, dirigido al propietario del vehículo.

${datosBase}

INSTRUCCIONES:
- Escribe MÁXIMO 3 oraciones (50-80 palabras total).
- Primera oración: estado general y nota final.
- Segunda oración: principales problemas si los hay.
- Tercera oración: veredicto y recomendación inmediata.
- Lenguaje claro y directo.
- Sin formato markdown. Sin encabezados.`,

    estandar: `Eres un inspector técnico automotriz profesional chileno. Genera un resumen de inspección vehicular claro y profesional en español, redactado para el cliente propietario del vehículo.

${datosBase}

INSTRUCCIONES:
- Escribe 3 párrafos: (1) Estado general del vehículo, (2) Puntos que requieren atención o reparación, (3) Recomendaciones y conclusión.
- Usa lenguaje técnico pero comprensible.
- Sé específico con los problemas encontrados.
- Máximo 250 palabras en total.
- No uses formato markdown (sin asteriscos ni encabezados).
- Escribe en primera persona como el inspector.`,

    detallado: `Eres un inspector técnico automotriz profesional chileno. Genera un informe técnico DETALLADO de inspección vehicular en español, dirigido al propietario del vehículo.

${datosBase}

INSTRUCCIONES:
- Escribe un informe completo con las siguientes secciones, separadas por saltos de línea:
  1. RESUMEN EJECUTIVO: Estado general en 2-3 oraciones. Nota final y veredicto.
  2. INSPECCIÓN VISUAL: Describe el estado visual, documentos y equipamiento.
  3. CARROCERÍA: Describe daños, rayones, golpes o estado de la carrocería.
  4. MECÁNICA: Describe el estado mecánico, motor, suspensión, frenos, neumáticos.
  5. PROBLEMAS PRIORITARIOS: Lista numerada de los ${Math.min(problemas.length, 5)} problemas más importantes.
  6. RECOMENDACIONES: Qué debe hacer el propietario inmediatamente y a mediano plazo.
  7. CONCLUSIÓN: Veredicto final (aprobado/condicionado/rechazado) y resumen en 2 oraciones.
- Máximo 500 palabras.
- Lenguaje técnico pero comprensible para el cliente.
- Sin formato markdown (sin asteriscos ni #). Usa los títulos de sección en MAYÚSCULAS seguidos de dos puntos.`,
  }

  const prompt = prompts[style] ?? prompts.estandar

  try {
    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    return NextResponse.json({ summary: text, style })
  } catch (err: any) {
    return NextResponse.json({ error: `Error Gemini: ${err?.message}` }, { status: 500 })
  }
}
