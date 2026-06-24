"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2, Send, FileText } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import BudgetDetail from "@/components/budget/budget-detail"

export default function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState("")
  const [budget, setBudget] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  useEffect(() => {
    params.then(p => setId(p.id))
  }, [params])

  useEffect(() => {
    if (!id) return
    fetch(`/api/budgets/${id}`).then(r => r.json()).then(d => {
      setBudget(d.budget)
      setProfile(d.profile)
      setSettings(d.settings ?? {})
    })
  }, [id])

  async function changeStatus(status: string) {
    setChangingStatus(true)
    try {
      const res = await fetch(`/api/budgets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBudget((b: any) => ({ ...b, status }))
      toast.success(`Estado cambiado a "${status === "sent" ? "Enviado" : status === "draft" ? "Borrador" : "Aprobado"}"`)
    } catch (err: any) {
      toast.error(err.message ?? "Error al cambiar estado")
    } finally { setChangingStatus(false) }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este presupuesto? Esta acción no se puede deshacer.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Presupuesto eliminado")
      router.push("/inspector/budgets")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Error al eliminar")
    } finally { setDeleting(false) }
  }

  if (!budget || !profile) {
    return (
      <AppShell role="inspector" userName="" pageTitle="Cargando...">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  const isDraft = budget.status === "draft" || budget.status === "sent"
  const isAccepted = budget.status === "accepted"

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle={`Presupuesto ${budget.numero}`}>
      {/* Actions bar */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAccepted && (
            <span className="text-xs text-green-700 bg-green-100 px-3 py-1.5 rounded-full font-medium">
              ✓ Aceptado — no editable
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Cambiar estado */}
          {budget.status === "draft" && (
            <button onClick={() => changeStatus("sent")} disabled={changingStatus}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition disabled:opacity-50">
              <Send size={13} /> {changingStatus ? "..." : "Marcar Enviado"}
            </button>
          )}
          {budget.status === "sent" && (
            <>
              <button onClick={() => changeStatus("draft")} disabled={changingStatus}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition disabled:opacity-50">
                <FileText size={13} /> Volver a Borrador
              </button>
              <button onClick={() => changeStatus("accepted")} disabled={changingStatus}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition disabled:opacity-50">
                ✓ {changingStatus ? "..." : "Marcar Aprobado"}
              </button>
            </>
          )}
          {/* Editar / Eliminar solo en borrador o enviado */}
          {isDraft && (
            <>
              <button onClick={() => router.push(`/inspector/budgets/${id}/edit`)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition">
                <Pencil size={13} /> Editar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition disabled:opacity-50">
                <Trash2 size={13} /> {deleting ? "..." : "Eliminar"}
              </button>
            </>
          )}
        </div>
      </div>
      <BudgetDetail budget={budget} isPublic={false} settings={settings} />
    </AppShell>
  )
}
