import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export interface SearchResult {
  type: "inspection" | "budget" | "client" | "vehicle"
  id: string
  title: string
  subtitle: string
  url: string
  score?: number
  date?: string
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const term = `%${q}%`
  const results: SearchResult[] = []

  // 1. Search vehicles directly
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, patente, marca, modelo, anio, color")
    .or(`patente.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`)
    .limit(5)

  const vehicleIds = (vehicles ?? []).map((v: any) => v.id)

  // 2. Search clients directly
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, rut, email, phone")
    .or(`full_name.ilike.${term},rut.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
    .limit(5)

  const clientIds = (clients ?? []).map((c: any) => c.id)

  // 3. Search inspections by matching vehicle_id or client_id
  const inspFilter: string[] = []
  if (vehicleIds.length) inspFilter.push(`vehicle_id.in.(${vehicleIds.join(",")})`)
  if (clientIds.length)  inspFilter.push(`client_id.in.(${clientIds.join(",")})`)

  let inspections: any[] = []
  if (inspFilter.length) {
    const { data } = await supabase
      .from("inspections")
      .select("id, nota_final, created_at, status, vehicle_id, client_id, vehicles(patente, marca, modelo), clients(full_name)")
      .or(inspFilter.join(","))
      .eq("inspector_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
    inspections = data ?? []
  }

  // 4. Search budgets by numero or cliente_nombre
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, numero, total, status, created_at, cliente_nombre, vehicles(patente, marca, modelo)")
    .or(`numero.ilike.${term},cliente_nombre.ilike.${term}`)
    .order("created_at", { ascending: false })
    .limit(5)

  // Also search budgets by vehicle
  if (vehicleIds.length) {
    const { data: budgetsByVehicle } = await supabase
      .from("budgets")
      .select("id, numero, total, status, created_at, cliente_nombre, vehicles(patente, marca, modelo)")
      .in("vehicle_id", vehicleIds)
      .order("created_at", { ascending: false })
      .limit(3)
    const existingIds = new Set((budgets ?? []).map((b: any) => b.id))
    for (const b of (budgetsByVehicle ?? [])) {
      if (!existingIds.has(b.id)) (budgets as any[])?.push(b)
    }
  }

  // Build results
  for (const insp of inspections) {
    const v = insp.vehicles
    const c = insp.clients
    results.push({
      type: "inspection",
      id: insp.id,
      title: v ? `${v.patente} — ${v.marca} ${v.modelo}` : "Inspección",
      subtitle: `Inspección${c ? ` · ${c.full_name}` : ""} · Nota ${insp.nota_final?.toFixed(1) ?? "—"}`,
      url: `/inspector/inspections/${insp.id}`,
      score: insp.nota_final,
      date: insp.created_at,
    })
  }

  for (const b of (budgets ?? [])) {
    const v = (b as any).vehicles
    results.push({
      type: "budget",
      id: b.id,
      title: `Presupuesto ${(b as any).numero ?? b.id.slice(0, 8)}`,
      subtitle: `${(b as any).cliente_nombre ?? "Sin cliente"}${v ? ` · ${v.patente}` : ""} · $${Number((b as any).total ?? 0).toLocaleString("es-CL")}`,
      url: `/inspector/budgets/${b.id}`,
      date: (b as any).created_at,
    })
  }

  for (const c of (clients ?? [])) {
    results.push({
      type: "client",
      id: (c as any).id,
      title: (c as any).full_name,
      subtitle: [(c as any).rut, (c as any).email, (c as any).phone].filter(Boolean).join(" · "),
      url: `/inspector/clients/${(c as any).id}`,
    })
  }

  for (const v of (vehicles ?? [])) {
    results.push({
      type: "vehicle",
      id: (v as any).id,
      title: `${(v as any).patente} — ${(v as any).marca} ${(v as any).modelo}`,
      subtitle: [(v as any).anio, (v as any).color].filter(Boolean).join(" · "),
      url: `/inspector/vehicles/${(v as any).id}`,
    })
  }

  // Deduplicate by id+type
  const seen = new Set<string>()
  const deduped = results.filter(r => {
    const key = `${r.type}:${r.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ results: deduped.slice(0, 12) })
}
