import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const SETTINGS_KEYS = [
  "company_name", "company_rut", "company_phone", "company_email",
  "company_address", "company_address2", "company_services", "company_logo_url",
  "payment_bank", "payment_account_type", "payment_account_number",
  "payment_rut", "payment_email", "payment_note",
  "iva_pct", "default_iva", "budget_next_number",
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data } = await supabase.from("settings").select("key, value").in("key", SETTINGS_KEYS)

  const settings: Record<string, string> = {}
  data?.forEach(row => { settings[row.key] = row.value ?? "" })

  return NextResponse.json({ settings })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { settings } = await request.json()

  const upserts = Object.entries(settings as Record<string, string>)
    .filter(([key]) => SETTINGS_KEYS.includes(key))
    .map(([key, value]) => ({ key, value: String(value ?? ""), updated_at: new Date().toISOString() }))

  if (!upserts.length) return NextResponse.json({ error: "Sin datos" }, { status: 400 })

  const { error } = await supabase.from("settings").upsert(upserts, { onConflict: "key" })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
