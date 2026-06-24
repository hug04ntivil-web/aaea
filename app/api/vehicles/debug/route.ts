import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Endpoint temporal de debug — muestra respuesta cruda de Boostr
// Usar: /api/vehicles/debug?plate=LRLX14
// ELIMINAR después de confirmar los campos
export async function GET(request: NextRequest) {
  const plate = request.nextUrl.searchParams.get("plate")?.toUpperCase() ?? "LRLX14"
  const apiKey = process.env.BOOSTR_API_KEY

  if (!apiKey) return NextResponse.json({ error: "BOOSTR_API_KEY no configurado en Vercel" })

  const results: any = { plate, keyLength: apiKey.length, attempts: [] }

  // Intento 1: sin Bearer
  try {
    const r1 = await fetch(`https://api.boostr.cl/vehicle/${plate}.json`, {
      headers: { Authorization: apiKey },
      cache: "no-store",
    })
    const ct1 = r1.headers.get("content-type") ?? ""
    const body1 = ct1.includes("json") ? await r1.json() : await r1.text()
    results.attempts.push({ header: "Authorization: <token>", status: r1.status, contentType: ct1, body: body1 })
  } catch (e: any) {
    results.attempts.push({ header: "Authorization: <token>", error: e.message })
  }

  // Intento 2: con Bearer
  try {
    const r2 = await fetch(`https://api.boostr.cl/vehicle/${plate}.json`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    })
    const ct2 = r2.headers.get("content-type") ?? ""
    const body2 = ct2.includes("json") ? await r2.json() : await r2.text()
    results.attempts.push({ header: "Authorization: Bearer <token>", status: r2.status, contentType: ct2, body: body2 })
  } catch (e: any) {
    results.attempts.push({ header: "Authorization: Bearer <token>", error: e.message })
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } })
}
