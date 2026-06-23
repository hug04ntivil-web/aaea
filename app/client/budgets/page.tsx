import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default async function ClientBudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()
  const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user!.id).single()

  const { data: budgets } = client
    ? await supabase
        .from("budgets")
        .select(`id, numero, total, total_genuino, total_korea, total_multi, status, opcion_aceptada, created_at, profiles(full_name)`)
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
    : { data: [] }

  return (
    <AppShell role="client" userName={profile?.full_name ?? ""} pageTitle="Mis presupuestos">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Mis presupuestos</h2>
          <p className="text-sm text-gray-500">{budgets?.length ?? 0} presupuestos</p>
        </div>

        <div className="space-y-3">
          {budgets && budgets.length > 0 ? budgets.map((b: any) => (
            <Link key={b.id} href={`/client/budgets/${b.id}`}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-200 transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{b.numero}</p>
                  <p className="text-xs text-gray-400">{formatDate(b.created_at)} · Inspector: {b.profiles?.full_name}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${b.status === "accepted" ? "bg-green-100 text-green-700" : b.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                  {b.status === "accepted" ? "Aceptado" : b.status === "sent" ? "Pendiente" : "Borrador"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Genuino", total: b.total_genuino, active: b.opcion_aceptada === "genuino" },
                  { label: "Korea", total: b.total_korea, active: b.opcion_aceptada === "korea" },
                  { label: "Multi", total: b.total_multi, active: b.opcion_aceptada === "multi" },
                ].map(o => (
                  <div key={o.label} className={`rounded-lg p-2 ${o.active ? "bg-green-100 ring-1 ring-green-400" : "bg-gray-50"}`}>
                    <p className="text-xs text-gray-500">{o.label}</p>
                    <p className={`text-sm font-bold ${o.active ? "text-green-700" : "text-gray-800"}`}>
                      ${(o.total ?? 0).toLocaleString("es-CL")}
                    </p>
                  </div>
                ))}
              </div>
            </Link>
          )) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
              Tu inspector enviará presupuestos aquí.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
