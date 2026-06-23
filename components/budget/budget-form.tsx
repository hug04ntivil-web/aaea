"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

interface Client { id: string; full_name: string; phone?: string }
interface Inspection { id: string; vehicles?: { patente?: string; marca?: string; modelo?: string } | null }

interface Props {
  inspectorId: string
  clients: Client[]
  inspections: Inspection[]
}

interface BudgetItem {
  descripcion: string
  cantidad: number
  precio_genuino: number
  precio_korea: number
  precio_multi: number
}

const emptyItem = (): BudgetItem => ({ descripcion: "", cantidad: 1, precio_genuino: 0, precio_korea: 0, precio_multi: 0 })

function fmt(n: number) { return Math.round(n).toLocaleString("es-CL") }

export default function BudgetForm({ clients, inspections }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState("")
  const [inspectionId, setInspectionId] = useState("")
  const [notes, setNotes] = useState("")
  const [ivaPct] = useState(19)
  const [manoDeObra, setManoDeObra] = useState(0)
  const [items, setItems] = useState<BudgetItem[]>([emptyItem()])

  function addItem() { setItems(p => [...p, emptyItem()]) }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: keyof BudgetItem, value: string | number) {
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const subtotalGenuino = items.reduce((s, i) => s + i.precio_genuino * i.cantidad, 0)
  const subtotalKorea = items.reduce((s, i) => s + i.precio_korea * i.cantidad, 0)
  const subtotalMulti = items.reduce((s, i) => s + i.precio_multi * i.cantidad, 0)
  const iva = ivaPct / 100
  const totalGenuino = Math.round((subtotalGenuino + manoDeObra) * (1 + iva))
  const totalKorea = Math.round((subtotalKorea + manoDeObra) * (1 + iva))
  const totalMulti = Math.round((subtotalMulti + manoDeObra) * (1 + iva))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) { toast.error("Selecciona un cliente"); return }
    if (items.some(i => !i.descripcion)) { toast.error("Completa la descripción de todos los ítems"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, inspectionId: inspectionId || null, items, notes, ivaPct, manoDeObra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Presupuesto ${data.numero} creado`)
      router.push(`/inspector/budgets/${data.budgetId}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear presupuesto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl mx-auto">
      {/* Cliente e inspección */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)} required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- Seleccionar cliente --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vincular a inspección (opcional)</label>
          <select value={inspectionId} onChange={e => setInspectionId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- Sin inspección --</option>
            {inspections.map(i => <option key={i.id} value={i.id}>{i.vehicles?.patente} · {i.vehicles?.marca} {i.vehicles?.modelo}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla de ítems */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Ítems del presupuesto</h3>
          <p className="text-xs text-gray-400 mt-0.5">Ingresa los 3 precios por repuesto — el cliente podrá elegir la opción</p>
        </div>

        {/* Header tabla */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>Descripción</span>
          <span className="text-center">Cant.</span>
          <span className="text-right">$ Genuino</span>
          <span className="text-right">$ Korea</span>
          <span className="text-right">$ Multi</span>
          <span></span>
        </div>

        <div className="divide-y divide-gray-50">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 p-3 items-center">
              <input
                placeholder="Ej: Pastillas de freno delanteras"
                value={item.descripcion}
                onChange={e => updateItem(i, "descripcion", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input type="number" min="1" value={item.cantidad}
                onChange={e => updateItem(i, "cantidad", parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(["precio_genuino", "precio_korea", "precio_multi"] as const).map(field => (
                <input key={field} type="number" min="0" value={item[field] || ""}
                  onChange={e => updateItem(i, field, parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ))}
              <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                className="p-2 text-gray-300 hover:text-red-500 transition disabled:opacity-30">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100">
          <button type="button" onClick={addItem}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition">
            <Plus size={15} /> Agregar ítem
          </button>
        </div>
      </div>

      {/* Mano de obra */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-1">Mano de obra / Instalación</h3>
        <p className="text-xs text-gray-400 mb-3">Tarifa fija de instalación — se suma igual a las 3 opciones de repuesto</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">$</span>
          <input
            type="number" min="0" value={manoDeObra || ""}
            onChange={e => setManoDeObra(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-48 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">(neto, sin IVA)</span>
        </div>
      </div>

      {/* Totales */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Resumen de precios (IVA {ivaPct}% incluido)</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Genuino", sub: subtotalGenuino, total: totalGenuino, color: "border-blue-200 bg-blue-50" },
            { label: "Korea", sub: subtotalKorea, total: totalKorea, color: "border-yellow-200 bg-yellow-50" },
            { label: "Multi origen", sub: subtotalMulti, total: totalMulti, color: "border-green-200 bg-green-50" },
          ].map(o => (
            <div key={o.label} className={`rounded-xl border-2 ${o.color} p-4 text-center`}>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">{o.label}</p>
              <p className="text-xs text-gray-500">Repuestos: ${fmt(o.sub)}</p>
              {manoDeObra > 0 && <p className="text-xs text-gray-500">M. de obra: ${fmt(manoDeObra)}</p>}
              <p className="text-xl font-black text-gray-800 mt-1">${fmt(o.total)}</p>
              <p className="text-xs text-gray-400">con IVA</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder="Condiciones, plazos de entrega, garantías..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition disabled:opacity-50 shadow-sm">
        {loading ? "Creando presupuesto..." : "Crear presupuesto"}
      </button>
    </form>
  )
}
