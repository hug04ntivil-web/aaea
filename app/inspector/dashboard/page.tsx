import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { Plus, ClipboardList, Receipt, Users, Clock, FileText, Send, CheckCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function InspectorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()

  const [{ count: myInspections }, { count: myClients }, { data: budgets }] = await Promise.all([
    supabase.from("inspections").select("*", { count: "exact", head: true }).eq("inspector_id", user!.id),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("created_by", user!.id),
    supabase.from("budgets")
      .select("id, status, total")
      .eq("inspector_id", user!.id),
  ])

  const totalBudgets  = budgets?.length ?? 0
  const borradores    = budgets?.filter(b => b.status === "draft").length ?? 0
  const enviados      = budgets?.filter(b => b.status === "sent").length ?? 0
  const aprobados     = budgets?.filter(b => b.status === "accepted").length ?? 0

  const { data: recent } = await supabase
    .from("inspections")
    .select(`id, fecha_inspeccion, nota_final, status, vehicles(patente, marca, modelo), clients(full_name)`)
    .eq("inspector_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: recentBudgets } = await supabase
    .from("budgets")
    .select(`id, numero, status, total, created_at, clients(full_name), cliente_nombre, vehicle_patente`)
    .eq("inspector_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(4)

  const statusLabel: Record<string, string> = { draft: "Borrador", sent: "Enviado", accepted: "Aprobado" }
  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
  }

  return (
    <AppShell role="inspector" userName={profile?.full_name ?? ""} pageTitle="Dashboard">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Hola, {profile?.full_name?.split(" ")[0]} 👋</h2>
            <p className="text-sm text-gray-500">Tu resumen de actividad</p>
          </div>
          <Link href="/inspector/inspections/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
            <Plus size={16} /> Nueva inspección
          </Link>
        </div>

        {/* Stats generales */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Inspecciones", value: myInspections ?? 0, icon: ClipboardList, color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "Presupuestos", value: totalBudgets,        icon: Receipt,       color: "text-violet-600",  bg: "bg-violet-50" },
            { label: "Clientes",     value: myClients ?? 0,      icon: Users,         color: "text-emerald-600", bg: "bg-emerald-50" },
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

        {/* Resumen presupuestos por estado */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Receipt size={15} className="text-violet-500" /> Estado de presupuestos
            </h3>
            <Link href="/inspector/budgets" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Borradores",  value: borradores, icon: FileText,    color: "text-gray-500",   bg: "bg-gray-50",   border: "border-gray-200" },
              { label: "Enviados",    value: enviados,   icon: Send,        color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
              { label: "Aprobados",   value: aprobados,  icon: CheckCircle, color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
                <s.icon size={18} className={`${s.color} mx-auto mb-1`} />
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Últimos presupuestos */}
          {recentBudgets && recentBudgets.length > 0 && (
            <div className="mt-3 divide-y divide-gray-50 border-t border-gray-100">
              {recentBudgets.map((b: any) => (
                <Link key={b.id} href={`/inspector/budgets/${b.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 px-1 transition rounded">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{b.numero}</p>
                    <p className="text-xs text-gray-400">
                      {b.clients?.full_name ?? b.cliente_nombre ?? "—"} · {b.vehicle_patente ?? ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.total > 0 && (
                      <p className="text-xs font-semibold text-gray-700">${Number(b.total).toLocaleString("es-CL")}</p>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[b.status]}`}>
                      {statusLabel[b.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Últimas inspecciones */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" /> Últimas inspecciones
            </h3>
            <Link href="/inspector/inspections" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recent && recent.length > 0 ? (
              recent.map((ins: any) => (
                <Link key={ins.id} href={`/inspector/inspections/${ins.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo}
                    </p>
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
                <Link href="/inspector/inspections/new" className="text-sm text-blue-600 hover:underline font-medium">
                  Crear primera inspección →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
