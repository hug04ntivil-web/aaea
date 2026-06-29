import { NextRequest, NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/public"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { opcion } = await request.json()   // "original" | "alternativo" | "otro"

  if (!["original", "alternativo", "otro"].includes(opcion)) {
    return NextResponse.json({ error: "Opción inválida" }, { status: 400 })
  }

  // Usa cliente público — RLS policy "Anon can accept open budgets" protege la operación
  const supabase = createPublicClient()

  const { data: budget, error: fetchErr } = await supabase
    .from("budgets")
    .select("id, status")
    .eq("id", id)
    .single()

  if (fetchErr || !budget) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 })
  if (budget.status === "accepted") return NextResponse.json({ error: "Ya fue aceptado" }, { status: 400 })

  const { error } = await supabase
    .from("budgets")
    .update({ status: "accepted", opcion_aceptada: opcion, seen_by_inspector: false })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
