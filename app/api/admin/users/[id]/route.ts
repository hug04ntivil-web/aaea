import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function getAdminSupabase() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: "No autorizado" }
  const { data: myRole } = await supabase.rpc("get_my_role")
  if (myRole !== "admin") return { supabase, user, error: "Sin permisos" }
  return { supabase, user, error: null }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await getAdminSupabase()
  if (error) return NextResponse.json({ error }, { status: error === "No autorizado" ? 401 : 403 })

  const { full_name, phone, role } = await request.json()
  const validRoles = ["admin", "inspector", "client"]
  const updates: Record<string, string | null> = {}
  if (full_name) updates.full_name = full_name
  if (phone !== undefined) updates.phone = phone || null
  if (role && validRoles.includes(role)) updates.role = role

  const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, error } = await getAdminSupabase()
  if (error) return NextResponse.json({ error }, { status: error === "No autorizado" ? 401 : 403 })

  // No permitir auto-eliminación
  if (user!.id === id) return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 })

  const { error: deleteError } = await supabase.from("profiles").delete().eq("id", id)
  if (deleteError) {
    if (deleteError.code === "23503") {
      return NextResponse.json({ error: "No se puede eliminar: el usuario tiene inspecciones o presupuestos asociados" }, { status: 409 })
    }
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
