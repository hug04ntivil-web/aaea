import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: myRole } = await supabase.rpc("get_my_role")
  if (myRole !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { email, password, full_name, phone, role } = await request.json()

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Faltan campos: nombre, email y contraseña" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
  }

  const validRoles = ["admin", "inspector", "client"]
  const userRole = validRoles.includes(role) ? role : "inspector"

  // Una sola llamada RPC que crea auth.user + profile en la misma transacción
  const { data: newUserId, error } = await supabase.rpc("admin_create_user", {
    p_email: email,
    p_password: password,
    p_name: full_name,
    p_phone: phone || null,
    p_role: userRole,
  })

  if (error) {
    // Mensaje amigable para email duplicado
    const msg = error.message.includes("duplicate key")
      ? "El email ya está registrado en el sistema"
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: newUserId })
}
