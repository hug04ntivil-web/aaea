// Llamada directa desde el browser — evita el bloqueo de Cloudflare a IPs de datacenters
export async function fetchBoostrPlate(patente: string) {
  const apiKey = process.env.NEXT_PUBLIC_BOOSTR_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(`https://api.boostr.cl/vehicle/${patente}.json`, {
      headers: { Authorization: apiKey },
    })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.data) return null

    const d = json.data
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
  } catch {
    return null
  }
}
