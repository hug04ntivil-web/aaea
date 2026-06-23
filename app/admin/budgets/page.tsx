import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default async function AdminBudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user!.id).single()

  const { data: budgets } = await admin
    .from("budgets")
    .select(`id, numero, total_genuino, total_korea, total_multi, total, status, opcion_aceptada, created_at, clients(full_name), profiles(full_name)`)
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Presupuestos">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Presupuestos</h2>
          <p className="text-sm text-gray-500">{budgets?.length ?? 0} en total</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {budgets && budgets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Número</th>
                    <th className="px-3 py-3 text-left">Cliente</th>
                    <th className="px-3 py-3 text-left">Inspector</th>
                    <th className="px-3 py-3 text-right">Total aceptado</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3 text-left">Fecha</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {budgets.map((b: any) => {
                    const opcionLabel = b.opcion_aceptada === "genuino" ? "Genuino" : b.opcion_aceptada === "korea" ? "Korea" : b.opcion_aceptada === "multi" ? "Multi" : null
                    return (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{b.numero}</td>
                        <td className="px-3 py-3 text-gray-700">{b.clients?.full_name ?? "—"}</td>
                        <td className="px-3 py-3 text-gray-700">{b.profiles?.full_name ?? "—"}</td>
                        <td className="px-3 py-3 text-right">
                          <p className="font-bold text-gray-800">${(b.total ?? 0).toLocaleString("es-CL")}</p>
                          {opcionLabel && <p className="text-xs text-gray-400">{opcionLabel}</p>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === "accepted" ? "bg-green-100 text-green-700" : b.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                            {b.status === "accepted" ? "Aceptado" : b.status === "sent" ? "Enviado" : "Borrador"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-500">{formatDate(b.created_at)}</td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/admin/budgets/${b.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                            Ver →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-gray-400 text-sm">No hay presupuestos aún</div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
