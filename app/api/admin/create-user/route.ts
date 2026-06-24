import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createFreshClient } from "@supabase/supabase-js"

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

  // Cliente sin sesión para no pisar la sesión del admin actual
  const fresh = createFreshClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: signUpError } = await fresh.auth.signUp({
    email,
    password,
    options: { data: { full_name, role: userRole } },
  })

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 })
  }
  if (!newUser.user) {
    return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 400 })
  }

  // Supabase devuelve identities vacío cuando el email ya existe (sin error explícito)
  if (!newUser.user.identities || newUser.user.identities.length === 0) {
    return NextResponse.json({ error: "El email ya está registrado en el sistema" }, { status: 400 })
  }

  const userId = newUser.user.id

  // Confirmar email automáticamente
  await supabase.rpc("admin_confirm_user_email", { target_user_id: userId })

  // Forzar rol correcto — el trigger crea el perfil con role='client' por defecto;
  // admin_upsert_profile usa ON CONFLICT DO UPDATE para sobreescribirlo
  const { error: profileError } = await supabase.rpc("admin_upsert_profile", {
    p_id: userId,
    p_full_name: full_name,
    p_email: email,
    p_phone: phone || null,
    p_role: userRole,
  })

  if (profileError) {
    return NextResponse.json({
      error: `Usuario creado pero error al guardar perfil: ${profileError.message}`,
    }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId })
}
