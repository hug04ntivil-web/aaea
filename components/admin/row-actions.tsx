"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"
import Link from "next/link"

interface RowActionsProps {
  deleteUrl: string
  editUrl?: string
  deleteLabel?: string
  onDeleted?: () => void
}

export function RowActions({ deleteUrl, editUrl, deleteLabel = "¿Eliminar este registro?", onDeleted }: RowActionsProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(deleteUrl, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Error al eliminar")
        setConfirming(false)
        return
      }
      toast.success("Eliminado correctamente")
      if (onDeleted) {
        onDeleted()
      } else {
        router.refresh()
      }
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-gray-500">{deleteLabel}</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? "..." : "Sí, eliminar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg border border-gray-200 transition"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      {editUrl && (
        <Link
          href={editUrl}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          title="Editar"
        >
          <Pencil size={14} />
        </Link>
      )}
      <button
        onClick={() => setConfirming(true)}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        title="Eliminar"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
