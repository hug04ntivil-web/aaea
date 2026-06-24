// Llamada directa desde el browser — evita bloqueo Cloudflare en IPs de datacenters
export async function fetchBoostrPlate(patente: string): Promise<{ vehicle: any | null; error?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_BOOSTR_API_KEY
  if (!apiKey) return { vehicle: null, error: "KEY_MISSING" }

  try {
    const res = await fetch(`https://api.boostr.cl/vehicle/${patente}.json`, {
      headers: { Authorization: apiKey },
    })

    const contentType = res.headers.get("content-type") ?? ""

    if (!contentType.includes("application/json")) {
      return { vehicle: null, error: `HTTP_${res.status}_NOT_JSON` }
    }

    const json = await res.json()
    if (!json.data) return { vehicle: null, error: `NO_DATA:${JSON.stringify(json).slice(0, 100)}` }

    const d = json.data
    const str = (v: any) => (v != null ? String(v) : "")
    return {
      vehicle: {
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
  } catch (err: any) {
    return { vehicle: null, error: `FETCH_ERROR:${err?.message ?? "unknown"}` }
  }
}
