import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const { data: budgets } = await supabase
    .from("budgets")
    .select(`id, numero, total_genuino, total_korea, total_multi, total, status, opcion_aceptada, created_at, clients(full_name)`)
    .eq("inspector_id", user!.id)
    .order("created_at", { ascending: false })

  const statusLabel: Record<string, string> = { draft: "Borrador", sent: "Enviado", accepted: "Aceptado" }
  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
  }

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle="Presupuestos">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{budgets?.length ?? 0} presupuesto(s)</p>
          <Link href="/inspector/budgets/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
            <Plus size={15} /> Nuevo
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {budgets && budgets.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {budgets.map((b: any) => (
                <Link key={b.id} href={`/inspector/budgets/${b.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-800">{b.numero}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[b.status]}`}>
                        {statusLabel[b.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{b.clients?.full_name} · {formatDate(b.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {b.status === "accepted" ? (
                      <p className="text-sm font-bold text-green-600">${b.total?.toLocaleString("es-CL")}</p>
                    ) : (
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p>G: <span className="font-semibold text-gray-700">${b.total_genuino?.toLocaleString("es-CL")}</span></p>
                        <p>K: <span className="font-semibold text-gray-700">${b.total_korea?.toLocaleString("es-CL")}</span></p>
                        <p>M: <span className="font-semibold text-gray-700">${b.total_multi?.toLocaleString("es-CL")}</span></p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm mb-3">No hay presupuestos aún</p>
              <Link href="/inspector/budgets/new" className="text-blue-600 text-sm hover:underline font-medium">Crear el primero →</Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
