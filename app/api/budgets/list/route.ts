import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const [{ data: profile }, { data: budgets }] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
    supabase.from("budgets")
      .select(`id, numero, total, status, opcion_aceptada, created_at, vehicle_patente, cliente_nombre, clients(full_name)`)
      .eq("inspector_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  return NextResponse.json({ budgets: budgets ?? [], profile })
}
