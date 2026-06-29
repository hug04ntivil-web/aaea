import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Verificar rol admin o inspector via RPC
  const { data: myRole } = await supabase.rpc("get_my_role")
  if (!["admin", "inspector"].includes(myRole)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { full_name, rut, email, phone, city, address, notes } = await request.json()
  if (!full_name) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
  }

  const { data: client, error } = await supabase.from("clients").insert({
    full_name,
    rut: rut || null,
    email: email || null,
    phone: phone || null,
    city: city || "Santiago",
    address: address || null,
    notes: notes || null,
    created_by: user.id,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, clientId: client.id })
}
