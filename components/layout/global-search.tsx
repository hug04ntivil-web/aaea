"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Car, User, FileText, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchResult {
  type: "inspection" | "budget" | "client" | "vehicle"
  id: string
  title: string
  subtitle: string
  url: string
}

const TYPE_ICON = {
  inspection: ClipboardList,
  budget: FileText,
  client: User,
  vehicle: Car,
}

const TYPE_LABEL = {
  inspection: "Inspección",
  budget: "Presupuesto",
  client: "Cliente",
  vehicle: "Vehículo",
}

const TYPE_COLOR = {
  inspection: "text-blue-600 bg-blue-50",
  budget: "text-green-600 bg-green-50",
  client: "text-purple-600 bg-purple-50",
  vehicle: "text-orange-600 bg-orange-50",
}

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(""); setResults([]) }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setSelected(0)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 300)
  }

  function navigate(result: SearchResult) {
    setOpen(false)
    router.push(result.url)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    else if (e.key === "Enter" && results[selected]) navigate(results[selected])
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-400 text-sm hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
        aria-label="Buscar (Ctrl+K)"
        title="Buscar (Ctrl+K)"
      >
        <Search size={14} />
        <span className="hidden sm:inline text-xs">Buscar...</span>
        <kbd className="hidden sm:inline text-[10px] px-1 py-0.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-gray-400">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleChange}
                onKeyDown={onKeyDown}
                placeholder="Buscar patente, cliente, presupuesto..."
                className="flex-1 bg-transparent text-gray-800 dark:text-slate-100 text-sm outline-none placeholder:text-gray-400"
              />
              {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-2">
                {results.map((r, i) => {
                  const Icon = TYPE_ICON[r.type]
                  return (
                    <li key={r.id + r.type}>
                      <button
                        onClick={() => navigate(r)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors",
                          i === selected && "bg-blue-50 dark:bg-slate-800"
                        )}
                      >
                        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", TYPE_COLOR[r.type])}>
                          <Icon size={14} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">{r.title}</p>
                          <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {TYPE_LABEL[r.type]}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : query.length >= 2 && !loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Sin resultados para &ldquo;{query}&rdquo;
              </div>
            ) : query.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                Escribe al menos 2 caracteres para buscar
              </div>
            ) : null}

            <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 flex items-center gap-3 text-[10px] text-gray-400">
              <span>↑↓ navegar</span>
              <span>↵ abrir</span>
              <span>Esc cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
