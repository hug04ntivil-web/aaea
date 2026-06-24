import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const patente = request.nextUrl.searchParams.get("patente")
    ?.toUpperCase().replace(/[\s-]/g, "")
  if (!patente) return NextResponse.json({ vehicle: null })

  // 1. Buscar en Supabase (vehículos ya registrados)
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("vehicles")
    .select("patente, marca, modelo, anio, version, vin, num_motor, color, combustible, transmision, cilindrada, num_puertas, tipo_vehiculo, traccion, tapiceria")
    .eq("patente", patente)
    .maybeSingle()

  if (existing) return NextResponse.json({ vehicle: existing, source: "local" })

  // 2. Delegar a ruta Edge que llama a Boostr (evita bloqueo Cloudflare en AWS IPs)
  try {
    const base = request.nextUrl.origin
    const boostrRes = await fetch(`${base}/api/vehicles/boostr?patente=${patente}`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    })
    const data = await boostrRes.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ vehicle: null })
  }
}
