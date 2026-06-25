import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { items, vehiculo, cliente } = await req.json()
  if (!items?.length) return NextResponse.json({ error: "items requerido" }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 })

  const itemsList = items
    .filter((i: any) => i.descripcion?.trim())
    .map((i: any) => `• ${i.descripcion}${i.notas ? ` (${i.notas})` : ""}`)
    .join("\n")

  if (!itemsList) return NextResponse.json({ error: "No hay ítems con descripción" }, { status: 400 })

  const prompt = `Eres un mecánico automotriz profesional chileno. Genera una descripción de servicio para una cotización/presupuesto vehicular.

DATOS:
- Vehículo: ${vehiculo?.marca ?? ""} ${vehiculo?.modelo ?? ""} ${vehiculo?.anio ?? ""} (${vehiculo?.patente ?? ""})
- Cliente: ${cliente ?? ""}

TRABAJOS A REALIZAR:
${itemsList}

INSTRUCCIONES:
- Escribe UNA descripción fluida del servicio en 2-3 oraciones (máximo 80 palabras).
- Menciona los trabajos principales a realizar de forma natural.
- Usa lenguaje técnico pero comprensible para el cliente.
- No hagas listas, solo prosa fluida.
- No uses formato markdown.
- Finaliza con el beneficio o propósito del trabajo.
- Escribe en tercera persona (ej: "Se realizará...")

Solo escribe la descripción del servicio, nada más.`

  try {
    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    return NextResponse.json({ description: text })
  } catch (err: any) {
    return NextResponse.json({ error: `Error Gemini: ${err?.message}` }, { status: 500 })
  }
}
