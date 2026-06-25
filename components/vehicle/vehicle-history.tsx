import Link from "next/link"
import { History, ClipboardList, Receipt } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Inspection {
  id: string
  fecha_inspeccion: string
  nota_final: number | null
  status: string
}

interface Budget {
  id: string
  numero: string
  total: number
  status: string
  created_at: string
}

interface Props {
  patente: string
  inspections: Inspection[]
  budgets: Budget[]
  currentInspectionId?: string
}

const notaColor = (n: number | null) =>
  !n ? "text-gray-400" : n >= 6.5 ? "text-green-600" : n >= 5 ? "text-yellow-500" : "text-red-500"

const statusPill = (s: string) => {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    completed: "bg-green-100 text-green-700",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
  }
  const label: Record<string, string> = {
    draft: "Borrador", completed: "Completa", sent: "Enviada/Enviado", accepted: "Aprobado",
  }
  return { cls: map[s] ?? "bg-gray-100 text-gray-500", lbl: label[s] ?? s }
}

export default function VehicleHistory({ patente, inspections, budgets, currentInspectionId }: Props) {
  const otherInspections = inspections.filter(i => i.id !== currentInspectionId)
  const hasHistory = otherInspections.length > 0 || budgets.length > 0

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm p-5">
      <h3 className="font-semibold text-[var(--text-1)] flex items-center gap-2 mb-4">
        <History size={16} className="text-blue-500" />
        Historial del vehículo — {patente}
      </h3>

      {!hasHistory && (
        <p className="text-sm text-[var(--text-3)] italic">Sin historial previo para este vehículo.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Inspecciones anteriores */}
        {otherInspections.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ClipboardList size={12} /> Inspecciones ({otherInspections.length})
            </p>
            <div className="space-y-1.5">
              {otherInspections.slice(0, 5).map(ins => {
                const { cls, lbl } = statusPill(ins.status)
                return (
                  <Link key={ins.id} href={`/inspector/inspections/${ins.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-subtle)] hover:border-blue-300 border border-transparent transition text-sm">
                    <span className="text-[var(--text-2)]">{formatDate(ins.fecha_inspeccion)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs ${notaColor(ins.nota_final)}`}>
                        {ins.nota_final ? `${ins.nota_final}/7` : "--"}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{lbl}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Presupuestos */}
        {budgets.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Receipt size={12} /> Presupuestos ({budgets.length})
            </p>
            <div className="space-y-1.5">
              {budgets.slice(0, 5).map(b => {
                const { cls, lbl } = statusPill(b.status)
                return (
                  <Link key={b.id} href={`/inspector/budgets/${b.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-subtle)] hover:border-blue-300 border border-transparent transition text-sm">
                    <span className="text-[var(--text-2)] font-mono text-xs">{b.numero}</span>
                    <div className="flex items-center gap-2">
                      {b.total > 0 && <span className="text-xs text-[var(--text-2)] font-medium">${Number(b.total).toLocaleString("es-CL")}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{lbl}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
