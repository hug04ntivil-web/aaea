"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  data: any[]
  filename: string
  columns: { key: string; header: string; format?: (v: any, row: any) => any }[]
  label?: string
}

export default function ExportExcelButton({ data, filename, columns, label = "Exportar Excel" }: Props) {
  const [loading, setLoading] = useState(false)

  async function exportToExcel() {
    setLoading(true)
    try {
      const XLSX = await import("xlsx")
      const rows = data.map(row => {
        const r: Record<string, any> = {}
        columns.forEach(col => {
          const val = col.key.split(".").reduce((o, k) => o?.[k], row)
          r[col.header] = col.format ? col.format(val, row) : (val ?? "")
        })
        return r
      })
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Datos")

      // Ajustar ancho columnas
      const maxWidths = columns.map(col => ({
        wch: Math.min(40, Math.max(col.header.length + 4, 12))
      }))
      ws["!cols"] = maxWidths

      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`)
      toast.success("Archivo descargado")
    } catch (err: any) {
      toast.error("Error al exportar: " + (err?.message ?? "desconocido"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={exportToExcel} disabled={loading || !data.length}
      className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      {loading ? "Exportando..." : label}
    </button>
  )
}
