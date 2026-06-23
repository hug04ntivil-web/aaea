import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const SETTINGS_KEYS = [
  "company_name", "company_rut", "company_phone", "company_email",
  "company_address", "default_iva", "budget_next_number",
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin.from("settings").select("key, value").in("key", SETTINGS_KEYS)

  const settings: Record<string, string> = {}
  data?.forEach(row => { settings[row.key] = row.value })

  return NextResponse.json({ settings })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { settings } = await request.json()

  const upserts = Object.entries(settings as Record<string, string>)
    .filter(([key]) => SETTINGS_KEYS.includes(key))
    .map(([key, value]) => ({ key, value: String(value) }))

  const { error } = await admin.from("settings").upsert(upserts, { onConflict: "key" })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
