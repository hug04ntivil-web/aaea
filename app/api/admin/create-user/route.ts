import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createFreshClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Verificar que es admin usando el RPC probado
  const { data: myRole } = await supabase.rpc("get_my_role")
  if (myRole !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { email, password, full_name, phone, role } = await request.json()
  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Faltan campos requeridos: nombre, email y contraseña" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
  }

  const validRoles = ["admin", "inspector", "client"]
  const userRole = validRoles.includes(role) ? role : "inspector"

  // Cliente fresh sin sesión para no sobreescribir la sesión del admin
  const fresh = createFreshClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: createError } = await fresh.auth.signUp({
    email,
    password,
    options: { data: { full_name, role: userRole } },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }
  if (!newUser.user) {
    return NextResponse.json({ error: "No se pudo crear el usuario. Verifica que el email no esté ya registrado." }, { status: 400 })
  }

  const admin = createAdminClient()

  // Auto-confirmar email vía función SQL
  const { error: confirmError } = await admin.rpc("admin_confirm_user_email", {
    target_user_id: newUser.user.id,
  })
  if (confirmError) {
    console.error("No se pudo auto-confirmar el email:", confirmError.message)
  }

  // Guardar perfil con rol correcto (bypass RLS)
  const { error: upsertError } = await admin.from("profiles").upsert({
    id: newUser.user.id,
    full_name,
    email,
    phone: phone || null,
    role: userRole,
  })

  if (upsertError) {
    return NextResponse.json({
      error: `Usuario creado pero error al guardar perfil: ${upsertError.message}`,
    }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
