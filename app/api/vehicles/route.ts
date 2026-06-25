import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function mapBoostr(d: any, patente: string) {
  // multas: Boostr puede devolverlas como array en d.fines o d.multas
  const finesArr: any[] = d.fines ?? d.multas_array ?? []
  const multasTotal = finesArr.reduce((s: number, f: any) => s + (Number(f.amount ?? f.monto ?? 0)), 0)
  const multasStr = finesArr.length ? `$${multasTotal.toLocaleString("es-CL")}` : "$0"

  return {
    patente:       (d.plate ?? patente).toUpperCase(),
    marca:         d.make         ?? "",
    modelo:        d.model        ?? "",
    anio:          d.year         ?? null,
    color:         d.color        ?? "",
    version:       "",
    vin:           d.chassis      ?? "",
    num_motor:     d.engine       ?? "",
    combustible:   d.gas_type     ?? "",
    transmision:   "",
    cilindrada:    d.engine_size  ? String(d.engine_size) : "",
    num_puertas:   d.doors        ? String(d.doors) : "",
    tipo_vehiculo: d.type         ?? "",
    kilometraje:   d.kilometers   ? String(d.kilometers) : "",
    multas:        multasStr,
  }
}

export async function GET(request: NextRequest) {
  const patente = request.nextUrl.searchParams.get("patente")
    ?.toUpperCase().replace(/[\s-]/g, "")
  if (!patente) return NextResponse.json({ vehicle: null })

  // 1. Supabase
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("vehicles")
    .select("patente, marca, modelo, anio, version, vin, num_motor, color, combustible, transmision, cilindrada, num_puertas, tipo_vehiculo, traccion, tapiceria")
    .eq("patente", patente)
    .maybeSingle()
  if (existing) return NextResponse.json({ vehicle: existing, source: "local" })

  // 2. Boostr — con headers de browser para pasar Cloudflare WAF
  const apiKey = process.env.BOOSTR_API_KEY
  if (!apiKey) return NextResponse.json({ vehicle: null, error: "KEY_MISSING" })

  try {
    const res = await fetch(`https://api.boostr.cl/vehicle/${patente}.json?include=fines`, {
      headers: {
        "X-API-KEY": apiKey,
        "Accept":    "application/json",
      },
      cache: "no-store",
    })

    const ct = res.headers.get("content-type") ?? ""
    if (!ct.includes("application/json")) {
      const msg = res.status === 403
        ? "Servicio de patentes no disponible temporalmente"
        : `Error externo (${res.status})`
      return NextResponse.json({ vehicle: null, error: msg })
    }

    const json = await res.json()
    if (!json.data) return NextResponse.json({ vehicle: null, error: `NO_DATA:${JSON.stringify(json).slice(0,120)}` })

    return NextResponse.json({ vehicle: mapBoostr(json.data, patente), source: "boostr" })
  } catch (err: any) {
    return NextResponse.json({ vehicle: null, error: `FETCH:${err?.message}` })
  }
}
