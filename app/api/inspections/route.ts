import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { calcNotaFinal } from "@/lib/utils"
import { INSPECTION_ITEMS } from "@/lib/inspection-items"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  const { vehicle, newClient, selectedClientId, isNewClient, notaVisual, notaCarroceria, notaMecanica, comentarios, photos, items, inspectorId } = body

  try {
    // 1. Guardar / actualizar vehículo (server client con RLS de inspector/admin)
    const { data: savedVehicle, error: vErr } = await supabase
      .from("vehicles")
      .upsert({
        patente: vehicle.patente,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        anio: vehicle.anio ? parseInt(vehicle.anio) : null,
        color: vehicle.color,
        combustible: vehicle.combustible,
        transmision: vehicle.transmision,
        traccion: vehicle.traccion,
        cilindrada: vehicle.cilindrada,
        tapiceria: vehicle.tapiceria,
        num_puertas: vehicle.num_puertas ? parseInt(vehicle.num_puertas) : null,
        tipo_vehiculo: vehicle.tipo_vehiculo,
        vin: vehicle.vin,
        num_motor: vehicle.num_motor,
        soap_estado: vehicle.soap_estado,
        soap_vencimiento: vehicle.soap_vencimiento,
        rev_tecnica_estado: vehicle.rev_tecnica_estado,
        rev_tecnica_vencimiento: vehicle.rev_tecnica_vencimiento,
        permiso_circulacion: vehicle.permiso_circulacion,
        emision_contaminantes: vehicle.emision_contaminantes,
        multas: vehicle.multas,
      }, { onConflict: "patente" })
      .select()
      .single()
    if (vErr) throw new Error(`Vehículo: ${vErr.message}`)

    // 2. Cliente
    let clientId = selectedClientId
    if (isNewClient) {
      const { data: savedClient, error: cErr } = await supabase
        .from("clients")
        .insert({ ...newClient, created_by: inspectorId })
        .select()
        .single()
      if (cErr) throw new Error(`Cliente: ${cErr.message}`)
      clientId = savedClient.id
    }

    // 3. Inspección
    const notaFinal = calcNotaFinal(notaVisual, notaCarroceria, notaMecanica)
    const { randomBytes } = await import("crypto")
    const publicToken = randomBytes(16).toString("hex")

    const { data: inspection, error: iErr } = await supabase
      .from("inspections")
      .insert({
        vehicle_id: savedVehicle.id,
        client_id: clientId,
        inspector_id: inspectorId,
        kilometraje: vehicle.kilometraje ? parseInt(vehicle.kilometraje) : null,
        nota_visual: notaVisual,
        nota_carroceria: notaCarroceria,
        nota_mecanica: notaMecanica,
        nota_final: notaFinal,
        comentarios,
        photos: photos ?? [],
        status: "completed",
        public_token: publicToken,
      })
      .select()
      .single()
    if (iErr) throw new Error(`Inspección: ${iErr.message}`)

    // 4. Ítems
    const itemsToInsert = INSPECTION_ITEMS.map(item => ({
      inspection_id: inspection.id,
      section: item.section,
      subsection: item.subsection,
      item_key: item.key,
      item_label: item.label,
      estado: items[item.key]?.estado ?? "N/A",
      observaciones: items[item.key]?.observaciones ?? "",
      sort_order: item.sortOrder,
    }))
    const { error: iiErr } = await supabase.from("inspection_items").insert(itemsToInsert)
    if (iiErr) throw new Error(`Ítems: ${iiErr.message}`)

    return NextResponse.json({ success: true, inspectionId: inspection.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
