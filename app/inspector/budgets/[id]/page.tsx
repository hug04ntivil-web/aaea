"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2, Send, FileText, Link2, Download, CheckCircle2, Sparkles, Loader2, Copy } from "lucide-react"
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
  const [completing, setCompleting] = useState(false)
  const [showKm, setShowKm] = useState(false)
  const [km, setKm] = useState("")
  const [genDesc, setGenDesc] = useState(false)
  const [aiDesc, setAiDesc] = useState("")

  useEffect(() => { params.then(p => setId(p.id)) }, [params])

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
      const labels: Record<string, string> = { sent: "Enviado", draft: "Borrador", accepted: "Aprobado" }
      toast.success(`Estado cambiado a "${labels[status]}"`)
    } catch (err: any) {
      toast.error(err.message ?? "Error al cambiar estado")
    } finally { setChangingStatus(false) }
  }

  async function markCompleted() {
    setCompleting(true)
    try {
      const res = await fetch(`/api/budgets/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ km: km ? Number(km) : null }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      setBudget((b: any) => ({
        ...b,
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_km: km ? Number(km) : null,
      }))
      toast.success("¡Trabajo marcado como completado!")
      setShowKm(false)
    } catch { toast.error("Error al marcar como completado") }
    finally { setCompleting(false) }
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
    } catch (err: any) {
      toast.error(err.message ?? "Error al eliminar")
    } finally { setDeleting(false) }
  }

  function copyPublicLink() {
    if (!budget?.public_token) return
    const url = `${window.location.origin}/q/${budget.public_token}`
    navigator.clipboard.writeText(url)
    toast.success("Enlace copiado — compártelo con el cliente")
  }

  function openPdf() {
    window.open(`/api/pdf/budget/${id}`, "_blank")
  }

  async function generateAiDesc() {
    if (!budget?.budget_items?.length) { toast.error("Sin ítems para analizar"); return }
    setGenDesc(true)
    try {
      const res = await fetch("/api/ai/budget-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: budget.budget_items,
          vehiculo: { marca: budget.vehicle_marca, modelo: budget.vehicle_modelo, anio: budget.vehicle_anio, patente: budget.vehicle_patente },
          cliente: budget.clients?.full_name ?? budget.cliente_nombre,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiDesc(data.description)
    } catch (err: any) {
      toast.error(err.message ?? "Error al generar")
    } finally { setGenDesc(false) }
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

  const canEdit      = budget.status === "draft" || budget.status === "sent"
  const isAccepted   = budget.status === "accepted"
  const isCompleted  = budget.status === "completed"

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle={`Presupuesto ${budget.numero}`}>
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Barra de acciones */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-3 flex flex-wrap items-center gap-2">

          {/* Estado badge */}
          {isCompleted && (
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 px-3 py-1.5 rounded-full font-medium">
              <CheckCircle2 size={13} /> Trabajo completado {budget.completed_at ? `· ${new Date(budget.completed_at).toLocaleDateString("es-CL")}` : ""} {budget.completed_km ? `· ${Number(budget.completed_km).toLocaleString("es-CL")} km` : ""}
            </span>
          )}
          {isAccepted && !isCompleted && (
            <span className="text-xs text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 px-3 py-1.5 rounded-full font-medium">✓ Aprobado por el cliente</span>
          )}

          {/* Cambiar estado */}
          {budget.status === "draft" && (
            <button onClick={() => changeStatus("sent")} disabled={changingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 text-blue-700 rounded-lg text-xs font-medium transition disabled:opacity-50">
              <Send size={13} /> {changingStatus ? "..." : "Marcar Enviado"}
            </button>
          )}
          {budget.status === "sent" && (
            <>
              <button onClick={() => changeStatus("draft")} disabled={changingStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 text-gray-600 rounded-lg text-xs font-medium transition disabled:opacity-50">
                <FileText size={13} /> Volver Borrador
              </button>
              <button onClick={() => changeStatus("accepted")} disabled={changingStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 text-green-700 rounded-lg text-xs font-medium transition disabled:opacity-50">
                ✓ {changingStatus ? "..." : "Marcar Aprobado"}
              </button>
            </>
          )}

          {/* Marcar completado (solo cuando aceptado) */}
          {isAccepted && !isCompleted && !showKm && (
            <button onClick={() => setShowKm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition">
              <CheckCircle2 size={13} /> Trabajo completado
            </button>
          )}
          {showKm && (
            <div className="flex items-center gap-2 flex-wrap">
              <input type="number" value={km} onChange={e => setKm(e.target.value)}
                placeholder="Km (opcional)"
                className="px-2 py-1.5 border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] rounded-lg text-xs w-36 focus:outline-none focus:ring-1 focus:ring-green-500" />
              <button onClick={markCompleted} disabled={completing}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-medium">
                {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Confirmar
              </button>
              <button onClick={() => setShowKm(false)} className="text-xs text-[var(--text-2)]">Cancelar</button>
            </div>
          )}

          <div className="flex-1" />

          {/* Compartir con cliente */}
          {budget.public_token && (
            <button onClick={copyPublicLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 text-violet-700 rounded-lg text-xs font-medium transition">
              <Copy size={13} /> Copiar enlace cliente
            </button>
          )}

          {/* PDF */}
          <button onClick={openPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 text-slate-600 rounded-lg text-xs font-medium transition">
            <Download size={13} /> PDF
          </button>

          {/* Editar / Eliminar */}
          {canEdit && (
            <>
              <button onClick={() => router.push(`/inspector/budgets/${id}/edit`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 text-slate-600 rounded-lg text-xs font-medium transition">
                <Pencil size={13} /> Editar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 text-red-700 rounded-lg text-xs font-medium transition disabled:opacity-50">
                <Trash2 size={13} /> {deleting ? "..." : "Eliminar"}
              </button>
            </>
          )}
        </div>

        {/* Cómo aceptar — solo cuando está enviado */}
        {budget.status === "sent" && budget.public_token && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1 flex items-center gap-2">
              <Link2 size={14} /> ¿Cómo acepta el cliente?
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              Copia el enlace de abajo y envíaselo por WhatsApp o email. El cliente abre el link en su celular, elige la opción que prefiere y hace clic en "Aceptar presupuesto".
            </p>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
              <code className="text-xs text-blue-600 dark:text-blue-400 flex-1 truncate">
                {typeof window !== "undefined" ? window.location.origin : ""}/q/{budget.public_token}
              </code>
              <button onClick={copyPublicLink} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Detalle del presupuesto */}
        <BudgetDetail budget={budget} isPublic={false} settings={settings} />

        {/* Resumen IA */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
              <Sparkles size={15} className="text-violet-500" /> Descripción con IA
            </h3>
            {aiDesc && (
              <button onClick={() => navigator.clipboard.writeText(aiDesc).then(() => toast.success("Copiado"))}
                className="text-xs text-[var(--text-2)] flex items-center gap-1 hover:text-[var(--text-1)]">
                <Copy size={12} /> Copiar
              </button>
            )}
          </div>
          {!aiDesc ? (
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-2)]">Genera una descripción profesional del servicio basada en los ítems de este presupuesto.</p>
              <button onClick={generateAiDesc} disabled={genDesc}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                {genDesc ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Sparkles size={14} /> Generar con IA</>}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-2)] leading-relaxed">{aiDesc}</p>
              <button onClick={generateAiDesc} disabled={genDesc}
                className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1">
                {genDesc ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {genDesc ? "Regenerando..." : "Regenerar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
