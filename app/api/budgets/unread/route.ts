import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET — cuántos presupuestos aceptados no ha visto el inspector
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const { count } = await supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("inspector_id", user.id)
    .eq("status", "accepted")
    .eq("seen_by_inspector", false)

  return NextResponse.json({ count: count ?? 0 })
}

// PATCH — marcar todos los aceptados como vistos
export async function PATCH() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  await supabase
    .from("budgets")
    .update({ seen_by_inspector: true })
    .eq("inspector_id", user.id)
    .eq("status", "accepted")
    .eq("seen_by_inspector", false)

  return NextResponse.json({ ok: true })
}
