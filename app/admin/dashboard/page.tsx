import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { ClipboardList, Users, Receipt, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { formatDate } from "@/lib/utils"
import DashboardCharts from "@/components/dashboard/dashboard-charts"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"

export const dynamic = "force-dynamic"

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const [
    { count: totalInspections },
    { count: totalClients },
    { data: allBudgets },
    { data: inspectors },
    { data: recentInspections },
  ] = await Promise.all([
    supabase.from("inspections").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("budgets").select("id, status, total, created_at, inspector_id"),
    supabase.from("profiles").select("id, full_name").eq("role", "inspector").order("full_name"),
    supabase.from("inspections")
      .select(`id, fecha_inspeccion, nota_final, status, vehicles(patente, marca, modelo), clients(full_name), profiles(full_name)`)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const totalBudgets  = allBudgets?.length ?? 0
  const acceptedCount = allBudgets?.filter(b => b.status === "accepted").length ?? 0
  const borradores    = allBudgets?.filter(b => b.status === "draft").length ?? 0
  const enviados      = allBudgets?.filter(b => b.status === "sent").length ?? 0

  // Gráficos — últimos 6 meses
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i))

  const { data: inspsByMonth } = await supabase
    .from("inspections").select("created_at")
    .gte("created_at", startOfMonth(months[0]).toISOString())

  const monthly = months.map(m => {
    const label = format(m, "MMM", { locale: es })
    const start = startOfMonth(m).toISOString()
    const end   = endOfMonth(m).toISOString()
    return {
      mes: label.charAt(0).toUpperCase() + label.slice(1),
      inspecciones: (inspsByMonth ?? []).filter(i => i.created_at >= start && i.created_at <= end).length,
      presupuestos: (allBudgets ?? []).filter(b => b.created_at >= start && b.created_at <= end).length,
    }
  })

  const statusData = [
    { name: "Borrador",  value: borradores,   color: "#94a3b8" },
    { name: "Enviado",   value: enviados,      color: "#3b82f6" },
    { name: "Aprobado",  value: acceptedCount, color: "#22c55e" },
  ].filter(s => s.value > 0)

  const acceptedBudgets = allBudgets?.filter(b => b.status === "accepted") ?? []
  const sentBudgets     = allBudgets?.filter(b => b.status === "sent" || b.status === "accepted") ?? []
  const ticketPromedio  = acceptedBudgets.length
    ? acceptedBudgets.reduce((s, b) => s + (Number(b.total) || 0), 0) / acceptedBudgets.length
    : 0
  const tasaAceptacion  = sentBudgets.length ? (acceptedCount / sentBudgets.length) * 100 : 0

  // Stats por inspector
  const { data: inspsByInspector } = await supabase
    .from("inspections")
    .select("inspector_id, profiles(full_name)")
    .gte("created_at", startOfMonth(months[0]).toISOString())

  const inspectorStats = (inspectors ?? []).map(ins => {
    const total = (inspsByInspector ?? []).filter((i: any) => i.inspector_id === ins.id).length
    const budgs = (allBudgets ?? []).filter(b => b.inspector_id === ins.id)
    const aceptados = budgs.filter(b => b.status === "accepted").length
    return { ...ins, inspections: total, budgets: budgs.length, accepted: aceptados }
  }).sort((a, b) => b.inspections - a.inspections)

  const stats = [
    { label: "Inspecciones", value: totalInspections ?? 0, icon: ClipboardList, textColor: "text-blue-600",    bgLight: "bg-blue-50 dark:bg-blue-900/20",    href: "/admin/inspections" },
    { label: "Clientes",     value: totalClients ?? 0,     icon: Users,         textColor: "text-emerald-600", bgLight: "bg-emerald-50 dark:bg-emerald-900/20", href: "/admin/clients" },
    { label: "Presupuestos", value: totalBudgets,          icon: Receipt,       textColor: "text-violet-600",  bgLight: "bg-violet-50 dark:bg-violet-900/20",  href: "/admin/budgets" },
    { label: "Aceptados",    value: acceptedCount,         icon: CheckCircle,   textColor: "text-green-600",   bgLight: "bg-green-50 dark:bg-green-900/20",    href: "/admin/budgets" },
  ]

  return (
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)]">Bienvenido, {profile?.full_name?.split(" ")[0]} 👋</h2>
          <p className="text-sm text-[var(--text-2)] mt-0.5">Resumen general del sistema</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <Link key={s.label} href={s.href}
              className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 ${s.bgLight} rounded-lg flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.textColor} />
              </div>
              <p className="text-2xl font-bold text-[var(--text-1)]">{s.value}</p>
              <p className="text-sm text-[var(--text-2)] mt-0.5">{s.label}</p>
            </Link>
          ))}
        </div>

        <DashboardCharts
          monthly={monthly}
          statusData={statusData}
          ticketPromedio={ticketPromedio > 0 ? ticketPromedio : undefined}
          tasaAceptacion={sentBudgets.length > 0 ? tasaAceptacion : undefined}
        />

        {/* Rendimiento por inspector */}
        {inspectorStats.length > 0 && (
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 p-4 border-b border-[var(--border)]">
              <TrendingUp size={16} className="text-[var(--text-3)]" />
              <h3 className="font-semibold text-[var(--text-1)]">Rendimiento por inspector</h3>
              <span className="text-xs text-[var(--text-3)] ml-1">(últimos 6 meses)</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {inspectorStats.map(ins => (
                <div key={ins.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                      {ins.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-[var(--text-1)]">{ins.full_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center min-w-[52px]">
                      <p className="font-bold text-blue-600">{ins.inspections}</p>
                      <p className="text-[10px] text-[var(--text-3)]">Insp.</p>
                    </div>
                    <div className="text-center min-w-[52px]">
                      <p className="font-bold text-violet-600">{ins.budgets}</p>
                      <p className="text-[10px] text-[var(--text-3)]">Presup.</p>
                    </div>
                    <div className="text-center min-w-[52px]">
                      <p className="font-bold text-green-600">{ins.accepted}</p>
                      <p className="text-[10px] text-[var(--text-3)]">Acept.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimas inspecciones — clickables */}
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[var(--text-3)]" />
              <h3 className="font-semibold text-[var(--text-1)]">Últimas inspecciones</h3>
            </div>
            <Link href="/admin/inspections" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentInspections && recentInspections.length > 0 ? (
              recentInspections.map((ins: any) => (
                <Link key={ins.id} href={`/admin/inspections/${ins.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--bg-subtle)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-1)] truncate">
                      {ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo}
                    </p>
                    <p className="text-xs text-[var(--text-2)]">{ins.clients?.full_name} · {ins.profiles?.full_name} · {formatDate(ins.fecha_inspeccion)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className={`text-sm font-bold ${ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-500" : "text-red-500"}`}>
                      {ins.nota_final ? `${ins.nota_final}/7.0` : "--"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ins.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : ins.status === "sent" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                      {ins.status === "draft" ? "Borrador" : ins.status === "completed" ? "Completa" : "Enviada"}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-[var(--text-3)] text-sm">No hay inspecciones aún</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
