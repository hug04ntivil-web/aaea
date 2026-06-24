import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { status } = await req.json()
  const allowed = ["draft", "sent", "accepted"]
  if (!allowed.includes(status)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 })

  const { data: budget } = await supabase
    .from("budgets").select("inspector_id, status").eq("id", id).single()
  if (!budget) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (budget.inspector_id !== user.id) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { error } = await supabase.from("budgets").update({ status }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
