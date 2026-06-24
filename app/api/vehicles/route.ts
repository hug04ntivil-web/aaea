import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const patente = request.nextUrl.searchParams.get("patente")?.toUpperCase()
  if (!patente) return NextResponse.json({ vehicle: null })

  const supabase = await createClient()
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("patente, marca, modelo, anio, version, vin, num_motor, color")
    .eq("patente", patente)
    .maybeSingle()

  return NextResponse.json({ vehicle: vehicle ?? null })
}
