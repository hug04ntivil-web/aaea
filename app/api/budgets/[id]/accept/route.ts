import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { opcion } = await request.json() // "genuino" | "korea" | "multi"

  const admin = createAdminClient()
  const { data: budget } = await admin.from("budgets").select("total_genuino, total_korea, total_multi").eq("id", id).single()
  if (!budget) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 })

  const total = opcion === "korea" ? budget.total_korea : opcion === "multi" ? budget.total_multi : budget.total_genuino

  const { error } = await admin.from("budgets").update({
    status: "accepted",
    opcion_aceptada: opcion,
    total,
  }).eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
