"use client"

import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Props {
  budgetId: string
  completedAt?: string | null
  completedKm?: number | null
}

export default function CompleteBudgetButton({ budgetId, completedAt, completedKm }: Props) {
  const [loading, setLoading] = useState(false)
  const [showKm, setShowKm] = useState(false)
  const [km, setKm] = useState("")
  const router = useRouter()

  if (completedAt) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
        <CheckCircle2 size={16} className="text-green-500" />
        <div>
          <p className="font-semibold">Trabajo completado</p>
          <p className="text-xs opacity-80">
            {new Date(completedAt).toLocaleDateString("es-CL")}
            {completedKm ? ` · ${completedKm.toLocaleString("es-CL")} km` : ""}
          </p>
        </div>
      </div>
    )
  }

  async function markCompleted() {
    setLoading(true)
    try {
      const res = await fetch(`/api/budgets/${budgetId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ km: km ? Number(km) : null }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      toast.success("¡Trabajo marcado como completado!")
      router.refresh()
    } catch {
      toast.error("Error al marcar como completado")
    } finally {
      setLoading(false)
      setShowKm(false)
    }
  }

  if (!showKm) {
    return (
      <button onClick={() => setShowKm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition">
        <CheckCircle2 size={16} /> Marcar trabajo completado
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="number"
        value={km}
        onChange={e => setKm(e.target.value)}
        placeholder="Km al completar (opcional)"
        className="px-3 py-2 border border-gray-200 dark:border-slate-600 bg-[var(--bg-surface)] text-[var(--text-1)] rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button onClick={markCompleted} disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        Confirmar
      </button>
      <button onClick={() => setShowKm(false)} className="text-sm text-[var(--text-2)] hover:text-[var(--text-1)]">
        Cancelar
      </button>
    </div>
  )
}
