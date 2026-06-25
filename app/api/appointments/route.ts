import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const from = req.nextUrl.searchParams.get("from")
  const to   = req.nextUrl.searchParams.get("to")

  let query = supabase
    .from("appointments")
    .select("*")
    .eq("inspector_id", user.id)
    .order("fecha", { ascending: true })

  if (from) query = query.gte("fecha", from)
  if (to)   query = query.lte("fecha", to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ appointments: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { fecha, hora, titulo, descripcion, cliente_nombre, patente } = body

  if (!fecha || !titulo) return NextResponse.json({ error: "fecha y titulo son requeridos" }, { status: 400 })

  const { data, error } = await supabase
    .from("appointments")
    .insert({ inspector_id: user.id, fecha, hora: hora || null, titulo, descripcion, cliente_nombre, patente, status: "pending" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ appointment: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const { error } = await supabase.from("appointments").delete().eq("id", id).eq("inspector_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
