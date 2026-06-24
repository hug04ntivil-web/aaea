"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Search, Eye, ChevronDown, ChevronUp, Car } from "lucide-react"
import BudgetPreview from "./budget-preview"

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
  rep_original: string
  rep_alternativo: string
  rep_otro: string
  val_mano_obra: string
  dcto_pct: string
  notas: string
}
interface VehiculoData {
  patente: string; marca: string; modelo: string; anio: string
  version: string; vin: string; num_motor: string; color: string; km: string
}
interface ClienteLibre {
  nombre: string; rut: string; telefono: string; email: string; ciudad: string; direccion: string
}
interface Props {
  inspectorId: string
  clients: Client[]
  inspections: Inspection[]
  settings: Record<string, string>
  initialBudget?: any
  mode?: "create" | "edit"
}

const emptyItem = (): BudgetItem => ({
  descripcion: "", gestion: "MECÁNICO", gestion_custom: "",
  rep_original: "", rep_alternativo: "", rep_otro: "",
  val_mano_obra: "", dcto_pct: "", notas: "",
})
const emptyVehiculo = (): VehiculoData => ({
  patente: "", marca: "", modelo: "", anio: "", version: "", vin: "", num_motor: "", color: "", km: "",
})
const emptyClienteLibre = (): ClienteLibre => ({
  nombre: "", rut: "", telefono: "", email: "", ciudad: "", direccion: "",
})

function fmt(n: number) { return Math.round(n).toLocaleString("es-CL") }
function num(s: string) { return parseFloat(s.replace(/[.]/g, "").replace(",", ".")) || 0 }

function calcItem3(item: BudgetItem) {
  const orig = num(item.rep_original)
  const alt  = num(item.rep_alternativo)
  const otro = num(item.rep_otro)
  const mo   = num(item.val_mano_obra)
  const dcto = num(item.dcto_pct)
  const f = 1 - dcto / 100
  return {
    orig:  Math.round((orig + mo) * f),
    alt:   Math.round((alt  + mo) * f),
    otro:  Math.round((otro + mo) * f),
  }
}

