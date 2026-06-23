import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, rut, phone, email, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Clientes">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Clientes</h2>
            <p className="text-sm text-gray-500">{clients?.length ?? 0} registrados</p>
          </div>
          <Link
            href="/admin/clients/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <Plus size={15} /> Nuevo cliente
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {clients && clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-3 py-3 text-left">RUT</th>
                    <th className="px-3 py-3 text-left">Teléfono</th>
                    <th className="px-3 py-3 text-left">Email</th>
                    <th className="px-3 py-3 text-left">Registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{c.full_name}</td>
                      <td className="px-3 py-3 text-gray-600">{c.rut ?? "—"}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {c.phone ? (
                          <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline">{c.phone}</a>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">{c.email}</a>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-sm mb-3">No hay clientes registrados</p>
              <Link href="/admin/clients/new" className="text-blue-600 text-sm hover:underline font-medium">
                Crear el primero →
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
