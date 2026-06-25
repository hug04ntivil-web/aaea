"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Filter, X } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { RowActions } from "@/components/admin/row-actions"
import ExportExcelButton from "@/components/admin/export-excel-button"

const COLUMNS = [
  { key: "vehicles.patente",   header: "Patente" },
  { key: "vehicles.marca",     header: "Marca" },
  { key: "vehicles.modelo",    header: "Modelo" },
  { key: "vehicles.anio",      header: "Año" },
  { key: "clients.full_name",  header: "Cliente" },
  { key: "profiles.full_name", header: "Inspector" },
  { key: "fecha_inspeccion",   header: "Fecha", format: (v: any) => formatDate(v) },
  { key: "nota_final",         header: "Nota Final" },
  { key: "status",             header: "Estado", format: (v: string) =>
    v === "draft" ? "Borrador" : v === "completed" ? "Completa" : "Enviada"
  },
]

interface Inspector { id: string; full_name: string }

interface Props {
  inspections: any[]
  inspectors: Inspector[]
}

export default function InspectionsFilterTable({ inspections, inspectors }: Props) {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterInspector, setFilterInspector] = useState("all")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return inspections.filter(ins => {
      if (filterStatus !== "all" && ins.status !== filterStatus) return false
      if (filterInspector !== "all" && ins.profiles?.full_name !== filterInspector) return false
      if (!q) return true
      return (
        ins.vehicles?.patente?.toLowerCase().includes(q) ||
        ins.clients?.full_name?.toLowerCase().includes(q) ||
        ins.profiles?.full_name?.toLowerCase().includes(q) ||
        ins.vehicles?.marca?.toLowerCase().includes(q) ||
        ins.vehicles?.modelo?.toLowerCase().includes(q)
      )
    })
  }, [inspections, search, filterStatus, filterInspector])

  function clearFilters() {
    setSearch("")
    setFilterStatus("all")
    setFilterInspector("all")
  }

  const hasFilters = search || filterStatus !== "all" || filterInspector !== "all"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Patente, cliente, inspector…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <option value="completed">Completa</option>
              <option value="sent">Enviada</option>
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

          {/* Limpiar */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white transition"
            >
              <X size={12} /> Limpiar
            </button>
          )}

          <span className="text-sm text-gray-400">
            {filtered.length} de {inspections.length}
          </span>
        </div>

        <ExportExcelButton data={filtered} filename="inspecciones" columns={COLUMNS} label="Exportar Excel" />
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-subtle)] text-xs text-[var(--text-2)] uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Vehículo</th>
                  <th className="px-3 py-3 text-left">Cliente</th>
                  <th className="px-3 py-3 text-left">Inspector</th>
                  <th className="px-3 py-3 text-left">Fecha</th>
                  <th className="px-3 py-3 text-center">Nota</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((ins: any) => (
                  <tr key={ins.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--text-1)]">{ins.vehicles?.patente}</p>
                      <p className="text-xs text-[var(--text-2)]">{ins.vehicles?.marca} {ins.vehicles?.modelo} {ins.vehicles?.anio}</p>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-1)]">{ins.clients?.full_name ?? "—"}</td>
                    <td className="px-3 py-3 text-[var(--text-2)]">{ins.profiles?.full_name ?? "—"}</td>
                    <td className="px-3 py-3 text-[var(--text-2)]">{formatDate(ins.fecha_inspeccion)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold ${ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-500" : "text-red-500"}`}>
                        {ins.nota_final ? `${ins.nota_final}/7.0` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ins.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : ins.status === "sent" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                        {ins.status === "draft" ? "Borrador" : ins.status === "completed" ? "Completa" : "Enviada"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/admin/inspections/${ins.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                          Ver →
                        </Link>
                        <RowActions deleteUrl={`/api/admin/inspections/${ins.id}`} deleteLabel="¿Eliminar esta inspección?" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-[var(--text-3)] text-sm">
            {hasFilters ? "Sin resultados para los filtros aplicados" : "No hay inspecciones aún"}
          </div>
        )}
      </div>
    </div>
  )
}
