"use client"

import { useState } from "react"
import { Sparkles, Loader2, Copy, Check, RefreshCw } from "lucide-react"
import { toast } from "sonner"

type Style = "compacto" | "estandar" | "detallado"

const STYLES: { key: Style; label: string; desc: string }[] = [
  { key: "compacto",  label: "Compacto",  desc: "3 oraciones · rápido de leer" },
  { key: "estandar",  label: "Estándar",  desc: "3 párrafos · ~250 palabras" },
  { key: "detallado", label: "Detallado", desc: "Informe completo por secciones" },
]

interface Props {
  inspectionId: string
}

export default function AiSummaryButton({ inspectionId }: Props) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState("")
  const [activeStyle, setActiveStyle] = useState<Style | null>(null)
  const [copied, setCopied] = useState(false)

  async function generate(style: Style) {
    setLoading(true)
    setActiveStyle(style)
    try {
      const res = await fetch("/api/ai/inspection-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionId, style }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error desconocido")
      setSummary(data.summary)
    } catch (err: any) {
      toast.error(err.message ?? "Error al generar resumen")
      setActiveStyle(null)
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

  const activeStyleLabel = STYLES.find(s => s.key === activeStyle)?.label ?? ""

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" />
          Resumen con IA
        </h3>
        {summary && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-violet-600 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full font-medium">
              {activeStyleLabel}
            </span>
            <button onClick={copy} className="flex items-center gap-1.5 text-xs text-[var(--text-2)] hover:text-[var(--text-1)] transition">
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        )}
      </div>

      {/* Botones de estilo */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {STYLES.map(s => (
          <button
            key={s.key}
            onClick={() => generate(s.key)}
            disabled={loading}
            className={`flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition disabled:opacity-60 ${
              activeStyle === s.key && summary
                ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                : "bg-white dark:bg-slate-800 text-[var(--text-1)] border-[var(--border)] hover:border-violet-400 hover:text-violet-600"
            }`}
          >
            {loading && activeStyle === s.key
              ? <Loader2 size={14} className="animate-spin" />
              : <Sparkles size={14} />
            }
            <span>{loading && activeStyle === s.key ? "Generando..." : s.label}</span>
            <span className={`text-xs font-normal ${activeStyle === s.key && summary ? "text-violet-200" : "text-[var(--text-3)]"}`}>
              {s.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Resultado */}
      {summary && !loading && (
        <div className="space-y-3">
          <div className="bg-[var(--bg-subtle)] rounded-lg p-4 border border-[var(--border)]">
            <p className="text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
          <p className="text-xs text-[var(--text-3)] text-center">
            Haz clic en otro estilo para generar una versión diferente
          </p>
        </div>
      )}

      {!summary && !loading && (
        <p className="text-sm text-[var(--text-3)] text-center">
          Selecciona un formato para generar el resumen
        </p>
      )}
    </div>
  )
}
