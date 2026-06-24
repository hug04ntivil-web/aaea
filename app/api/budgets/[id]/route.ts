import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const [{ data: budget }, { data: settingsRows }, { data: profile }] = await Promise.all([
    supabase.from("budgets")
      .select(`*, clients(full_name, email, phone, rut), profiles(full_name, signature_url, professional_title), budget_items(*)`)
      .eq("id", id).single(),
    supabase.from("settings").select("key, value"),
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
  ])

  if (!budget) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const settings: Record<string, string> = {}
  settingsRows?.forEach(r => { settings[r.key] = r.value ?? "" })

  return NextResponse.json({ budget, profile, settings })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Verify ownership and that it's a draft
  const { data: budget } = await supabase.from("budgets").select("id, inspector_id, status").eq("id", id).single()
  if (!budget) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (budget.inspector_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  if (budget.status === "accepted") return NextResponse.json({ error: "No se puede eliminar un presupuesto aceptado" }, { status: 400 })

  await supabase.from("budget_items").delete().eq("budget_id", id)
  const { error } = await supabase.from("budgets").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: existing } = await supabase.from("budgets").select("id, inspector_id, status").eq("id", id).single()
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (existing.inspector_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  if (existing.status === "accepted") return NextResponse.json({ error: "No se puede editar un presupuesto aceptado" }, { status: 400 })

  const body = await req.json()
  const { clientId, clienteLibre, vehiculo, inspectionId, items, ivaPct = 19, descuentoGlobal = 0, formaPago, vigenciaDias = 30, descripcionServicio, notasCotizacion } = body

  if (!items?.length) return NextResponse.json({ error: "Sin ítems" }, { status: 400 })
  if (!vehiculo?.patente) return NextResponse.json({ error: "Ingresa la patente" }, { status: 400 })

  let sumRepOrig = 0, sumRepAlt = 0, sumRepOtro = 0, sumMO = 0
  const itemsToInsert = items.map((item: any, idx: number) => {
    const orig = Number(item.rep_original) || 0
    const alt  = Number(item.rep_alternativo) || 0
    const otro = Number(item.rep_otro) || 0
    const mo   = Number(item.val_mano_obra) || 0
    const dcto = Number(item.dcto_pct) || 0
    const f = 1 - dcto / 100
    sumRepOrig += Math.round(orig * f)
    sumRepAlt  += Math.round(alt  * f)
    sumRepOtro += Math.round(otro * f)
    sumMO      += Math.round(mo   * f)
    return {
      budget_id: id, orden: idx + 1,
      descripcion: item.descripcion || "",
      gestion: item.gestion || "MECÁNICO",
      gestion_custom: item.gestion_custom || null,
      rep_genuino: orig, rep_korea: alt, rep_multi: otro,
      val_mano_obra: mo, mano_obra: mo,
      dcto_pct: dcto,
      valor_item: Math.round((orig + mo) * f),
      val_repuesto: orig,
      notas: item.notas || null,
    }
  })

  const dto = Number(descuentoGlobal) || 0
  const iva = Number(ivaPct)
  const subOrig = sumRepOrig + sumMO - dto
  const ivaOrig = Math.round(subOrig * iva / 100)

  const budgetUpdate: any = {
    vehicle_patente: vehiculo.patente?.toUpperCase(),
    vehicle_marca: vehiculo.marca || null,
    vehicle_modelo: vehiculo.modelo || null,
    vehicle_anio: vehiculo.anio ? Number(vehiculo.anio) : null,
    vehicle_version: vehiculo.version || null,
    vehicle_vin: vehiculo.vin || null,
    vehicle_num_motor: vehiculo.num_motor || null,
    vehicle_color: vehiculo.color || null,
    vehicle_km: vehiculo.km ? Number(vehiculo.km) : null,
    forma_pago: formaPago || "Efectivo o Transferencia",
    vigencia_dias: vigenciaDias,
    descripcion_servicio: descripcionServicio || null,
    notas_cotizacion: notasCotizacion || null,
    total_repuestos: sumRepOrig,
    total_mano_obra: sumMO,
    gran_total: sumRepOrig + sumMO,
    descuento_global: dto,
    subtotal: subOrig,
    iva_pct: iva,
    iva_monto: ivaOrig,
    total: subOrig + ivaOrig,
    total_alternativo: sumRepAlt + sumMO - dto + Math.round((sumRepAlt + sumMO - dto) * iva / 100),
    total_otro: sumRepOtro + sumMO - dto + Math.round((sumRepOtro + sumMO - dto) * iva / 100),
    inspection_id: inspectionId || null,
  }

  if (clientId) {
    budgetUpdate.client_id = clientId
  } else if (clienteLibre) {
    budgetUpdate.client_id = null
    budgetUpdate.cliente_nombre = clienteLibre.nombre || null
    budgetUpdate.cliente_rut = clienteLibre.rut || null
    budgetUpdate.cliente_telefono = clienteLibre.telefono || null
    budgetUpdate.cliente_email = clienteLibre.email || null
    budgetUpdate.cliente_ciudad = clienteLibre.ciudad || null
    budgetUpdate.cliente_direccion = clienteLibre.direccion || null
  }

  const { error: bErr } = await supabase.from("budgets").update(budgetUpdate).eq("id", id)
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 })

  // Reemplazar ítems
  await supabase.from("budget_items").delete().eq("budget_id", id)
  const activeItems = itemsToInsert.filter((i: any) => i.descripcion || i.rep_genuino > 0 || i.val_mano_obra > 0)
  if (activeItems.length) {
    const { error: biErr } = await supabase.from("budget_items").insert(activeItems)
    if (biErr) return NextResponse.json({ error: biErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, budgetId: id })
}
