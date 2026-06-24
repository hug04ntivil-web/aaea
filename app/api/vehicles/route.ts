import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function mapBoostrData(d: any, patente: string) {
  const str = (v: any) => (v != null ? String(v) : "")
  return {
    patente,
    marca:        d.brand        ?? d.marca       ?? d.make          ?? "",
    modelo:       d.model        ?? d.modelo      ?? d.version_name  ?? "",
    anio:         d.year         ?? d.anio         ?? d.año           ?? null,
    color:        d.color        ?? d.colour       ?? "",
    version:      d.version      ?? d.variant      ?? d.serie         ?? "",
    vin:          d.vin          ?? d.chassis      ?? d.chasis        ?? "",
    num_motor:    d.engine_number ?? d.num_motor   ?? d.motor_number  ?? "",
    combustible:  d.fuel_type    ?? d.fuel         ?? d.combustible   ?? "",
    transmision:  d.transmission ?? d.transmision  ?? "",
    cilindrada:   str(d.engine_size ?? d.cilindrada ?? d.displacement ?? ""),
    num_puertas:  str(d.doors    ?? d.puertas      ?? ""),
    tipo_vehiculo: d.type        ?? d.tipo         ?? d.vehicle_type  ?? "",
  }
}

export async function GET(request: NextRequest) {
  const patente = request.nextUrl.searchParams.get("patente")
    ?.toUpperCase().replace(/[\s-]/g, "")
  if (!patente) return NextResponse.json({ vehicle: null })

  // 1. Buscar en Supabase primero (datos ya registrados)
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("vehicles")
    .select("patente, marca, modelo, anio, version, vin, num_motor, color, combustible, transmision, cilindrada, num_puertas, tipo_vehiculo, traccion, tapiceria")
    .eq("patente", patente)
    .maybeSingle()

  if (existing) return NextResponse.json({ vehicle: existing, source: "local" })

  // 2. Consultar Boostr API
  const apiKey = process.env.BOOSTR_API_KEY
  if (!apiKey) return NextResponse.json({ vehicle: null, error: "BOOSTR_API_KEY not configured" })

  try {
    const res = await fetch(`https://api.boostr.cl/vehicle/${patente}.json`, {
      headers: { Authorization: apiKey },
      cache: "no-store",
    })

    if (!res.ok) return NextResponse.json({ vehicle: null })

    const json = await res.json()

    // Boostr retorna status "success" o puede variar
    const d = json.data ?? json
    if (!d || d.error || d.message) return NextResponse.json({ vehicle: null })

    const vehicle = mapBoostrData(d, patente)
    return NextResponse.json({ vehicle, source: "boostr" })
  } catch {
    return NextResponse.json({ vehicle: null })
  }
}
