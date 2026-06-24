export const runtime = "edge"
export const dynamic = "force-dynamic"

// Debug temporal: prueba Boostr directamente desde Edge Runtime
// Uso: /api/vehicles/debug?plate=LRLX14
export async function GET(request: Request) {
  const url = new URL(request.url)
  const plate = url.searchParams.get("plate")?.toUpperCase() ?? "LRLX14"
  const apiKey = process.env.BOOSTR_API_KEY

  if (!apiKey) return Response.json({ error: "BOOSTR_API_KEY no configurado" })

  try {
    const res = await fetch(`https://api.boostr.cl/vehicle/${plate}.json`, {
      headers: { Authorization: apiKey },
    })
    const ct = res.headers.get("content-type") ?? ""
    const body = ct.includes("json") ? await res.json() : await res.text()
    return Response.json({
      runtime: "edge",
      plate,
      status: res.status,
      contentType: ct,
      body,
    })
  } catch (e: any) {
    return Response.json({ error: e.message })
  }
}
