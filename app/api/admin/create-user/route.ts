import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createFreshClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { email, password, full_name, phone, role } = await request.json()
  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  // Usar cliente fresh (sin sesión) para no sobreescribir la sesión del admin
  const fresh = createFreshClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: createError } = await fresh.auth.signUp({
    email,
    password,
    options: { data: { full_name, role: role ?? "inspector" } },
  })

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? "Error al crear usuario" }, { status: 400 })
  }

  // Actualizar perfil con rol y nombre (via admin DB client, bypass RLS)
  await admin.from("profiles").upsert({
    id: newUser.user.id,
    full_name,
    email,
    phone: phone ?? null,
    role: role ?? "inspector",
  })

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
