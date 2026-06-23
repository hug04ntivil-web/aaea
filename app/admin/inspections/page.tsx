import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default async function AdminInspectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()

  const { data: inspections } = await supabase
    .from("inspections")
    .select(`id, fecha_inspeccion, nota_final, nota_visual, nota_carroceria, nota_mecanica, status, vehicles(patente, marca, modelo, anio), clients(full_name), profiles(full_name)`)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Todas las inspecciones">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Inspecciones</h2>
            <p className="text-sm text-gray-500">{inspections?.length ?? 0} en total</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {inspections && inspections.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Vehículo</th>
                    <th className="px-3 py-3 text-left">Cliente</th>
                    <th className="px-3 py-3 text-left">Inspector</th>
                    <th className="px-3 py-3 text-left">Fecha</th>
                    <th className="px-3 py-3 text-center">Nota</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inspections.map((ins: any) => (
                    <tr key={ins.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{ins.vehicles?.patente}</p>
                        <p className="text-xs text-gray-500">{ins.vehicles?.marca} {ins.vehicles?.modelo} {ins.vehicles?.anio}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{ins.clients?.full_name ?? "—"}</td>
                      <td className="px-3 py-3 text-gray-700">{ins.profiles?.full_name ?? "—"}</td>
                      <td className="px-3 py-3 text-gray-500">{formatDate(ins.fecha_inspeccion)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                          {ins.nota_final ? `${ins.nota_final}/7.0` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ins.status === "completed" ? "bg-green-100 text-green-700" : ins.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {ins.status === "draft" ? "Borrador" : ins.status === "completed" ? "Completa" : "Enviada"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/admin/inspections/${ins.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-gray-400 text-sm">No hay inspecciones aún</div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
