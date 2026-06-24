"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Search, Eye, ChevronDown, ChevronUp, Car } from "lucide-react"
import BudgetPreview from "./budget-preview"

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Client { id: string; full_name: string; rut?: string; phone?: string; email?: string; address?: string; city?: string }
interface Inspection {
  id: string
  vehicles?: { patente?: string; marca?: string; modelo?: string; anio?: number; version?: string; vin?: string; num_motor?: string; color?: string } | null
  clients?: { full_name?: string; phone?: string; email?: string; rut?: string } | null
  kilometraje?: number
}
interface BudgetItem {
  descripcion: string
  gestion: "MECÁNICO" | "CLIENTE" | "OTRO"
  gestion_custom: string
  val_repuesto: string
  val_mano_obra: string
  dcto_pct: string
  notas: string
}
interface VehiculoData {
  patente: string; marca: string; modelo: string; anio: string
  version: string; vin: string; num_motor: string; color: string; km: string
}
interface ClienteLibre {
  nombre: string; rut: string; telefono: string
  email: string; ciudad: string; direccion: string
}

interface Props {
  inspectorId: string
  clients: Client[]
  inspections: Inspection[]
  settings: Record<string, string>
}

// ── Helpers ────────────────────────────────────────────────────────────────
const emptyItem = (): BudgetItem => ({
  descripcion: "", gestion: "MECÁNICO", gestion_custom: "",
  val_repuesto: "", val_mano_obra: "", dcto_pct: "", notas: "",
})
const emptyVehiculo = (): VehiculoData => ({
  patente: "", marca: "", modelo: "", anio: "", version: "", vin: "", num_motor: "", color: "", km: "",
})
const emptyClienteLibre = (): ClienteLibre => ({
  nombre: "", rut: "", telefono: "", email: "", ciudad: "", direccion: "",
})

function fmt(n: number) { return Math.round(n).toLocaleString("es-CL") }
function num(s: string) { return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0 }

function calcItem(item: BudgetItem) {
  const rep = num(item.val_repuesto)
  const mo = num(item.val_mano_obra)
  const dcto = num(item.dcto_pct)
  return Math.round((rep + mo) * (1 - dcto / 100))
}

