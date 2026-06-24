import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single()
  if (!["admin", "inspector"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const clientId = request.nextUrl.searchParams.get("clientId")
  if (!clientId) return NextResponse.json({ messages: [] })

  const { data } = await supabase
    .from("messages")
    .select(`id, body, created_at, sender_id, profiles!messages_sender_id_fkey(full_name, role)`)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })

  return NextResponse.json({ messages: data ?? [] })
}
