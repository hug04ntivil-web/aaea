"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Filter, X } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { RowActions } from "@/components/admin/row-actions"

interface Inspector { id: string; full_name: string }

interface Props {
  budgets: any[]
  inspectors: Inspector[]
}

export default function BudgetsFilterTable({ budgets, inspectors }: Props) {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterInspector, setFilterInspector] = useState("all")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return budgets.filter(b => {
      if (filterStatus !== "all" && b.status !== filterStatus) return false
      if (filterInspector !== "all" && b.profiles?.full_name !== filterInspector) return false
      if (!q) return true
      return (
        b.numero?.toLowerCase().includes(q) ||
        b.clients?.full_name?.toLowerCase().includes(q) ||
        b.profiles?.full_name?.toLowerCase().includes(q) ||
        b.vehicle_patente?.toLowerCase().includes(q) ||
        b.cliente_nombre?.toLowerCase().includes(q)
      )
    })
  }, [budgets, search, filterStatus, filterInspector])

  function clearFilters() {
    setSearch("")
    setFilterStatus("all")
    setFilterInspector("all")
  }

  const hasFilters = search || filterStatus !== "all" || filterInspector !== "all"

  const totalFiltrado = filtered.reduce((s, b) => s + (Number(b.total) || 0), 0)
  const aceptadosFiltrado = filtered.filter(b => b.status === "accepted").reduce((s, b) => s + (Number(b.total) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Número, cliente, patente…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtro estado */}
        <div className="relative">
          <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="sent">Enviado</option>
            <option value="accepted">Aceptado</option>
          </select>
        </div>

        {/* Filtro inspector */}
        {inspectors.length > 0 && (
          <select
            value={filterInspector}
            onChange={e => setFilterInspector(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los inspectores</option>
            {inspectors.map(i => (
              <option key={i.id} value={i.full_name}>{i.full_name}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white transition"
          >
            <X size={12} /> Limpiar
          </button>
        )}

        <span className="text-sm text-gray-400">{filtered.length} de {budgets.length}</span>
      </div>

      {/* Resumen totales */}
      {filtered.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-[var(--text-2)]">
            Total filtrado: <span className="font-bold text-[var(--text-1)]">${totalFiltrado.toLocaleString("es-CL")}</span>
          </span>
          {aceptadosFiltrado > 0 && (
            <span className="text-[var(--text-2)]">
              Aceptados: <span className="font-bold text-green-600">${aceptadosFiltrado.toLocaleString("es-CL")}</span>
            </span>
          )}
        </div>
      )}

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-subtle)] text-xs text-[var(--text-2)] uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-3 py-3 text-left">Cliente</th>
                  <th className="px-3 py-3 text-left">Inspector</th>
                  <th className="px-3 py-3 text-left">Patente</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-3 py-3 text-left">Fecha</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((b: any) => (
                  <tr key={b.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[var(--text-1)]">{b.numero}</td>
                    <td className="px-3 py-3 text-[var(--text-1)]">{b.clients?.full_name ?? b.cliente_nombre ?? "—"}</td>
                    <td className="px-3 py-3 text-[var(--text-2)]">{b.profiles?.full_name ?? "—"}</td>
                    <td className="px-3 py-3 text-[var(--text-2)]">{b.vehicle_patente ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-bold text-[var(--text-1)]">
                      ${(b.total ?? 0).toLocaleString("es-CL")}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === "accepted" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : b.status === "sent" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                        {b.status === "accepted" ? "Aceptado" : b.status === "sent" ? "Enviado" : "Borrador"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-2)]">{formatDate(b.created_at)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/admin/budgets/${b.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                          Ver →
                        </Link>
                        <RowActions deleteUrl={`/api/admin/budgets/${b.id}`} deleteLabel="¿Eliminar este presupuesto?" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-[var(--text-3)] text-sm">
            {hasFilters ? "Sin resultados para los filtros aplicados" : "No hay presupuestos aún"}
          </div>
        )}
      </div>
    </div>
  )
}
