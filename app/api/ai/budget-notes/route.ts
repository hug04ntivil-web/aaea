import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY no configurado" }, { status: 500 })

  const { items, vehiculo, descripcionServicio, formaPago, vigenciaDias, cliente, notasActuales } = await req.json()

  const trabajos = (items ?? []).map((i: any) => i.descripcion).filter(Boolean).join(", ")
  const vehicleDesc = [vehiculo?.marca, vehiculo?.modelo, vehiculo?.anio, vehiculo?.patente].filter(Boolean).join(" ")
  const notasExistentes = notasActuales?.trim() ? `Notas actuales: "${notasActuales}"\n` : ""

  const prompt = `Eres un experto en talleres mecánicos y servicios automotrices en Chile. Genera las "Notas / información adicional" de una cotización de servicio vehicular.

Datos del presupuesto:
- Vehículo: ${vehicleDesc || "no especificado"}
- Cliente: ${cliente || "no especificado"}
- Trabajos: ${trabajos || "varios servicios"}
- Descripción del servicio: ${descripcionServicio || ""}
- Forma de pago: ${formaPago || "Efectivo o Transferencia"}
- Vigencia: ${vigenciaDias || "30"} días
${notasExistentes}

Instrucciones para las notas:
- Máximo 2-3 puntos o 3-4 oraciones
- Incluye: cómo acepta el cliente (contacto/proceso), plazo de inicio de trabajo, garantía básica, condiciones
- Tono profesional pero cercano, en español chileno
- Personaliza según el tipo de trabajo y datos del cliente/vehículo
- Solo el texto de las notas, sin encabezados ni bullets extra`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    const notes = result.response.text().trim()
    return NextResponse.json({ notes })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error IA" }, { status: 500 })
  }
}
