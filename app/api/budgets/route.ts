import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const admin = createAdminClient()
  const body = await request.json()
  const { clientId, inspectionId, items, notes, ivaPct = 19, manoDeObra = 0 } = body

  if (!clientId || !items?.length) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
  }

  try {
    // Obtener siguiente número de presupuesto
    const { data: setting } = await admin
      .from("settings")
      .select("value")
      .eq("key", "budget_next_number")
      .single()

    const nextNum = parseInt(setting?.value ?? "1")
    const numero = `PR-${String(nextNum).padStart(4, "0")}`

    // Calcular totales (3 opciones + mano de obra fija)
    const subtotalGenuino = items.reduce((s: number, i: any) => s + (i.precio_genuino * i.cantidad), 0)
    const subtotalKorea = items.reduce((s: number, i: any) => s + (i.precio_korea * i.cantidad), 0)
    const subtotalMulti = items.reduce((s: number, i: any) => s + (i.precio_multi * i.cantidad), 0)
    const iva = ivaPct / 100
    const totalGenuino = Math.round((subtotalGenuino + manoDeObra) * (1 + iva))
    const totalKorea = Math.round((subtotalKorea + manoDeObra) * (1 + iva))
    const totalMulti = Math.round((subtotalMulti + manoDeObra) * (1 + iva))

    const publicToken = randomBytes(16).toString("hex")

    const { data: budget, error: bErr } = await admin
      .from("budgets")
      .insert({
        numero,
        inspector_id: user.id,
        client_id: clientId,
        inspection_id: inspectionId || null,
        total_genuino: totalGenuino,
        total_korea: totalKorea,
        total_multi: totalMulti,
        total: totalGenuino,
        iva_pct: ivaPct,
        mano_de_obra: manoDeObra,
        notes,
        status: "draft",
        public_token: publicToken,
      })
      .select()
      .single()
    if (bErr) throw new Error(bErr.message)

    const budgetItems = items.map((i: any) => ({
      budget_id: budget.id,
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precio_genuino: i.precio_genuino,
      precio_korea: i.precio_korea,
      precio_multi: i.precio_multi,
    }))
    const { error: biErr } = await admin.from("budget_items").insert(budgetItems)
    if (biErr) throw new Error(biErr.message)

    // Incrementar número
    await admin.from("settings").update({ value: String(nextNum + 1) }).eq("key", "budget_next_number")

    return NextResponse.json({ success: true, budgetId: budget.id, numero })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
