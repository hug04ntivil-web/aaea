import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { Plus, ClipboardList, Receipt, Users, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function InspectorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()

  const [{ count: myInspections }, { count: myBudgets }, { count: myClients }] = await Promise.all([
    supabase.from("inspections").select("*", { count: "exact", head: true }).eq("inspector_id", user!.id),
    supabase.from("budgets").select("*", { count: "exact", head: true }).eq("inspector_id", user!.id),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("created_by", user!.id),
  ])

  const { data: recent } = await supabase
    .from("inspections")
    .select(`id, fecha_inspeccion, nota_final, status, vehicles(patente, marca, modelo), clients(full_name)`)
    .eq("inspector_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <AppShell role="inspector" userName={profile?.full_name ?? ""} pageTitle="Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Hola, {profile?.full_name?.split(" ")[0]} 👋</h2>
            <p className="text-sm text-gray-500">Tu resumen de actividad</p>
          </div>
          <Link href="/inspector/inspections/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
            <Plus size={16} /> Nueva inspección
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Inspecciones", value: myInspections ?? 0, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Presupuestos", value: myBudgets ?? 0, icon: Receipt, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Clientes", value: myClients ?? 0, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <s.icon size={20} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Clock size={16} className="text-gray-400" /> Últimas inspecciones</h3>
            <Link href="/inspector/inspections" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recent && recent.length > 0 ? (
              recent.map((ins: any) => (
                <Link key={ins.id} href={`/inspector/inspections/${ins.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo}</p>
                    <p className="text-xs text-gray-500">{ins.clients?.full_name} · {formatDate(ins.fecha_inspeccion)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                      {ins.nota_final ? `${ins.nota_final}/7` : "--"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ins.status === "completed" ? "bg-green-100 text-green-700" : ins.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {ins.status === "draft" ? "Borrador" : ins.status === "completed" ? "Completa" : "Enviada"}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm mb-3">No tienes inspecciones aún</p>
                <Link href="/inspector/inspections/new" className="text-sm text-blue-600 hover:underline font-medium">Crear primera inspección →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