export default function BudgetForm({ clients, inspections, settings, initialBudget, mode = "create" }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  function initFromBudget(b: any) {
    const client = b.clients ?? null
    const hasRegistered = !!b.client_id
    const initItems: BudgetItem[] = (b.budget_items ?? [])
      .sort((a: any, z: any) => a.orden - z.orden)
      .map((i: any) => ({
        descripcion: i.descripcion ?? "",
        gestion: i.gestion ?? "MECÁNICO",
        gestion_custom: i.gestion_custom ?? "",
        rep_original: i.rep_genuino ? String(i.rep_genuino) : "",
        rep_alternativo: i.rep_korea ? String(i.rep_korea) : "",
        rep_otro: i.rep_multi ? String(i.rep_multi) : "",
        val_mano_obra: i.val_mano_obra ? String(i.val_mano_obra) : "",
        dcto_pct: i.dcto_pct ? String(i.dcto_pct) : "",
        notas: i.notas ?? "",
      }))
    return {
      clientMode: hasRegistered ? "registrado" as const : "libre" as const,
      clientId: b.client_id ?? "",
      clienteLibre: {
        nombre: b.cliente_nombre ?? "", rut: b.cliente_rut ?? "",
        telefono: b.cliente_telefono ?? "", email: b.cliente_email ?? "",
        ciudad: b.cliente_ciudad ?? "", direccion: b.cliente_direccion ?? "",
      },
      vehiculo: {
        patente: b.vehicle_patente ?? "", marca: b.vehicle_marca ?? "",
        modelo: b.vehicle_modelo ?? "", anio: b.vehicle_anio ? String(b.vehicle_anio) : "",
        version: b.vehicle_version ?? "", vin: b.vehicle_vin ?? "",
        num_motor: b.vehicle_num_motor ?? "", color: b.vehicle_color ?? "",
        km: b.vehicle_km ? String(b.vehicle_km) : "",
      },
      items: initItems.length ? initItems : Array.from({ length: 10 }, emptyItem),
      ivaPct: Number(b.iva_pct ?? 19),
      descuentoGlobal: b.descuento_global ? String(b.descuento_global) : "",
      formaPago: b.forma_pago ?? "Efectivo o Transferencia",
      vigenciaDias: b.vigencia_dias ? String(b.vigencia_dias) : "30",
      descripcionServicio: b.descripcion_servicio ?? "",
      notasCotizacion: b.notas_cotizacion ?? "",
    }
  }

  const init = initialBudget ? initFromBudget(initialBudget) : null

  const [clientMode, setClientMode] = useState<"registrado" | "libre">(init?.clientMode ?? "registrado")
  const [clientId, setClientId] = useState(init?.clientId ?? "")
  const [clienteLibre, setClienteLibre] = useState<ClienteLibre>(init?.clienteLibre ?? emptyClienteLibre())
  const [inspectionId, setInspectionId] = useState(initialBudget?.inspection_id ?? "")
  const [vehiculo, setVehiculo] = useState<VehiculoData>(init?.vehiculo ?? emptyVehiculo())
  const [buscarPatente, setBuscarPatente] = useState("")
  const [buscandoVehiculo, setBuscandoVehiculo] = useState(false)
  const [showVehicleManual, setShowVehicleManual] = useState(!!initialBudget?.vehicle_patente)
  const [items, setItems] = useState<BudgetItem[]>(init?.items ?? Array.from({ length: 10 }, emptyItem))
  const [ivaPct, setIvaPct] = useState(init?.ivaPct ?? Number(settings.iva_pct ?? "19"))
  const [descuentoGlobal, setDescuentoGlobal] = useState(init?.descuentoGlobal ?? "")
  const [formaPago, setFormaPago] = useState(init?.formaPago ?? "Efectivo o Transferencia")
  const [vigenciaDias, setVigenciaDias] = useState(init?.vigenciaDias ?? "30")
  const [descripcionServicio, setDescripcionServicio] = useState(init?.descripcionServicio ?? "")
  const [notasCotizacion, setNotasCotizacion] = useState(init?.notasCotizacion ?? "")

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

  async function buscarVehiculo() {
    const patente = buscarPatente.trim().toUpperCase()
    if (!patente) return
    setBuscandoVehiculo(true)
    try {
      const res = await fetch(`/api/vehicles?patente=${patente}`)
      if (res.ok) {
        const { vehicle } = await res.json()
        if (vehicle) {
          setVehiculo({ patente: vehicle.patente ?? patente, marca: vehicle.marca ?? "", modelo: vehicle.modelo ?? "", anio: vehicle.anio ? String(vehicle.anio) : "", version: vehicle.version ?? "", vin: vehicle.vin ?? "", num_motor: vehicle.num_motor ?? "", color: vehicle.color ?? "", km: "" })
          setShowVehicleManual(true)
          toast.success("Vehículo encontrado")
        } else {
          setVehiculo({ ...emptyVehiculo(), patente })
          setShowVehicleManual(true)
          toast.info("No encontrado — ingresa los datos manualmente")
        }
      }
    } catch { toast.error("Error al buscar") }
    finally { setBuscandoVehiculo(false) }
  }

  function updateItem(i: number, field: keyof BudgetItem, value: string) {
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function addItem() { setItems(p => [...p, emptyItem()]) }
  function removeItem(i: number) { if (items.length > 1) setItems(p => p.filter((_, idx) => idx !== i)) }

  const activeItems = items.filter(i => i.descripcion || num(i.rep_original) > 0 || num(i.rep_alternativo) > 0 || num(i.rep_otro) > 0 || num(i.val_mano_obra) > 0)

  const totals = activeItems.reduce((acc, item) => {
    const { orig, alt, otro } = calcItem3(item)
    return { orig: acc.orig + orig, alt: acc.alt + alt, otro: acc.otro + otro }
  }, { orig: 0, alt: 0, otro: 0 })

  const dto = num(descuentoGlobal)
  const subOrig = totals.orig - dto
  const subAlt  = totals.alt  - dto
  const subOtro = totals.otro - dto
  const ivaO = Math.round(subOrig * ivaPct / 100)
  const ivaA = Math.round(subAlt  * ivaPct / 100)
  const ivaT = Math.round(subOtro * ivaPct / 100)
  const totalOrig = subOrig + ivaO
  const totalAlt  = subAlt  + ivaA
  const totalOtro = subOtro + ivaT

  const previewData = {
    settings,
    cliente: clientMode === "registrado"
      ? clients.find(c => c.id === clientId)
      : { full_name: clienteLibre.nombre, rut: clienteLibre.rut, phone: clienteLibre.telefono, email: clienteLibre.email, city: clienteLibre.ciudad, address: clienteLibre.direccion },
    vehiculo,
    items: items.map((item, idx) => ({ ...item, orden: idx + 1, ...calcItem3(item) })),
    ivaPct, descuentoGlobal: dto, formaPago, vigenciaDias, descripcionServicio,
    totals, subOrig, subAlt, subOtro, ivaO, ivaA, ivaT, totalOrig, totalAlt, totalOtro,
  }

  async function handleSubmit() {
    if (!vehiculo.patente) { toast.error("Ingresa la patente del vehículo"); return }
    const hasCliente = clientMode === "registrado" ? !!clientId : !!clienteLibre.nombre
    if (!hasCliente) { toast.error("Ingresa los datos del cliente"); return }
    if (!activeItems.length) { toast.error("Agrega al menos un ítem con datos"); return }
    setSaving(true)
    try {
      const payload = {
        clientId: clientMode === "registrado" ? clientId : null,
        clienteLibre: clientMode === "libre" ? clienteLibre : null,
        vehiculo, inspectionId: inspectionId || null,
        items: activeItems, ivaPct, descuentoGlobal: dto,
        formaPago, vigenciaDias: Number(vigenciaDias), descripcionServicio, notasCotizacion,
      }
      if (mode === "edit" && initialBudget?.id) {
        const res = await fetch(`/api/budgets/${initialBudget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success("Presupuesto actualizado")
        router.push(`/inspector/budgets/${initialBudget.id}`)
        router.refresh()
      } else {
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success(`Presupuesto ${data.numero} creado`)
        router.push(`/inspector/budgets/${data.budgetId}`)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar presupuesto")
    } finally { setSaving(false) }
  }

  if (showPreview) {
    return <BudgetPreview data={previewData} onBack={() => setShowPreview(false)} onFinalize={handleSubmit} saving={saving} />
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">

      {/* CLIENTE */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Cliente</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["registrado", "libre"] as const).map(m => (
            <button key={m} type="button" onClick={() => setClientMode(m)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${clientMode === m ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {m === "registrado" ? "Cliente registrado" : "Cliente sin registro"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "nombre" as const, label: "Nombre *", full: true },
              { key: "rut" as const, label: "RUT" },
              { key: "telefono" as const, label: "Teléfono" },
              { key: "email" as const, label: "Email" },
              { key: "ciudad" as const, label: "Ciudad" },
              { key: "direccion" as const, label: "Dirección", full: true },
            ].map(f => (
              <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input type="text" value={clienteLibre[f.key]}
                  onChange={e => setClienteLibre(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INSPECCIÓN */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Inspección vinculada <span className="text-gray-400 font-normal text-sm">(opcional)</span></h3>
        <select value={inspectionId} onChange={e => setInspectionId(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">-- Sin inspección --</option>
          {inspections.map(i => <option key={i.id} value={i.id}>{i.vehicles?.patente} · {i.vehicles?.marca} {i.vehicles?.modelo}</option>)}
        </select>
      </div>

      {/* VEHÍCULO */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Car size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-800">Vehículo</h3>
        </div>
        <div className="flex gap-2 mb-4">
          <input value={buscarPatente} onChange={e => setBuscarPatente(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && buscarVehiculo()}
            placeholder="Buscar por patente (ej: SFHP46)"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onClick={buscarVehiculo} disabled={buscandoVehiculo}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
            <Search size={14} />{buscandoVehiculo ? "..." : "Buscar"}
          </button>
          <button type="button" onClick={() => { setShowVehicleManual(v => !v); if (!showVehicleManual) setVehiculo(p => ({ ...p, patente: buscarPatente || p.patente })) }}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition">
            {showVehicleManual ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Manual
          </button>
        </div>
        {showVehicleManual && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: "patente" as const, label: "Patente *", upper: true },
              { key: "marca" as const, label: "Marca" },
              { key: "modelo" as const, label: "Modelo" },
              { key: "anio" as const, label: "Año" },
              { key: "version" as const, label: "Versión" },
              { key: "color" as const, label: "Color" },
              { key: "km" as const, label: "KM actual" },
              { key: "vin" as const, label: "VIN / Chasis", upper: true },
              { key: "num_motor" as const, label: "N° Motor", upper: true },
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

      {/* TABLA ÍTEMS */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Ítems del presupuesto</h3>
          <p className="text-xs text-gray-400 mt-0.5">Valores netos sin IVA · 3 precios de repuesto: Original, Alternativo, Otro</p>
        </div>

        {/* Desktop header */}
        <div className="hidden xl:grid gap-1 px-3 py-2 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100"
          style={{ gridTemplateColumns: "1.5rem 1fr 4.5rem 4.5rem 4.5rem 4.5rem 4rem 2.5rem 1fr auto" }}>
          <span className="text-center">#</span>
          <span>Descripción / Trabajo</span>
          <span className="text-center">Gestión</span>
          <span className="text-right text-blue-600">$ Original</span>
          <span className="text-right text-amber-600">$ Alt.</span>
          <span className="text-right text-green-600">$ Otro</span>
          <span className="text-right">$ M.Obra</span>
          <span className="text-center">Dc%</span>
          <span className="text-gray-400">Desc. trabajo</span>
          <span></span>
        </div>

        <div className="divide-y divide-gray-50">
          {items.map((item, i) => {
            const hasData = item.descripcion || num(item.rep_original) > 0 || num(item.rep_alternativo) > 0 || num(item.rep_otro) > 0 || num(item.val_mano_obra) > 0
            return (
              <div key={i} className={`px-3 py-2 transition-opacity ${!hasData ? "opacity-40 hover:opacity-100 focus-within:opacity-100" : ""}`}>
                {/* Desktop */}
                <div className="hidden xl:grid gap-1 items-center"
                  style={{ gridTemplateColumns: "1.5rem 1fr 4.5rem 4.5rem 4.5rem 4.5rem 4rem 2.5rem 1fr auto" }}>
                  <span className="text-xs text-gray-400 text-center">{i + 1}</span>
                  <input placeholder={`Ítem ${i + 1}...`} value={item.descripcion}
                    onChange={e => updateItem(i, "descripcion", e.target.value)}
                    className="w-full px-2 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <div className="space-y-1">
                    <select value={item.gestion} onChange={e => updateItem(i, "gestion", e.target.value as any)}
                      className="w-full px-1.5 py-2 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option>MECÁNICO</option><option>CLIENTE</option><option>OTRO</option>
                    </select>
                    {item.gestion === "OTRO" && (
                      <input placeholder="Especif..." value={item.gestion_custom}
                        onChange={e => updateItem(i, "gestion_custom", e.target.value)}
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none" />
                    )}
                  </div>
                  {(["rep_original", "rep_alternativo", "rep_otro", "val_mano_obra"] as const).map((field, fi) => (
                    <input key={field} type="number" min="0" value={item[field]}
                      onChange={e => updateItem(i, field, e.target.value)}
                      placeholder="0"
                      className={`w-full px-2 py-2 border rounded text-xs text-right focus:outline-none focus:ring-1 ${fi === 0 ? "border-blue-200 focus:ring-blue-400" : fi === 1 ? "border-amber-200 focus:ring-amber-400" : fi === 2 ? "border-green-200 focus:ring-green-400" : "border-gray-200 focus:ring-blue-500"}`} />
                  ))}
                  <input type="number" min="0" max="100" value={item.dcto_pct}
                    onChange={e => updateItem(i, "dcto_pct", e.target.value)}
                    placeholder="0"
                    className="w-full px-1.5 py-2 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input placeholder="Desc. trabajo..." value={item.notas}
                    onChange={e => updateItem(i, "notas", e.target.value)}
                    className="w-full px-2 py-2 border border-gray-100 rounded text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  <button type="button" onClick={() => removeItem(i)} className="p-1 text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Mobile/Tablet */}
                <div className="xl:hidden space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-5 shrink-0 text-center">{i + 1}</span>
                    <input placeholder={`Ítem ${i + 1}...`} value={item.descripcion}
                      onChange={e => updateItem(i, "descripcion", e.target.value)}
                      className="flex-1 px-2 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <select value={item.gestion} onChange={e => updateItem(i, "gestion", e.target.value as any)}
                      className="w-24 px-1.5 py-2 border border-gray-200 rounded text-xs bg-white focus:outline-none">
                      <option>MECÁNICO</option><option>CLIENTE</option><option>OTRO</option>
                    </select>
                    <button type="button" onClick={() => removeItem(i)} className="p-1 text-gray-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-7">
                    {[
                      { key: "rep_original" as const, label: "Original", color: "text-blue-600" },
                      { key: "rep_alternativo" as const, label: "Alternativo", color: "text-amber-600" },
                      { key: "rep_otro" as const, label: "Otro", color: "text-green-600" },
                      { key: "val_mano_obra" as const, label: "Mano obra", color: "text-gray-600" },
                    ].map(f => (
                      <div key={f.key}>
                        <p className={`text-[10px] mb-0.5 font-medium ${f.color}`}>{f.label}</p>
                        <input type="number" min="0" value={item[f.key]}
                          onChange={e => updateItem(i, f.key, e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none" />
                      </div>
                    ))}
                  </div>
                  <div className="ml-7 flex gap-2 items-center">
                    <label className="text-xs text-gray-500">Dcto%</label>
                    <input type="number" min="0" max="100" value={item.dcto_pct}
                      onChange={e => updateItem(i, "dcto_pct", e.target.value)}
                      placeholder="0" className="w-16 px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none" />
                    <input placeholder="Notas..." value={item.notas}
                      onChange={e => updateItem(i, "notas", e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-100 rounded text-xs text-gray-400 focus:outline-none" />
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

      {/* TOTALES */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Resumen de precios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { label: "Original", total: totalOrig, sub: subOrig, iva: ivaO, color: "border-blue-300 bg-blue-50", badge: "bg-blue-100 text-blue-700" },
            { label: "Alternativo", total: totalAlt, sub: subAlt, iva: ivaA, color: "border-amber-300 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
            { label: "Otro", total: totalOtro, sub: subOtro, iva: ivaT, color: "border-green-300 bg-green-50", badge: "bg-green-100 text-green-700" },
          ].map(o => (
            <div key={o.label} className={`rounded-xl border-2 ${o.color} p-4 text-center`}>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${o.badge}`}>{o.label}</span>
              <p className="text-2xl font-black text-gray-900 mt-2">${fmt(o.total)}</p>
              <p className="text-xs text-gray-500 mt-1">Neto: ${fmt(o.sub)} + IVA ${fmt(o.iva)}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-sm border-t pt-4">
          <div className="flex items-center gap-2">
            <label className="text-gray-600 text-xs">Descuento global $</label>
            <input type="number" min="0" value={descuentoGlobal} onChange={e => setDescuentoGlobal(e.target.value)} placeholder="0"
              className="w-28 px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-600 text-xs">IVA</label>
            <input type="number" min="0" max="100" value={ivaPct} onChange={e => setIvaPct(Number(e.target.value))}
              className="w-14 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <span className="text-gray-500 text-xs">%</span>
          </div>
        </div>
      </div>

      {/* CONFIG */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* DESCRIPCIÓN */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-2">Descripción general del servicio</h3>
        <textarea value={descripcionServicio} onChange={e => setDescripcionServicio(e.target.value)} rows={4}
          placeholder="Describe los trabajos a realizar, recomendaciones adicionales..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {/* NOTAS ADICIONALES */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-1">Notas / información adicional</h3>
        <p className="text-xs text-gray-400 mb-2">Aparece al final del PDF, después de los datos de pago. Ej: instrucciones al aceptar, contacto, condiciones.</p>
        <textarea value={notasCotizacion} onChange={e => setNotasCotizacion(e.target.value)} rows={3}
          placeholder="Ej: Si la cotización es aceptada, favor enviar correo a hugo@empresa.cl para coordinar..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {/* ACCIONES */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={() => setShowPreview(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl font-medium text-sm transition">
          <Eye size={16} /> Vista previa
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition disabled:opacity-50 shadow-sm">
          {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear presupuesto"}
        </button>
      </div>
    </div>
  )
}
