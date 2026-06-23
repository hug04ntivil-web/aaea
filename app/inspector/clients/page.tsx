import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import { formatDate } from "@/lib/utils"

export default async function InspectorClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()

  const { data: inspections } = await supabase
    .from("inspections")
    .select("client_id")
    .eq("inspector_id", user!.id)

  const clientIds = [...new Set(inspections?.map(i => i.client_id).filter(Boolean))]

  const { data: clients } = clientIds.length > 0
    ? await supabase.from("clients").select("id, full_name, rut, phone, email, created_at").in("id", clientIds).order("full_name")
    : { data: [] }

  return (
    <AppShell role="inspector" userName={profile?.full_name ?? ""} pageTitle="Mis clientes">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Mis clientes</h2>
          <p className="text-sm text-gray-500">{clients?.length ?? 0} clientes inspeccionados</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {clients && clients.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {clients.map((c: any) => (
                <div key={c.id} className="px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{c.full_name}</p>
                      {c.rut && <p className="text-xs text-gray-500">RUT: {c.rut}</p>}
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm">
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline text-xs">{c.phone}</a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline text-xs">{c.email}</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-gray-400 text-sm">
              Los clientes aparecerán aquí cuando crees inspecciones.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
