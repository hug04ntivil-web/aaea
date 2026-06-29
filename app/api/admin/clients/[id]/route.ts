import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function getAdminSupabase() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: "No autorizado" }
  const { data: myRole } = await supabase.rpc("get_my_role")
  if (!["admin", "inspector"].includes(myRole)) return { supabase, error: "Sin permisos" }
  return { supabase, error: null }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await getAdminSupabase()
  if (error) return NextResponse.json({ error }, { status: error === "No autorizado" ? 401 : 403 })

  const body = await request.json()
  const { full_name, rut, email, phone, city, address, notes } = body

  const { error: updateError } = await supabase.from("clients").update({
    full_name,
    rut: rut || null,
    email: email || null,
    phone: phone || null,
    city: city || null,
    address: address || null,
    notes: notes || null,
  }).eq("id", id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await getAdminSupabase()
  if (error) return NextResponse.json({ error }, { status: error === "No autorizado" ? 401 : 403 })

  const { error: deleteError } = await supabase.from("clients").delete().eq("id", id)
  if (deleteError) {
    if (deleteError.code === "23503") {
      return NextResponse.json({ error: "No se puede eliminar: el cliente tiene inspecciones o presupuestos asociados" }, { status: 409 })
    }
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
