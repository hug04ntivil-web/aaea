import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const patente = request.nextUrl.searchParams.get("patente")
    ?.toUpperCase().replace(/[\s-]/g, "")
  if (!patente) return NextResponse.json({ vehicle: null })

  const supabase = await createClient()
  const { data } = await supabase
    .from("vehicles")
    .select("patente, marca, modelo, anio, version, vin, num_motor, color, combustible, transmision, cilindrada, num_puertas, tipo_vehiculo, traccion, tapiceria")
    .eq("patente", patente)
    .maybeSingle()

  return NextResponse.json({ vehicle: data ?? null, source: "local" })
}
