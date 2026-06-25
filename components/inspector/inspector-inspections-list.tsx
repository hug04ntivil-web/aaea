"use client"

import { useState } from "react"
import Link from "next/link"
import { Trash2, Pencil, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface Inspection {
  id: string
  fecha_inspeccion: string
  nota_final: number
  status: string
  vehicles: { patente: string; marca: string; modelo: string; anio: string } | null
  clients: { full_name: string } | null
}

interface Props {
  inspections: Inspection[]
}

export default function InspectorInspectionsList({ inspections: initial }: Props) {
  const [inspections, setInspections] = useState(initial)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const deleteTarget = inspections.find(i => i.id === deleteId)

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/inspector/inspections/${deleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "Error al eliminar")
      }
      setInspections(prev => prev.filter(i => i.id !== deleteId))
      toast.success("Inspección eliminada")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <>
      {/* Modal confirmación de borrado */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              <h3 className="font-bold text-gray-800">
                {deleteTarget?.status === "draft" ? "¿Eliminar borrador?" : "⚠ Eliminar inspección completa"}
              </h3>
            </div>
            {deleteTarget?.status !== "draft" && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-xs text-red-700">
                Esta inspección ya está <strong>completa</strong>. Al eliminarla se perderán el informe, las notas y todos los ítems evaluados de forma permanente.
              </div>
            )}
            <p className="text-sm text-gray-500 mb-5">
              {deleteTarget?.vehicles?.patente && (
                <span className="font-semibold text-gray-700">{deleteTarget.vehicles.patente} · {deleteTarget.vehicles.marca} {deleteTarget.vehicles.modelo}</span>
              )}
              <br />Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition"
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {inspections.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {inspections.map((ins) => {
              const isDraft = ins.status === "draft"
              return (
                <div key={ins.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  {/* Score */}
                  <Link href={`/inspector/inspections/${ins.id}`} className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${isDraft ? "bg-gray-100" : ins.nota_final >= 6.5 ? "bg-green-50" : ins.nota_final >= 5 ? "bg-yellow-50" : "bg-red-50"}`}>
                      <span className={`text-lg font-black leading-none ${isDraft ? "text-gray-400" : ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                        {isDraft ? "—" : (ins.nota_final > 0 ? ins.nota_final : "--")}
                      </span>
                      <span className="text-xs text-gray-400">/7</span>
                    </div>
                  </Link>

                  {/* Info */}
                  <Link href={`/inspector/inspections/${ins.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {ins.vehicles?.patente} · {ins.vehicles?.marca} {ins.vehicles?.modelo} {ins.vehicles?.anio}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {ins.clients?.full_name} · {formatDate(ins.fecha_inspeccion)}
                    </p>
                  </Link>

                  {/* Badge + Acciones */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ins.status === "completed" ? "bg-green-100 text-green-700" : ins.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {ins.status === "draft" ? "Borrador" : ins.status === "completed" ? "Completa" : "Enviada"}
                    </span>

                    {isDraft && (
                      <Link
                        href={`/inspector/inspections/${ins.id}/edit`}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        title="Continuar borrador"
                      >
                        <Pencil size={15} />
                      </Link>
                    )}

                    <button
                      onClick={() => setDeleteId(ins.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Eliminar inspección"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm mb-3">No hay inspecciones aún</p>
            <Link href="/inspector/inspections/new" className="text-blue-600 text-sm hover:underline font-medium">
              Crear la primera →
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
