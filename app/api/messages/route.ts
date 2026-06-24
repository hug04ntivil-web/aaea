import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single()

  let query = supabase
    .from("messages")
    .select(`id, body, created_at, sender_id, profiles!messages_sender_id_fkey(full_name, role)`)
    .order("created_at", { ascending: true })

  if (profile?.role === "client") {
    query = query.eq("client_id", user.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ messages: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single()
  const body = await request.json()
  const { message, clientId } = body

  if (!message?.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 })

  const targetClientId = profile?.role === "client" ? user.id : clientId

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    client_id: targetClientId,
    body: message.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
