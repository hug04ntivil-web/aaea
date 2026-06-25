import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { km } = await req.json().catch(() => ({}))

  const { error } = await supabase
    .from("budgets")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      ...(km ? { completed_km: Number(km) } : {}),
    })
    .eq("id", id)
    .eq("inspector_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
