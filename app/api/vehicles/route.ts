import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function mapBoostrData(d: any, patente: string) {
  const str = (v: any) => (v != null ? String(v) : "")
  return {
    patente,
    marca:         d.brand        ?? d.marca       ?? d.make          ?? "",
    modelo:        d.model        ?? d.modelo      ?? d.version_name  ?? "",
    anio:          d.year         ?? d.anio         ?? d.año           ?? null,
    color:         d.color        ?? d.colour       ?? "",
    version:       d.version      ?? d.variant      ?? d.serie         ?? "",
    vin:           d.vin          ?? d.chassis      ?? d.chasis        ?? "",
    num_motor:     d.engine_number ?? d.num_motor   ?? d.motor_number  ?? "",
    combustible:   d.fuel_type    ?? d.fuel         ?? d.combustible   ?? "",
    transmision:   d.transmission ?? d.transmision  ?? "",
    cilindrada:    str(d.engine_size ?? d.cilindrada ?? d.displacement ?? ""),
    num_puertas:   str(d.doors    ?? d.puertas      ?? ""),
    tipo_vehiculo: d.type         ?? d.tipo         ?? d.vehicle_type  ?? "",
  }
}

export async function GET(request: NextRequest) {
  const patente = request.nextUrl.searchParams.get("patente")
    ?.toUpperCase().replace(/[\s-]/g, "")
  if (!patente) return NextResponse.json({ vehicle: null })

  // 1. Buscar en Supabase primero
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
    // Intentar primero sin Bearer, luego con Bearer
    let res = await fetch(`https://api.boostr.cl/vehicle/${patente}.json`, {
      headers: { Authorization: apiKey },
      cache: "no-store",
    })

    // Si falla, probar con Bearer prefix
    if (!res.ok || res.headers.get("content-type")?.includes("text/html")) {
      res = await fetch(`https://api.boostr.cl/vehicle/${patente}.json`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      })
    }

    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      console.error("[Boostr] Non-JSON response, status:", res.status)
      return NextResponse.json({ vehicle: null, error: "boostr_non_json" })
    }

    const json = await res.json()
    console.log("[Boostr] raw response:", JSON.stringify(json).slice(0, 500))

    // Boostr puede retornar errores con status 200
    if (json.status === "error" || json.error) {
      return NextResponse.json({ vehicle: null })
    }

    const d = json.data ?? json
    if (!d || typeof d !== "object") return NextResponse.json({ vehicle: null })

    const vehicle = mapBoostrData(d, patente)
    return NextResponse.json({ vehicle, source: "boostr" })
  } catch (err) {
    console.error("[Boostr] fetch error:", err)
    return NextResponse.json({ vehicle: null })
  }
}
