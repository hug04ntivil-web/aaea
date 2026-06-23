import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import { ClipboardList, Users, Receipt, CheckCircle, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const [{ count: totalInspections }, { count: totalClients }, { count: totalBudgets }, { count: acceptedBudgets }] = await Promise.all([
    supabase.from("inspections").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("budgets").select("*", { count: "exact", head: true }),
    supabase.from("budgets").select("*", { count: "exact", head: true }).eq("status", "accepted"),
  ])

  const { data: recentInspections } = await supabase
    .from("inspections")
    .select(`id, fecha_inspeccion, nota_final, status, vehicles(patente, marca, modelo), clients(full_name), profiles(full_name)`)
    .order("created_at", { ascending: false })
    .limit(5)

  const stats = [
    { label: "Inspecciones", value: totalInspections ?? 0, icon: ClipboardList, textColor: "text-blue-600", bgLight: "bg-blue-50" },
    { label: "Clientes", value: totalClients ?? 0, icon: Users, textColor: "text-emerald-600", bgLight: "bg-emerald-50" },
    { label: "Presupuestos", value: totalBudgets ?? 0, icon: Receipt, textColor: "text-violet-600", bgLight: "bg-violet-50" },
    { label: "Aceptados", value: acceptedBudgets ?? 0, icon: CheckCircle, textColor: "text-green-600", bgLight: "bg-green-50" },
  ]

  return (
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Bienvenido, {profile?.full_name?.split(" ")[0]} 👋</h2>
          <p className="text-sm text-gray-500 mt-0.5">Resumen general del sistema</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className={`w-10 h-10 ${s.bgLight} rounded-lg flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.textColor} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <Clock size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800">Últimas inspecciones</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentInspections && recentInspections.length > 0 ? (
              recentInspections.map((ins: any) => (
                <div key={ins.id} className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo}
                    </p>
                    <p className="text-xs text-gray-500">{ins.clients?.full_name} · {ins.profiles?.full_name} · {formatDate(ins.fecha_inspeccion)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className={`text-sm font-bold ${ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                      {ins.nota_final ? `${ins.nota_final}/7.0` : "--"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ins.status === "completed" ? "bg-green-100 text-green-700" : ins.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {ins.status === "draft" ? "Borrador" : ins.status === "completed" ? "Completa" : "Enviada"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">No hay inspecciones aún</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
