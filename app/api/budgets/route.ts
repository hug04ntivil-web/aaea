import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  const {
    // Cliente
    clientId, clienteLibre,
    // Vehículo
    vehiculo,
    // Inspección
    inspectionId,
    // Ítems
    items,
    // Totales
    ivaPct = 19, descuentoGlobal = 0,
    // Info doc
    formaPago, vigenciaDias = 30, descripcionServicio,
  } = body

  if (!items?.length) return NextResponse.json({ error: "Sin ítems en el presupuesto" }, { status: 400 })

  const hasClient = clientId || clienteLibre?.nombre
  if (!hasClient) return NextResponse.json({ error: "Ingresa los datos del cliente" }, { status: 400 })

  const hasVehicle = vehiculo?.patente
  if (!hasVehicle) return NextResponse.json({ error: "Ingresa la patente del vehículo" }, { status: 400 })

  try {
    // Calcular totales
    let totalRep = 0, totalMO = 0
    const itemsWithTotals = items.map((item: any, idx: number) => {
      const valRep = Number(item.val_repuesto) || 0
      const valMO = Number(item.val_mano_obra) || 0
      const dcto = Number(item.dcto_pct) || 0
      const valorItem = Math.round((valRep + valMO) * (1 - dcto / 100))
      totalRep += Math.round(valRep * (1 - dcto / 100))
      totalMO += Math.round(valMO * (1 - dcto / 100))
      return {
        orden: idx + 1,
        descripcion: item.descripcion || "",
        gestion: item.gestion || "MECÁNICO",
        gestion_custom: item.gestion_custom || null,
        val_repuesto: valRep,
        val_mano_obra: valMO,
        dcto_pct: dcto,
        valor_item: valorItem,
        notas: item.notas || null,
      }
    })

    const granTotal = totalRep + totalMO
    const subtotalNeto = granTotal - (Number(descuentoGlobal) || 0)
    const ivaMonto = Math.round(subtotalNeto * (Number(ivaPct) / 100))
    const total = subtotalNeto + ivaMonto

    // Número correlativo
    const { data: numData } = await supabase.rpc("get_next_budget_number")
    const numero = numData ?? `PTO_${String(Date.now()).slice(-6)}`

    const publicToken = randomBytes(16).toString("hex")

    const budgetData: any = {
      numero,
      inspector_id: user.id,
      inspection_id: inspectionId || null,
      forma_pago: formaPago || "Efectivo o Transferencia",
      vigencia_dias: vigenciaDias,
      descripcion_servicio: descripcionServicio || null,
      // Vehículo
      vehicle_patente: vehiculo.patente?.toUpperCase(),
      vehicle_marca: vehiculo.marca || null,
      vehicle_modelo: vehiculo.modelo || null,
      vehicle_anio: vehiculo.anio ? Number(vehiculo.anio) : null,
      vehicle_version: vehiculo.version || null,
      vehicle_vin: vehiculo.vin || null,
      vehicle_num_motor: vehiculo.num_motor || null,
      vehicle_color: vehiculo.color || null,
      vehicle_km: vehiculo.km ? Number(vehiculo.km) : null,
      // Totales
      total_repuestos: totalRep,
      total_mano_obra: totalMO,
      gran_total: granTotal,
      descuento_global: Number(descuentoGlobal) || 0,
      subtotal: subtotalNeto,
      iva_pct: Number(ivaPct),
      iva_monto: ivaMonto,
      total,
      status: "draft",
      public_token: publicToken,
    }

    // Cliente registrado o libre
    if (clientId) {
      budgetData.client_id = clientId
    } else if (clienteLibre) {
      budgetData.cliente_nombre = clienteLibre.nombre || null
      budgetData.cliente_rut = clienteLibre.rut || null
      budgetData.cliente_telefono = clienteLibre.telefono || null
      budgetData.cliente_email = clienteLibre.email || null
      budgetData.cliente_ciudad = clienteLibre.ciudad || null
      budgetData.cliente_direccion = clienteLibre.direccion || null
    }

    const { data: budget, error: bErr } = await supabase
      .from("budgets").insert(budgetData).select().single()
    if (bErr) throw new Error(bErr.message)

    const budgetItems = itemsWithTotals
      .filter((i: any) => i.descripcion || i.val_repuesto > 0 || i.val_mano_obra > 0)
      .map((i: any) => ({ ...i, budget_id: budget.id }))

    if (budgetItems.length) {
      const { error: biErr } = await supabase.from("budget_items").insert(budgetItems)
      if (biErr) throw new Error(biErr.message)
    }

    return NextResponse.json({ success: true, budgetId: budget.id, numero })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
