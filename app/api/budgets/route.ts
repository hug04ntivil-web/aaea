import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  const {
    clientId, clienteLibre,
    vehiculo,
    inspectionId,
    items,
    ivaPct = 19,
    descuentoGlobal = 0,
    formaPago,
    vigenciaDias = 30,
    descripcionServicio,
    notasCotizacion,
  } = body

  if (!items?.length) return NextResponse.json({ error: "Sin ítems en el presupuesto" }, { status: 400 })
  const hasClient = clientId || clienteLibre?.nombre
  if (!hasClient) return NextResponse.json({ error: "Ingresa los datos del cliente" }, { status: 400 })
  if (!vehiculo?.patente) return NextResponse.json({ error: "Ingresa la patente del vehículo" }, { status: 400 })

  try {
    // Calcular 3 totales por ítem (Original / Alternativo / Otro)
    let sumRepOrig = 0, sumRepAlt = 0, sumRepOtro = 0, sumMO = 0

    const itemsToInsert = items.map((item: any, idx: number) => {
      const orig  = Number(item.rep_original)  || 0
      const alt   = Number(item.rep_alternativo) || 0
      const otro  = Number(item.rep_otro)      || 0
      const mo    = Number(item.val_mano_obra) || 0
      const dcto  = Number(item.dcto_pct)      || 0
      const factor = 1 - dcto / 100

      sumRepOrig += Math.round(orig * factor)
      sumRepAlt  += Math.round(alt  * factor)
      sumRepOtro += Math.round(otro * factor)
      sumMO      += Math.round(mo   * factor)

      return {
        orden: idx + 1,
        descripcion:    item.descripcion || "",
        gestion:        item.gestion || "MECÁNICO",
        gestion_custom: item.gestion_custom || null,
        rep_genuino:    orig,   // Original
        rep_korea:      alt,    // Alternativo
        rep_multi:      otro,   // Otro
        val_mano_obra:  mo,
        mano_obra:      mo,
        dcto_pct:       dcto,
        // valor_item usa la opción "Original" como referencia
        valor_item: Math.round((orig + mo) * factor),
        val_repuesto:   orig,
        notas: item.notas || null,
      }
    })

    const dtoP = Number(descuentoGlobal) || 0   // porcentaje de descuento global
    const iva  = Number(ivaPct)

    const netoOrig = sumRepOrig + sumMO
    const netoAlt  = sumRepAlt  + sumMO
    const netoOtro = sumRepOtro + sumMO

    const dtoAmtOrig = Math.round(netoOrig * dtoP / 100)
    const dtoAmtAlt  = Math.round(netoAlt  * dtoP / 100)
    const dtoAmtOtro = Math.round(netoOtro * dtoP / 100)

    const subOrig = netoOrig - dtoAmtOrig
    const subAlt  = netoAlt  - dtoAmtAlt
    const subOtro = netoOtro - dtoAmtOtro

    const ivaOrig = Math.round(subOrig * iva / 100)
    const ivaAlt  = Math.round(subAlt  * iva / 100)
    const ivaOtro = Math.round(subOtro * iva / 100)

    const totalOrig = subOrig + ivaOrig
    const totalAlt  = subAlt  + ivaAlt
    const totalOtro = subOtro + ivaOtro

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
      notas_cotizacion: notasCotizacion || null,
      // Vehículo
      vehicle_patente:   vehiculo.patente?.toUpperCase(),
      vehicle_marca:     vehiculo.marca    || null,
      vehicle_modelo:    vehiculo.modelo   || null,
      vehicle_anio:      vehiculo.anio  ? Number(vehiculo.anio)  : null,
      vehicle_version:   vehiculo.version  || null,
      vehicle_vin:       vehiculo.vin       || null,
      vehicle_num_motor: vehiculo.num_motor || null,
      vehicle_color:     vehiculo.color     || null,
      vehicle_km:        vehiculo.km ? Number(vehiculo.km) : null,
      // Totales 3 opciones
      total_repuestos: sumRepOrig,
      total_mano_obra: sumMO,
      gran_total:      netoOrig,
      descuento_global: dtoP,
      // Opción Original (default)
      subtotal:   subOrig,
      iva_pct:    iva,
      iva_monto:  ivaOrig,
      total:      totalOrig,
      // Totales extra para Alternativo y Otro
      total_alternativo: totalAlt,
      total_otro:        totalOtro,
      // También guardar los 3 gran_totales netos
      gran_total_alternativo: netoAlt,
      gran_total_otro:        netoOtro,
      status: "draft",
      public_token: publicToken,
    }

    if (clientId) {
      budgetData.client_id = clientId
    } else if (clienteLibre) {
      budgetData.cliente_nombre    = clienteLibre.nombre   || null
      budgetData.cliente_rut       = clienteLibre.rut      || null
      budgetData.cliente_telefono  = clienteLibre.telefono || null
      budgetData.cliente_email     = clienteLibre.email    || null
      budgetData.cliente_ciudad    = clienteLibre.ciudad   || null
      budgetData.cliente_direccion = clienteLibre.direccion|| null
    }

    const { data: budget, error: bErr } = await supabase
      .from("budgets").insert(budgetData).select().single()
    if (bErr) throw new Error(bErr.message)

    const activeItems = itemsToInsert.filter((i: any) =>
      i.descripcion || i.rep_genuino > 0 || i.rep_korea > 0 || i.rep_multi > 0 || i.val_mano_obra > 0
    ).map((i: any) => ({ ...i, budget_id: budget.id }))

    if (activeItems.length) {
      const { error: biErr } = await supabase.from("budget_items").insert(activeItems)
      if (biErr) throw new Error(biErr.message)
    }

    return NextResponse.json({ success: true, budgetId: budget.id, numero })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
