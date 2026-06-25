import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY no configurado" }, { status: 500 })

  const { vehicle, items, notaVisual, notaCarroceria, notaMecanica, notaFinal, comentarios, style = "estandar" } = await req.json()

  // Resumir los ítems con problemas
  const problemas: string[] = []
  if (items) {
    for (const [key, val] of Object.entries(items as Record<string, { estado: string; observaciones: string }>)) {
      const { estado, observaciones } = val
      const isBad = ["Con Daño", "Malo", "Anormal", "No Funciona", "Bajo nivel", "Encendido"].includes(estado)
      const isWarn = ["Regular"].includes(estado)
      if (isBad || isWarn) problemas.push(`• ${key.replace(/_/g, " ")}: ${estado}${observaciones ? ` (${observaciones})` : ""}`)
    }
  }

  const vehicleDesc = [vehicle?.marca, vehicle?.modelo, vehicle?.anio, vehicle?.patente].filter(Boolean).join(" ")
  const notasStr = `Visual ${notaVisual?.toFixed(1) ?? "N/A"}/7.0 · Carrocería ${notaCarroceria?.toFixed(1) ?? "N/A"}/7.0 · Mecánica ${notaMecanica?.toFixed(1) ?? "N/A"}/7.0 · Final ${notaFinal?.toFixed(1) ?? "N/A"}/7.0`
  const problemasStr = problemas.length > 0 ? `Ítems con problemas:\n${problemas.slice(0, 15).join("\n")}` : "No se detectaron problemas relevantes."
  const obsExistentes = comentarios?.trim() ? `Observaciones actuales: "${comentarios}"\n` : ""

  const base = `Vehículo: ${vehicleDesc || "sin datos"}
Notas: ${notasStr}
${obsExistentes}${problemasStr}`

  const prompts: Record<string, string> = {
    compacto: `Eres un inspector de vehículos profesional chileno. Redacta observaciones finales MUY BREVES para una inspección vehicular.

${base}

INSTRUCCIONES:
- Máximo 2-3 oraciones (50-70 palabras).
- Primera: estado general y nota.
- Segunda: problema principal si hay.
- Tercera: veredicto (apto/condicionado/no apto).
- Sin títulos ni formato. Solo el texto.`,

    estandar: `Eres un inspector de vehículos profesional chileno. Redacta observaciones finales profesionales para una inspección vehicular.

${base}

INSTRUCCIONES:
- 3-4 oraciones (~100 palabras).
- Menciona los problemas principales encontrados.
- Concluye con recomendación general.
- Tono técnico pero comprensible.
- Sin títulos ni formato extra. Solo el texto.`,

    detallado: `Eres un inspector de vehículos profesional chileno. Redacta un informe de observaciones finales DETALLADO para una inspección vehicular.

${base}

INSTRUCCIONES:
- Escribe 3 párrafos: (1) Estado general y notas, (2) Problemas detectados y su importancia, (3) Recomendaciones y veredicto.
- Máximo 200 palabras.
- Tono técnico y profesional.
- Sin títulos ni formato markdown. Solo párrafos separados por salto de línea.`,
  }

  const prompt = prompts[style] ?? prompts.estandar

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
