import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { calcNotaFinal } from "@/lib/utils"
import { INSPECTION_ITEMS } from "@/lib/inspection-items"

async function getInspectorDraft(supabase: any, id: string, userId: string) {
  const { data } = await supabase
    .from("inspections")
    .select("id, status, inspector_id")
    .eq("id", id)
    .eq("inspector_id", userId)
    .single()
  return data
}

// DELETE — el inspector borra cualquiera de sus propias inspecciones
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const draft = await getInspectorDraft(supabase, id, user.id)
  if (!draft) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const { error } = await supabase.from("inspections").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH — el inspector actualiza su propio borrador
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const draft = await getInspectorDraft(supabase, id, user.id)
  if (!draft) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (draft.status !== "draft") return NextResponse.json({ error: "Solo se pueden editar borradores" }, { status: 403 })

  const body = await req.json()
  const { vehicle, notaVisual, notaCarroceria, notaMecanica, comentarios, photos, items, status } = body

  try {
    // 1. Actualizar vehículo
    await supabase.from("vehicles").upsert({
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

    // 2. Actualizar inspección
    const notaFinal = calcNotaFinal(notaVisual, notaCarroceria, notaMecanica)
    const { error: iErr } = await supabase.from("inspections").update({
      kilometraje: vehicle.kilometraje ? parseInt(vehicle.kilometraje) : null,
      nota_visual: notaVisual,
      nota_carroceria: notaCarroceria,
      nota_mecanica: notaMecanica,
      nota_final: notaFinal,
      comentarios,
      photos: photos ?? [],
      status: status === "draft" ? "draft" : "completed",
    }).eq("id", id)
    if (iErr) throw new Error(`Inspección: ${iErr.message}`)

    // 3. Actualizar ítems (delete + re-insert)
    await supabase.from("inspection_items").delete().eq("inspection_id", id)
    const itemsToInsert = INSPECTION_ITEMS.map(item => ({
      inspection_id: id,
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

    return NextResponse.json({ success: true, inspectionId: id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
