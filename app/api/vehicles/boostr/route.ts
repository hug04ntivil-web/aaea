// Edge Runtime: runs on Cloudflare's network, bypasses WAF block on AWS IPs
export const runtime = "edge"
export const dynamic = "force-dynamic"

function mapBoostrData(d: any, patente: string) {
  const str = (v: any) => (v != null ? String(v) : "")
  return {
    patente,
    marca:         d.brand        ?? d.marca       ?? d.make         ?? "",
    modelo:        d.model        ?? d.modelo      ?? d.version_name ?? "",
    anio:          d.year         ?? d.anio         ?? d.año          ?? null,
    color:         d.color        ?? d.colour       ?? "",
    version:       d.version      ?? d.variant      ?? d.serie        ?? "",
    vin:           d.vin          ?? d.chassis      ?? d.chasis       ?? "",
    num_motor:     d.engine_number ?? d.num_motor   ?? d.motor_number ?? "",
    combustible:   d.fuel_type    ?? d.fuel         ?? d.combustible  ?? "",
    transmision:   d.transmission ?? d.transmision  ?? "",
    cilindrada:    str(d.engine_size ?? d.cilindrada ?? d.displacement ?? ""),
    num_puertas:   str(d.doors    ?? d.puertas      ?? ""),
    tipo_vehiculo: d.type         ?? d.tipo         ?? d.vehicle_type ?? "",
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const patente = url.searchParams.get("patente")?.toUpperCase().replace(/[\s-]/g, "")
  if (!patente) return Response.json({ vehicle: null })

  const apiKey = process.env.BOOSTR_API_KEY
  if (!apiKey) return Response.json({ vehicle: null, error: "BOOSTR_API_KEY not set" })

  try {
    const res = await fetch(`https://api.boostr.cl/vehicle/${patente}.json`, {
      headers: { Authorization: apiKey },
    })

    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return Response.json({ vehicle: null, error: `http_${res.status}` })
    }

    const json = await res.json()

    if (json.status === "error" || json.error || !json.data) {
      return Response.json({ vehicle: null })
    }

    const vehicle = mapBoostrData(json.data, patente)
    return Response.json({ vehicle, source: "boostr" })
  } catch (err: any) {
    return Response.json({ vehicle: null, error: err.message })
  }
}
