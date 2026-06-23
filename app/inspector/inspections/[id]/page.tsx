import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import ScoreCard from "@/components/inspection/score-card"
import ItemsView from "@/components/inspection/items-view"
import ShareButtons from "@/components/inspection/share-buttons"
import { formatDate } from "@/lib/utils"
import { Car, User, Calendar } from "lucide-react"

export default async function InspectionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const { data: inspection } = await admin
    .from("inspections")
    .select(`*, vehicles(*), clients(full_name, email, phone), profiles(full_name), inspection_items(*)`)
    .eq("id", id)
    .single()

  if (!inspection) notFound()

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle={`Inspección — ${inspection.vehicles?.patente}`}>
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-start gap-4">
          <ScoreCard
            visual={inspection.nota_visual}
            carroceria={inspection.nota_carroceria}
            mecanica={inspection.nota_mecanica}
            final={inspection.nota_final}
            size="lg"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <Car size={15} className="text-gray-400 flex-shrink-0" />
              <span className="font-bold">{inspection.vehicles?.patente}</span>
              <span className="text-gray-400">·</span>
              <span>{inspection.vehicles?.marca} {inspection.vehicles?.modelo} {inspection.vehicles?.anio}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User size={13} className="text-gray-400 flex-shrink-0" />
              <span>{inspection.clients?.full_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={13} className="text-gray-400 flex-shrink-0" />
              <span>{formatDate(inspection.fecha_inspeccion)}</span>
            </div>
            {inspection.kilometraje && (
              <p className="text-sm text-gray-500">Kilometraje: <span className="font-medium">{inspection.kilometraje?.toLocaleString("es-CL")} km</span></p>
            )}
            <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${inspection.status === "sent" ? "bg-blue-100 text-blue-700" : inspection.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {inspection.status === "draft" ? "Borrador" : inspection.status === "completed" ? "Completa" : "Enviada"}
            </span>
          </div>
        </div>

        {inspection.public_token && (
          <ShareButtons
            inspectionId={inspection.id}
            publicToken={inspection.public_token}
            clientEmail={inspection.clients?.email}
            clientPhone={inspection.clients?.phone}
          />
        )}

        {inspection.inspection_items && inspection.inspection_items.length > 0 && (
          <ItemsView items={inspection.inspection_items} />
        )}

        {inspection.comentarios && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-2">Comentarios generales</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{inspection.comentarios}</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