// ── Componente ─────────────────────────────────────────────────────────────
export default function BudgetForm({ clients, inspections, settings }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Cliente
  const [clientMode, setClientMode] = useState<"registrado" | "libre">("registrado")
  const [clientId, setClientId] = useState("")
  const [clienteLibre, setClienteLibre] = useState<ClienteLibre>(emptyClienteLibre())

  // Inspección
  const [inspectionId, setInspectionId] = useState("")

  // Vehículo
  const [vehiculo, setVehiculo] = useState<VehiculoData>(emptyVehiculo())
  const [buscarPatente, setBuscarPatente] = useState("")
  const [buscandoVehiculo, setBuscandoVehiculo] = useState(false)
  const [showVehicleManual, setShowVehicleManual] = useState(false)

  // Ítems (20 filas por defecto)
  const [items, setItems] = useState<BudgetItem[]>(() => Array.from({ length: 20 }, emptyItem))

  // Config
  const [ivaPct, setIvaPct] = useState(Number(settings.iva_pct ?? "19"))
  const [descuentoGlobal, setDescuentoGlobal] = useState("")
  const [formaPago, setFormaPago] = useState("Efectivo o Transferencia")
  const [vigenciaDias, setVigenciaDias] = useState("30")
  const [descripcionServicio, setDescripcionServicio] = useState("")

  // Pre-llenar desde inspección seleccionada
  useEffect(() => {
    if (!inspectionId) return
    const insp = inspections.find(i => i.id === inspectionId)
    if (!insp) return
    if (insp.vehicles) {
      const v = insp.vehicles
      setVehiculo({
        patente: v.patente ?? "", marca: v.marca ?? "", modelo: v.modelo ?? "",
        anio: v.anio ? String(v.anio) : "", version: v.version ?? "",
        vin: v.vin ?? "", num_motor: v.num_motor ?? "", color: v.color ?? "",
        km: insp.kilometraje ? String(insp.kilometraje) : "",
      })
      setShowVehicleManual(true)
    }
    if (insp.clients && clientMode === "registrado") {
      const found = clients.find(c => c.full_name === insp.clients?.full_name)
      if (found) setClientId(found.id)
    }
  }, [inspectionId])

  // Buscar vehículo por patente en DB
  async function buscarVehiculo() {
    const patente = buscarPatente.trim().toUpperCase()
    if (!patente) return
    setBuscandoVehiculo(true)
    try {
      const res = await fetch(`/api/vehicles?patente=${patente}`)
      if (res.ok) {
        const { vehicle } = await res.json()
        if (vehicle) {
          setVehiculo({
            patente: vehicle.patente ?? patente,
            marca: vehicle.marca ?? "", modelo: vehicle.modelo ?? "",
            anio: vehicle.anio ? String(vehicle.anio) : "", version: vehicle.version ?? "",
            vin: vehicle.vin ?? "", num_motor: vehicle.num_motor ?? "",
            color: vehicle.color ?? "", km: "",
          })
          setShowVehicleManual(true)
          toast.success("Vehículo encontrado")
        } else {
          setVehiculo({ ...emptyVehiculo(), patente })
          setShowVehicleManual(true)
          toast.info("Vehículo no encontrado — ingresa los datos manualmente")
        }
      }
    } catch { toast.error("Error al buscar vehículo") }
    finally { setBuscandoVehiculo(false) }
  }

  function updateItem(i: number, field: keyof BudgetItem, value: string) {
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function addItem() { setItems(p => [...p, emptyItem()]) }
  function removeItem(i: number) {
    if (items.length <= 1) return
    setItems(p => p.filter((_, idx) => idx !== i))
  }

  // Calcular totales
  const activeItems = items.filter(i => i.descripcion || num(i.val_repuesto) > 0 || num(i.val_mano_obra) > 0)
  const totalRepuestos = activeItems.reduce((s, i) => s + Math.round(num(i.val_repuesto) * (1 - num(i.dcto_pct) / 100)), 0)
  const totalMO = activeItems.reduce((s, i) => s + Math.round(num(i.val_mano_obra) * (1 - num(i.dcto_pct) / 100)), 0)
  const granTotal = totalRepuestos + totalMO
  const dtoGlobal = num(descuentoGlobal)
  const subtotalNeto = granTotal - dtoGlobal
  const ivaMonto = Math.round(subtotalNeto * ivaPct / 100)
  const total = subtotalNeto + ivaMonto

  // Datos para preview
  const previewData = {
    settings,
    cliente: clientMode === "registrado"
      ? clients.find(c => c.id === clientId)
      : { full_name: clienteLibre.nombre, rut: clienteLibre.rut, phone: clienteLibre.telefono, email: clienteLibre.email, city: clienteLibre.ciudad, address: clienteLibre.direccion },
    vehiculo,
    items: items.map((item, idx) => ({ ...item, orden: idx + 1, valor_item: calcItem(item) })),
    ivaPct, descuentoGlobal: dtoGlobal, formaPago, vigenciaDias, descripcionServicio,
    totalRepuestos, totalMO, granTotal, subtotalNeto, ivaMonto, total,
  }

  async function handleSubmit() {
    if (!vehiculo.patente) { toast.error("Ingresa la patente del vehículo"); return }
    const hasCliente = clientMode === "registrado" ? !!clientId : !!clienteLibre.nombre
    if (!hasCliente) { toast.error("Ingresa los datos del cliente"); return }
    if (!activeItems.length) { toast.error("Agrega al menos un ítem"); return }

    setSaving(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientMode === "registrado" ? clientId : null,
          clienteLibre: clientMode === "libre" ? clienteLibre : null,
          vehiculo,
          inspectionId: inspectionId || null,
          items: activeItems,
          ivaPct, descuentoGlobal: dtoGlobal,
          formaPago, vigenciaDias: Number(vigenciaDias),
          descripcionServicio,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Presupuesto ${data.numero} creado`)
      router.push(`/inspector/budgets/${data.budgetId}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear presupuesto")
    } finally {
      setSaving(false)
    }
  }

  // ── Render Preview ─────────────────────────────────────────────────────
  if (showPreview) {
    return (
      <BudgetPreview
        data={previewData}
        onBack={() => setShowPreview(false)}
        onFinalize={handleSubmit}
        saving={saving}
      />
    )
  }

  // ── Render Form ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">

      {/* ── CLIENTE ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Cliente</h3>
        <div className="flex gap-2 mb-4">
          {(["registrado", "libre"] as const).map(m => (
            <button key={m} type="button" onClick={() => setClientMode(m)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${clientMode === m ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {m === "registrado" ? "Cliente registrado" : "Cliente nuevo / sin registro"}
            </button>
          ))}
        </div>

        {clientMode === "registrado" ? (
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- Seleccionar cliente --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.rut ? ` · ${c.rut}` : ""}{c.phone ? ` · ${c.phone}` : ""}</option>)}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "nombre" as const, label: "Nombre *", placeholder: "Juan Pablo Rojas" },
              { key: "rut" as const, label: "RUT", placeholder: "12.345.678-9" },
              { key: "telefono" as const, label: "Teléfono", placeholder: "+56 9 1234 5678" },
              { key: "email" as const, label: "Email", placeholder: "cliente@email.cl" },
              { key: "ciudad" as const, label: "Ciudad", placeholder: "Santiago" },
              { key: "direccion" as const, label: "Dirección", placeholder: "Av. Ejemplo 123" },
            ].map(f => (
              <div key={f.key} className={f.key === "nombre" || f.key === "direccion" ? "col-span-2" : ""}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input type="text" value={clienteLibre[f.key]}
                  onChange={e => setClienteLibre(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── INSPECCIÓN VINCULADA ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Vincular inspección <span className="text-gray-400 font-normal text-sm">(opcional)</span></h3>
        <select value={inspectionId} onChange={e => setInspectionId(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">-- Sin inspección vinculada --</option>
          {inspections.map(i => (
            <option key={i.id} value={i.id}>
              {i.vehicles?.patente} · {i.vehicles?.marca} {i.vehicles?.modelo}
            </option>
          ))}
        </select>
        {inspectionId && <p className="text-xs text-blue-600 mt-1.5">Los datos del vehículo se pre-llenaron desde la inspección.</p>}
      </div>

      {/* ── VEHÍCULO ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Car size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-800">Vehículo</h3>
        </div>

        {/* Búsqueda por patente */}
        <div className="flex gap-2 mb-4">
          <input
            value={buscarPatente}
            onChange={e => setBuscarPatente(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && buscarVehiculo()}
            placeholder="Buscar por patente (ej: SFHP46)"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="button" onClick={buscarVehiculo} disabled={buscandoVehiculo}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
            <Search size={14} />
            {buscandoVehiculo ? "..." : "Buscar"}
          </button>
          <button type="button" onClick={() => { setShowVehicleManual(v => !v); if (!showVehicleManual) setVehiculo(p => ({ ...p, patente: buscarPatente || p.patente })) }}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition">
            {showVehicleManual ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Manual
          </button>
        </div>

        {showVehicleManual && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: "patente" as const, label: "Patente *", upper: true, span: 1 },
              { key: "marca" as const, label: "Marca", upper: false, span: 1 },
              { key: "modelo" as const, label: "Modelo", upper: false, span: 1 },
              { key: "anio" as const, label: "Año", upper: false, span: 1 },
              { key: "version" as const, label: "Versión", upper: false, span: 1 },
              { key: "color" as const, label: "Color", upper: false, span: 1 },
              { key: "km" as const, label: "KM actual", upper: false, span: 1 },
              { key: "vin" as const, label: "VIN / Chasis", upper: true, span: 1 },
              { key: "num_motor" as const, label: "N° Motor", upper: true, span: 1 },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input type="text" value={vehiculo[f.key]}
                  onChange={e => setVehiculo(p => ({ ...p, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        )}

        {vehiculo.patente && !showVehicleManual && (
          <div className="flex items-center gap-3 mt-2 p-3 bg-blue-50 rounded-lg">
            <Car size={16} className="text-blue-500" />
            <div>
              <p className="text-sm font-semibold text-gray-800 font-mono">{vehiculo.patente}</p>
              {vehiculo.marca && <p className="text-xs text-gray-500">{vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}</p>}
            </div>
            <button type="button" onClick={() => setShowVehicleManual(true)} className="ml-auto text-xs text-blue-600 hover:underline">Editar</button>
          </div>
        )}
      </div>

      {/* ── TABLA DE ÍTEMS ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Ítems del presupuesto</h3>
          <p className="text-xs text-gray-400 mt-0.5">Valores netos (sin IVA). IVA se calcula al final.</p>
        </div>

        {/* Header */}
        <div className="hidden lg:grid gap-1 px-3 py-2 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100"
          style={{ gridTemplateColumns: "2rem 1fr 7rem 6rem 6rem 4rem 5rem auto" }}>
          <span className="text-center">#</span>
          <span>Descripción / Trabajo</span>
          <span>Gestión</span>
          <span className="text-right">$ Repuesto</span>
          <span className="text-right">$ Mano obra</span>
          <span className="text-right">Dcto %</span>
          <span className="text-right">Total ítem</span>
          <span></span>
        </div>

        <div className="divide-y divide-gray-50">
          {items.map((item, i) => {
            const total_item = calcItem(item)
            const hasData = item.descripcion || num(item.val_repuesto) > 0 || num(item.val_mano_obra) > 0
            return (
              <div key={i} className={`px-3 py-2 ${!hasData ? "opacity-50 hover:opacity-100 focus-within:opacity-100" : ""}`}>
                {/* Desktop */}
                <div className="hidden lg:grid gap-1 items-start"
                  style={{ gridTemplateColumns: "2rem 1fr 7rem 6rem 6rem 4rem 5rem auto" }}>
                  <span className="text-xs text-gray-400 text-center pt-2.5">{i + 1}</span>

                  <div className="space-y-1">
                    <input placeholder={`Ítem ${i + 1}...`} value={item.descripcion}
                      onChange={e => updateItem(i, "descripcion", e.target.value)}
                      className="w-full px-2 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    {(item.gestion === "OTRO" || item.notas || hasData) && (
                      <input placeholder="Notas / descripción trabajo" value={item.notas}
                        onChange={e => updateItem(i, "notas", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <select value={item.gestion} onChange={e => updateItem(i, "gestion", e.target.value as any)}
                      className="w-full px-2 py-2 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option>MECÁNICO</option>
                      <option>CLIENTE</option>
                      <option>OTRO</option>
                    </select>
                    {item.gestion === "OTRO" && (
                      <input placeholder="Especificar..." value={item.gestion_custom}
                        onChange={e => updateItem(i, "gestion_custom", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    )}
                  </div>

                  {(["val_repuesto", "val_mano_obra", "dcto_pct"] as const).map(field => (
                    <input key={field} type="number" min="0" value={item[field]}
                      onChange={e => updateItem(i, field, e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-2 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  ))}

                  <div className="flex items-center justify-end pt-2">
                    <span className={`text-sm font-semibold ${total_item > 0 ? "text-gray-800" : "text-gray-300"}`}>
                      {total_item > 0 ? `$${fmt(total_item)}` : "—"}
                    </span>
                  </div>

                  <button type="button" onClick={() => removeItem(i)}
                    className="pt-2 p-1 text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Mobile */}
                <div className="lg:hidden space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}</span>
                    <input placeholder={`Ítem ${i + 1}...`} value={item.descripcion}
                      onChange={e => updateItem(i, "descripcion", e.target.value)}
                      className="flex-1 px-2 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button type="button" onClick={() => removeItem(i)} className="p-1 text-gray-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-7">
                    <select value={item.gestion} onChange={e => updateItem(i, "gestion", e.target.value as any)}
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none">
                      <option>MECÁNICO</option><option>CLIENTE</option><option>OTRO</option>
                    </select>
                    <div className="flex gap-1">
                      {(["val_repuesto", "val_mano_obra"] as const).map(field => (
                        <input key={field} type="number" min="0" value={item[field]}
                          onChange={e => updateItem(i, field, e.target.value)}
                          placeholder={field === "val_repuesto" ? "Repuesto" : "M.obra"}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-3 border-t border-gray-100">
          <button type="button" onClick={addItem}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition">
            <Plus size={15} /> Agregar fila
          </button>
        </div>
      </div>

      {/* ── TOTALES ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Totales</h3>
        <div className="space-y-2 text-sm max-w-xs ml-auto">
          <div className="flex justify-between text-gray-600">
            <span>Repuestos:</span><span>${fmt(totalRepuestos)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Mano de obra:</span><span>${fmt(totalMO)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-800 border-t pt-2">
            <span>Gran total (neto):</span><span>${fmt(granTotal)}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>Descuento global:</span>
            <div className="flex items-center gap-1">
              <span className="text-xs">$</span>
              <input type="number" min="0" value={descuentoGlobal}
                onChange={e => setDescuentoGlobal(e.target.value)} placeholder="0"
                className="w-28 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex justify-between text-gray-700 border-t pt-2">
            <span>Subtotal neto:</span><span>${fmt(subtotalNeto)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-600">
            <div className="flex items-center gap-1">
              <span>IVA</span>
              <input type="number" min="0" max="100" value={ivaPct}
                onChange={e => setIvaPct(Number(e.target.value))}
                className="w-12 px-1.5 py-0.5 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <span>%:</span>
            </div>
            <span>${fmt(ivaMonto)}</span>
          </div>
          <div className="flex justify-between text-lg font-black text-gray-900 border-t-2 pt-2">
            <span>TOTAL:</span><span>${fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* ── CONFIG PRESUPUESTO ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Forma de pago</label>
          <input type="text" value={formaPago} onChange={e => setFormaPago(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Válido por (días)</label>
          <input type="number" min="1" value={vigenciaDias} onChange={e => setVigenciaDias(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* ── DESCRIPCIÓN DEL SERVICIO ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-2">Descripción general del servicio</h3>
        <p className="text-xs text-gray-400 mb-3">Campo libre — describe los trabajos a realizar o detalla el presupuesto.</p>
        <textarea value={descripcionServicio} onChange={e => setDescripcionServicio(e.target.value)} rows={4}
          placeholder="Ej: Próximo cambio de aceite a los 32.320 km. Se detecta amortiguador trasero izquierdo con alta fuga de aceite..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {/* ── ACCIONES ────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button type="button" onClick={() => setShowPreview(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl font-medium text-sm transition">
          <Eye size={16} /> Vista previa
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition disabled:opacity-50 shadow-sm">
          {saving ? "Guardando..." : "Crear presupuesto"}
        </button>
      </div>
    </div>
  )
}
