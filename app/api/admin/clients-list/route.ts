import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin", "inspector"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const { data: clients } = await admin
    .from("clients")
    .select("id, full_name, profile_id")
    .order("full_name")

  return NextResponse.json({ clients: clients ?? [] })
}
