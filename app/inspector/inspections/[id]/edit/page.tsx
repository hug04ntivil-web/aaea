import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import NewInspectionForm from "@/components/inspection/new-inspection-form"
import { notFound, redirect } from "next/navigation"

export default async function EditDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single()

  // Solo puede editar su propio borrador
  const { data: ins } = await supabase
    .from("inspections")
    .select(`*, vehicles(*), clients(id, full_name, rut, email, phone, city), inspection_items(*)`)
    .eq("id", id)
    .eq("inspector_id", user.id)
    .single()

  if (!ins) notFound()
  if (ins.status !== "draft") redirect(`/inspector/inspections/${id}`)

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, rut, email, phone")
    .order("full_name")

  const v = ins.vehicles ?? {}

  // Mapear ítems existentes al formato del formulario
  const itemsMap: Record<string, { estado: string; observaciones: string }> = {}
  for (const item of (ins.inspection_items ?? [])) {
    itemsMap[item.item_key] = {
      estado: item.estado ?? "N/A",
      observaciones: item.observaciones ?? "",
    }
  }

  const initialData = {
    vehicle: {
      patente:               v.patente           ?? "",
      marca:                 v.marca             ?? "",
      modelo:                v.modelo            ?? "",
      anio:                  v.anio != null ? String(v.anio) : "",
      color:                 v.color             ?? "",
      combustible:           v.combustible       ?? "GASOLINA",
      transmision:           v.transmision       ?? "MECÁNICA",
      traccion:              v.traccion          ?? "4x2",
      cilindrada:            v.cilindrada        ?? "",
      tapiceria:             v.tapiceria         ?? "",
      num_puertas:           v.num_puertas != null ? String(v.num_puertas) : "4",
      tipo_vehiculo:         v.tipo_vehiculo     ?? "auto",
      vin:                   v.vin               ?? "",
      num_motor:             v.num_motor         ?? "",
      soap_estado:           v.soap_estado       ?? "",
      soap_vencimiento:      v.soap_vencimiento  ?? "",
      rev_tecnica_estado:    v.rev_tecnica_estado    ?? "",
      rev_tecnica_vencimiento: v.rev_tecnica_vencimiento ?? "",
      permiso_circulacion:   v.permiso_circulacion   ?? "",
      emision_contaminantes: v.emision_contaminantes ?? "",
      multas:                v.multas            ?? "$0",
      kilometraje:           ins.kilometraje != null ? String(ins.kilometraje) : "",
    },
    clientId:    ins.client_id ?? "",
    isNewClient: false,
    items:       itemsMap,
    comentarios: ins.comentarios ?? "",
  }

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle="Continuar borrador">
      <NewInspectionForm
        inspectorId={user.id}
        inspectorName={profile?.full_name ?? ""}
        clients={clients ?? []}
        editId={id}
        initialData={initialData}
      />
    </AppShell>
  )
}
