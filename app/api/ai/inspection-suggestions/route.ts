import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY no configurado" }, { status: 500 })

  const { vehicle, items, notaVisual, notaCarroceria, notaMecanica, notaFinal, comentarios } = await req.json()

  // Resumir los ítems con problemas
  const problemas: string[] = []
  if (items) {
    for (const [key, val] of Object.entries(items as Record<string, { estado: string; observaciones: string }>)) {
      const { estado, observaciones } = val
      const isBad = ["Con Daño", "Malo", "Anormal", "No Funciona", "Bajo nivel", "Encendido"].includes(estado)
      const isWarn = ["Regular"].includes(estado)
      if (isBad) problemas.push(`• ${key.replace(/_/g, " ")}: ${estado}${observaciones ? ` (${observaciones})` : ""}`)
      else if (isWarn) problemas.push(`• ${key.replace(/_/g, " ")}: ${estado}${observaciones ? ` (${observaciones})` : ""}`)
    }
  }

  const vehicleDesc = [vehicle?.marca, vehicle?.modelo, vehicle?.anio, vehicle?.patente].filter(Boolean).join(" ")
  const observacionesExistentes = comentarios?.trim() ? `Observaciones actuales del inspector: "${comentarios}"\n` : ""

  const prompt = `Eres un inspector de vehículos profesional. Redacta unas observaciones finales concisas y profesionales para una inspección vehicular en español chileno.

Vehículo: ${vehicleDesc || "sin datos"}
Notas: Visual ${notaVisual?.toFixed(1) ?? "N/A"}/7.0 · Carrocería ${notaCarroceria?.toFixed(1) ?? "N/A"}/7.0 · Mecánica ${notaMecanica?.toFixed(1) ?? "N/A"}/7.0 · Final ${notaFinal?.toFixed(1) ?? "N/A"}/7.0
${observacionesExistentes}
${problemas.length > 0 ? `Ítems con problemas detectados:\n${problemas.slice(0, 10).join("\n")}` : "No se detectaron problemas relevantes."}

Instrucciones:
- Máximo 3-4 oraciones
- Menciona los problemas principales encontrados (si los hay)
- Concluye con una recomendación general (apto/no apto/condicionado)
- Tono técnico y profesional
- Solo devuelve el texto de las observaciones, sin títulos ni formato extra`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    return NextResponse.json({ text })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error IA" }, { status: 500 })
  }
}
