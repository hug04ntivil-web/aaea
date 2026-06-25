"use client"

import { useState } from "react"
import { Sparkles, Loader2, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface Props {
  inspectionId: string
}

export default function AiSummaryButton({ inspectionId }: Props) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState("")
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/inspection-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error desconocido")
      setSummary(data.summary)
    } catch (err: any) {
      toast.error(err.message ?? "Error al generar resumen")
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    toast.success("Copiado al portapapeles")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" />
          Resumen IA
        </h3>
        {summary && (
          <button onClick={copy} className="flex items-center gap-1.5 text-xs text-[var(--text-2)] hover:text-[var(--text-1)] transition">
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        )}
      </div>

      {!summary ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-[var(--text-2)]">
            Genera un resumen profesional en lenguaje natural basado en los ítems inspeccionados.
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
              : <><Sparkles size={15} /> Generar resumen con IA</>
            }
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-wrap">{summary}</p>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 disabled:opacity-60 transition"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? "Regenerando..." : "Regenerar"}
          </button>
        </div>
      )}
    </div>
  )
}
