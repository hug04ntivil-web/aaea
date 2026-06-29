"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Plus, FileText, Send, CheckCircle, ChevronDown } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import { formatDate } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = { draft: "Borrador", sent: "Enviado", accepted: "Aprobado" }
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
}
const STATUS_NEXT: Record<string, { label: string; value: string; color: string }[]> = {
  draft: [{ label: "Marcar como Enviado", value: "sent", color: "text-blue-600" }],
  sent:  [
    { label: "Marcar como Borrador", value: "draft",    color: "text-gray-600" },
    { label: "Marcar como Aprobado", value: "accepted", color: "text-green-600" },
  ],
  accepted: [],
}

export default function BudgetsPage() {
  const router = useRouter()
  const [budgets, setBudgets] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [changing, setChanging] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/budgets/list").then(r => r.json()).then(d => {
      setBudgets(d.budgets ?? [])
      setProfile(d.profile)
      setLoading(false)
    })
    // Marcar presupuestos aceptados como vistos
    fetch("/api/budgets/unread", { method: "PATCH" }).catch(() => {})
  }, [])

  async function changeStatus(id: string, status: string) {
    setChanging(id)
    setOpenMenu(null)
    try {
      const res = await fetch(`/api/budgets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBudgets(prev => prev.map(b => b.id === id ? { ...b, status } : b))
      toast.success(`Estado cambiado a "${STATUS_LABEL[status]}"`)
    } catch (err: any) {
      toast.error(err.message ?? "Error al cambiar estado")
    } finally { setChanging(null) }
  }

  if (loading) return (
    <AppShell role="inspector" userName="" pageTitle="Presupuestos">
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </AppShell>
  )

  const borradores = budgets.filter(b => b.status === "draft").length
  const enviados   = budgets.filter(b => b.status === "sent").length
  const aprobados  = budgets.filter(b => b.status === "accepted").length

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle="Presupuestos">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{budgets.length} presupuesto(s)</p>
          <Link href="/inspector/budgets/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
            <Plus size={15} /> Nuevo
          </Link>
        </div>

        {/* Resumen por estado */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Borradores", value: borradores, icon: FileText,    color: "text-gray-500",  bg: "bg-gray-50",  border: "border-gray-200" },
            { label: "Enviados",   value: enviados,   icon: Send,        color: "text-blue-600",  bg: "bg-blue-50",  border: "border-blue-200" },
            { label: "Aprobados",  value: aprobados,  icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
              <s.icon size={16} className={`${s.color} mx-auto mb-1`} />
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {budgets.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {budgets.map((b: any) => {
                const actions = STATUS_NEXT[b.status] ?? []
                const clientName = b.clients?.full_name ?? b.cliente_nombre ?? "—"
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                    {/* Link al detalle */}
                    <Link href={`/inspector/budgets/${b.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800">{b.numero}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.status]}`}>
                          {STATUS_LABEL[b.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {clientName} · {b.vehicle_patente ?? ""} · {formatDate(b.created_at)}
                      </p>
                    </Link>

                    {/* Total */}
                    <div className="text-right flex-shrink-0 mr-1">
                      {b.total > 0
                        ? <p className="text-sm font-bold text-gray-800">${Number(b.total).toLocaleString("es-CL")}</p>
                        : <p className="text-xs text-gray-400">—</p>
                      }
                    </div>

                    {/* Menú de estado */}
                    {actions.length > 0 && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === b.id ? null : b.id) }}
                          disabled={changing === b.id}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition disabled:opacity-50">
                          {changing === b.id ? "..." : <><ChevronDown size={13} /></>}
                        </button>
                        {openMenu === b.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-48">
                            {actions.map(a => (
                              <button key={a.value} onClick={() => changeStatus(b.id, a.value)}
                                className={`w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition ${a.color} font-medium`}>
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm mb-3">No hay presupuestos aún</p>
              <Link href="/inspector/budgets/new" className="text-blue-600 text-sm hover:underline font-medium">
                Crear el primero →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Click fuera para cerrar menú */}
      {openMenu && <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />}
    </AppShell>
  )
}
