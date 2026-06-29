"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Search, ChevronRight, User, Car, ClipboardList, ArrowUp, X, Camera, Sparkles, Loader2 } from "lucide-react"
import { INSPECTION_ITEMS, getSubsections, getItemsBySubsection } from "@/lib/inspection-items"
import { cn, calcNotaFinal, calcSectionScore } from "@/lib/utils"
import { VEHICLE_MAKES, VEHICLE_COLORS, VEHICLE_TYPES, getModels } from "@/lib/vehicle-data"
import VehicleCombobox from "@/components/ui/vehicle-combobox"

interface Client { id: string; full_name: string; email: string; phone: string }

interface InitialData {
  vehicle: Record<string, string>
  clientId?: string
  isNewClient?: boolean
  newClient?: Record<string, string>
  items: Record<string, { estado: string; observaciones: string }>
  comentarios?: string
}

interface Props {
  inspectorId: string
  inspectorName: string
  clients: Client[]
  editId?: string
  initialData?: InitialData
}

type Step = "vehicle" | "client" | "visual" | "carroceria" | "mecanica" | "fotos" | "observaciones"
type AiStyle = "compacto" | "estandar" | "detallado"

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "vehicle",       label: "Vehículo",      icon: Car },
  { key: "client",        label: "Cliente",        icon: User },
  { key: "visual",        label: "Visual",         icon: ClipboardList },
  { key: "carroceria",    label: "Carrocería",     icon: ClipboardList },
  { key: "mecanica",      label: "Mecánica",       icon: ClipboardList },
  { key: "fotos",         label: "Fotos",          icon: Camera },
  { key: "observaciones", label: "Observaciones",  icon: Sparkles },
]

const AI_STYLES: { key: AiStyle; label: string; desc: string }[] = [
  { key: "compacto",  label: "Compacto",  desc: "2-3 oraciones" },
  { key: "estandar",  label: "Estándar",  desc: "~100 palabras" },
  { key: "detallado", label: "Detallado", desc: "3 párrafos" },
]

const SECTION_ITEMS = {
  visual: INSPECTION_ITEMS.filter(i => i.section === 1),
  carroceria: INSPECTION_ITEMS.filter(i => i.section === 2),
  mecanica: INSPECTION_ITEMS.filter(i => i.section === 3),
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round((value / 7) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-2xl font-black tabular-nums",
        value >= 6.5 ? "text-green-500" : value >= 5 ? "text-yellow-500" : "text-red-500"
      )}>
        {value.toFixed(1)}
      </span>
      <div className="flex flex-col leading-none">
        <span className="text-xs text-gray-400">/ 7.0</span>
        <span className={cn("text-xs font-semibold",
          value >= 6.5 ? "text-green-500" : value >= 5 ? "text-yellow-500" : "text-red-500"
        )}>{pct}%</span>
      </div>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500",
            value >= 6.5 ? "bg-green-500" : value >= 5 ? "bg-yellow-500" : "bg-red-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    // El scroll está en <main>, no en window (overflow-y-auto del AppShell)
    const main = document.querySelector("main")
    if (!main) return
    const onScroll = () => setVisible(main.scrollTop > 300)
    main.addEventListener("scroll", onScroll, { passive: true })
    return () => main.removeEventListener("scroll", onScroll)
  }, [])
  if (!visible) return null
  return (
    <button
      onClick={() => document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-4 z-50 w-10 h-10 bg-slate-700/80 hover:bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all backdrop-blur-sm"
      aria-label="Subir al inicio"
    >
      <ArrowUp size={16} />
    </button>
  )
}

function StickyProgress({ pct, score }: { pct: number; score: number }) {
  const color = score >= 6.5 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500"
  const textColor = score >= 6.5 ? "text-green-500" : score >= 5 ? "text-yellow-500" : "text-red-500"
  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm -mx-4 px-4 py-2 mb-4">
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        <span className="text-xl select-none" style={{ transform: `translateX(${Math.round(pct * 0.6)}%)`, display: "inline-block", transition: "transform 0.5s ease" }}>🚗</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Completado</span>
            <span className="text-xs font-bold text-gray-700">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", pct > 0 ? color : "bg-gray-200")} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {score > 0 && <span className={cn("text-sm font-black tabular-nums w-8 text-right", textColor)}>{score.toFixed(1)}</span>}
      </div>
    </div>
  )
}

export default function NewInspectionForm({ inspectorId, inspectorName, clients, editId, initialData }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("vehicle")
  const [savingAs, setSavingAs] = useState<"" | "draft" | "complete">("")
  const [aiLoading, setAiLoading] = useState<AiStyle | null>(null)
  const [searching, setSearching] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [vehicleSearched, setVehicleSearched] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  // Helper: borde amarillo si campo vacío después de auto-fill
  function emptyFieldCls(val: string, extra = "") {
    return `${vehicleSearched && !val ? "border-yellow-400 bg-yellow-50 focus:ring-yellow-400" : "border-gray-200"} ${extra}`
  }

  // Vehicle data
  const [patente, setPatente] = useState("")
  const [vehicle, setVehicle] = useState({
    patente: "", marca: "", modelo: "", anio: "", color: "", combustible: "GASOLINA",
    transmision: "MECÁNICA", traccion: "4x2", cilindrada: "", tapiceria: "",
    num_puertas: "4", tipo_vehiculo: "auto", vin: "", num_motor: "",
    soap_estado: "", soap_vencimiento: "", rev_tecnica_estado: "", rev_tecnica_vencimiento: "",
    permiso_circulacion: "", emision_contaminantes: "", multas: "$0", kilometraje: "",
  })

  // Pre-cargar datos si venimos de editar un borrador
  useEffect(() => {
    if (!initialData) return
    if (initialData.vehicle) {
      setVehicle(v => ({ ...v, ...initialData.vehicle }))
      setPatente(initialData.vehicle.patente ?? "")
    }
    if (initialData.items) setItems(initialData.items)
    if (initialData.comentarios) setComentarios(initialData.comentarios)
    if (initialData.clientId) setSelectedClientId(initialData.clientId)
    if (initialData.isNewClient) setIsNewClient(true)
    if (initialData.newClient) setNewClient(nc => ({ ...nc, ...initialData.newClient }))
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Client data
  const [selectedClientId, setSelectedClientId] = useState("")
  const [newClient, setNewClient] = useState({ full_name: "", rut: "", email: "", phone: "", city: "Santiago", address: "" })
  const [isNewClient, setIsNewClient] = useState(false)

  // Inspection items
  const [items, setItems] = useState<Record<string, { estado: string; observaciones: string }>>(() => {
    const init: Record<string, { estado: string; observaciones: string }> = {}
    INSPECTION_ITEMS.forEach(i => { init[i.key] = { estado: "N/A", observaciones: "" } })
    return init
  })

  const [comentarios, setComentarios] = useState("")
  const [photoFiles, setPhotoFiles] = useState<Array<{ file: File; preview: string }>>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`"${f.name}" supera los 5 MB`)
        return false
      }
      return true
    })
    setPhotoFiles(prev => [...prev, ...valid.map(f => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 10))
    e.target.value = ""
  }

  function removePhoto(idx: number) {
    setPhotoFiles(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  // Auto-calculated scores
  const notaVisual = calcSectionScore(SECTION_ITEMS.visual, items)
  const notaCarroceria = calcSectionScore(SECTION_ITEMS.carroceria, items)
  const notaMecanica = calcSectionScore(SECTION_ITEMS.mecanica, items)
  const notaFinal = calcNotaFinal(notaVisual, notaCarroceria, notaMecanica)

  // Progress calculation
  const totalItems = INSPECTION_ITEMS.length
  const evaluatedItems = Object.values(items).filter(i => i.estado !== "N/A").length
  const vehicleDone = vehicle.patente && vehicle.marca && vehicle.modelo ? 1 : 0
  const clientDone = selectedClientId || (isNewClient && newClient.full_name) ? 1 : 0
  const progressPct = Math.min(100, Math.round(((vehicleDone + clientDone + evaluatedItems) / (totalItems + 2)) * 100))

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  function goToStep(s: Step) {
    setStep(s)
    setTimeout(scrollTop, 50)
  }

  async function handleSearchPatente() {
    if (!patente.trim()) return
    setSearching(true)
    const ppu = patente.trim().toUpperCase()
    setVehicle(v => ({ ...v, patente: ppu }))
    try {
      // 1. Buscar en Supabase
      const res = await fetch(`/api/vehicles?patente=${ppu}`)
      const { vehicle, source, error } = await res.json()

      if (vehicle) {
        setVehicleSearched(true)
        setVehicle(v => ({
          ...v,
          patente:               vehicle.patente    ?? ppu,
          marca:                 vehicle.marca      ?? "",
          modelo:                vehicle.modelo     ?? "",
          anio:                  vehicle.anio != null ? String(vehicle.anio) : "",
          color:                 vehicle.color      ?? "",
          combustible:           vehicle.combustible  || v.combustible,
          transmision:           vehicle.transmision  || v.transmision,
          traccion:              vehicle.traccion    || v.traccion,
          cilindrada:            vehicle.cilindrada  ?? "",
          tapiceria:             vehicle.tapiceria   ?? "",
          num_puertas:           vehicle.num_puertas ? String(vehicle.num_puertas) : v.num_puertas,
          tipo_vehiculo:         vehicle.tipo_vehiculo || v.tipo_vehiculo,
          vin:                   vehicle.vin         ?? "",
          num_motor:             vehicle.num_motor   ?? "",
          soap_estado:           vehicle.soap_estado ?? "",
          soap_vencimiento:      vehicle.soap_vencimiento ?? "",
          rev_tecnica_estado:    vehicle.rev_tecnica_estado ?? "",
          rev_tecnica_vencimiento: vehicle.rev_tecnica_vencimiento ?? "",
          permiso_circulacion:   vehicle.permiso_circulacion ?? "",
          emision_contaminantes: vehicle.emision_contaminantes ?? "",
          multas:                vehicle.multas ?? "$0",
          kilometraje:           vehicle.kilometraje ? String(vehicle.kilometraje) : "",
        }))
        toast.success(source === "boostr" ? "Vehículo encontrado en Boostr" : "Vehículo encontrado en el sistema")
        return
      }

      setVehicle(v => ({ ...v, patente: ppu }))
      setVehicleSearched(true)
      if (error) toast.error(`No encontrado: ${error}`)
      else toast.info("Patente no encontrada — completa los datos manualmente")
    } catch {
      toast.error("Error al buscar patente")
    } finally {
      setSearching(false)
    }
  }

  function updateItem(key: string, field: "estado" | "observaciones", value: string) {
    setItems(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function renderInspectionSection(section: 1 | 2 | 3) {
    const subsections = getSubsections(section)
    return (
      <div className="space-y-5">
        {subsections.map(sub => (
          <div key={sub}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pb-1.5 border-b border-gray-100">{sub}</h3>
            <div className="space-y-2">
              {getItemsBySubsection(sub).map(item => (
                <div key={item.key} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">{item.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.estados.map(estado => {
                      const selected = items[item.key]?.estado === estado
                      const isGood = ["Sin Daño", "Bueno", "Normal", "Funciona", "A nivel", "No Encendido", "Presenta", "No Presenta"].includes(estado)
                      const isWarn = ["Con Daño", "Regular"].includes(estado)
                      const isBad = ["Malo", "Anormal", "No Funciona", "Bajo nivel", "Encendido"].includes(estado)
                      const isNa = estado === "N/A"
                      return (
                        <button
                          key={estado}
                          type="button"
                          onClick={() => updateItem(item.key, "estado", estado)}
                          className={cn(
                            "px-3 py-1 text-xs rounded-full font-medium border transition-all",
                            selected
                              ? isNa ? "bg-gray-400 text-white border-gray-400"
                                : isBad ? "bg-red-500 text-white border-red-500"
                                : isWarn ? "bg-orange-400 text-white border-orange-400"
                                : "bg-green-500 text-white border-green-500"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          )}
                        >
                          {estado}
                        </button>
                      )
                    })}
                  </div>
                  {(item.hasVidaUtil || item.hasObservaciones) && (
                    <input
                      type="text"
                      placeholder={item.hasVidaUtil ? "Vida útil restante (ej: 60%)" : "Observaciones (opcional)"}
                      value={items[item.key]?.observaciones ?? ""}
                      onChange={e => updateItem(item.key, "observaciones", e.target.value)}
                      className="mt-2 w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  async function handleAI(style: AiStyle) {
    setAiLoading(style)
    try {
      const res = await fetch("/api/ai/inspection-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle, items, notaVisual, notaCarroceria, notaMecanica, notaFinal, comentarios, style }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error IA")
      if (data.text) setComentarios(data.text)
      toast.success("Observaciones generadas por IA")
    } catch (err: any) {
      toast.error(err.message ?? "Error al generar con IA")
    } finally {
      setAiLoading(null)
    }
  }

  async function handleSave(status: "draft" | "completed" = "completed") {
    if (!vehicle.patente) {
      toast.error("Ingresa la patente del vehículo")
      return
    }
    if (status === "completed" && (!vehicle.marca || !vehicle.modelo)) {
      toast.error("Completa los datos del vehículo (marca, modelo)")
      return
    }
    if (!selectedClientId && !isNewClient) {
      toast.error("Selecciona o crea un cliente")
      return
    }
    if (isNewClient && !newClient.full_name) {
      toast.error("Ingresa el nombre del cliente")
      return
    }
    setSavingAs(status === "draft" ? "draft" : "complete")
    try {
      // Subir fotos a Storage antes de guardar la inspección
      const photoUrls: string[] = []
      if (photoFiles.length > 0) {
        const supabase = createClient()
        const folder = crypto.randomUUID()
        for (const { file } of photoFiles) {
          const ext = file.name.split(".").pop() ?? "jpg"
          const path = `${folder}/${crypto.randomUUID()}.${ext}`
          const { data, error } = await supabase.storage
            .from("inspection-photos")
            .upload(path, file, { cacheControl: "3600", upsert: false })
          if (error) throw new Error(`Error al subir foto: ${error.message}`)
          const { data: { publicUrl } } = supabase.storage.from("inspection-photos").getPublicUrl(data.path)
          photoUrls.push(publicUrl)
        }
      }

      const endpoint = editId
        ? `/api/inspector/inspections/${editId}`
        : "/api/inspections"
      const method = editId ? "PATCH" : "POST"

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle,
          newClient,
          selectedClientId,
          isNewClient,
          notaVisual,
          notaCarroceria,
          notaMecanica,
          comentarios,
          photos: photoUrls,
          items,
          inspectorId,
          status,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al guardar")
      toast.success(status === "draft" ? "Borrador guardado" : "Inspección completada")
      router.push(`/inspector/inspections/${data.inspectionId ?? editId}`)
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar la inspección")
    } finally {
      setSavingAs("")
    }
  }

  const stepIndex = STEPS.findIndex(s => s.key === step)

  // Sección activa score para mostrar en header de sección
  const sectionScore = step === "visual" ? notaVisual : step === "carroceria" ? notaCarroceria : step === "mecanica" ? notaMecanica : null
  const sectionLabel = step === "visual" ? "Inspección Visual" : step === "carroceria" ? "Carrocería" : step === "mecanica" ? "Mecánica" : ""
  const sectionNum = step === "visual" ? "1/3" : step === "carroceria" ? "2/3" : step === "mecanica" ? "3/3" : ""

  const STEP_NEXT: Partial<Record<Step, Step>> = {
    vehicle: "client", client: "visual", visual: "carroceria",
    carroceria: "mecanica", mecanica: "fotos", fotos: "observaciones",
  }
  const STEP_PREV: Partial<Record<Step, Step>> = {
    client: "vehicle", visual: "client", carroceria: "visual",
    mecanica: "carroceria", fotos: "mecanica", observaciones: "fotos",
  }

  return (
    <div className="max-w-2xl mx-auto pb-20" ref={topRef}>
      <ScrollToTopButton />
      <StickyProgress pct={progressPct} score={notaFinal} />

      {/* Modal cancelar */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">¿Cancelar inspección?</h3>
            <p className="text-sm text-gray-500 mb-5">Se perderán todos los datos ingresados. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Volver al formulario
              </button>
              <button
                onClick={() => router.push("/inspector/inspections")}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header: pasos + botón cancelar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1 overflow-x-auto flex-1 pb-1 min-w-0">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => i <= stepIndex + 1 && goToStep(s.key)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  step === s.key ? "bg-blue-600 text-white shadow-sm" :
                  i < stepIndex ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-400"
                )}
              >
                <s.icon size={12} />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
        >
          <X size={12} /> Cancelar
        </button>
      </div>

      {/* ── PASO 1: VEHÍCULO ─── */}
      {step === "vehicle" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h2 className="font-bold text-gray-800 mb-4">Datos del vehículo</h2>

          <div className="flex gap-2 mb-5">
            <input
              type="text"
              value={patente}
              onChange={e => setPatente(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleSearchPatente()}
              placeholder="Ej: HPTT72"
              maxLength={7}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearchPatente}
              disabled={searching || !patente.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
            >
              <Search size={15} />
              <span className="hidden sm:inline">{searching ? "Buscando..." : "Buscar"}</span>
            </button>
          </div>

          {vehicleSearched && (
            <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 mb-3">
              <span className="text-yellow-500">⚠</span>
              Los campos con borde amarillo están vacíos — completa los que estén disponibles.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Patente */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Patente *</label>
              <input type="text" value={vehicle.patente}
                onChange={e => setVehicle(v => ({ ...v, patente: e.target.value.toUpperCase() }))}
                placeholder="HPTT72"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono" />
            </div>
            {/* Marca */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marca *</label>
              <div className={vehicleSearched && !vehicle.marca ? "ring-2 ring-yellow-400 rounded-lg" : ""}>
                <VehicleCombobox
                  value={vehicle.marca}
                  onChange={val => setVehicle(v => ({ ...v, marca: val, modelo: "" }))}
                  options={VEHICLE_MAKES}
                  placeholder="Toyota, Ford..."
                />
              </div>
            </div>
            {/* Modelo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modelo *</label>
              <div className={vehicleSearched && !vehicle.modelo ? "ring-2 ring-yellow-400 rounded-lg" : ""}>
                <VehicleCombobox
                  value={vehicle.modelo}
                  onChange={val => setVehicle(v => ({ ...v, modelo: val }))}
                  options={getModels(vehicle.marca)}
                  placeholder={vehicle.marca ? "Seleccionar modelo..." : "Elige marca primero"}
                />
              </div>
            </div>
            {/* Año */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
              <input type="number" value={vehicle.anio}
                onChange={e => setVehicle(v => ({ ...v, anio: e.target.value }))}
                placeholder="2016"
                className={`w-full px-3 py-2 border ${emptyFieldCls(vehicle.anio)} rounded-lg text-sm focus:outline-none focus:ring-2`} />
            </div>
            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <div className={vehicleSearched && !vehicle.color ? "ring-2 ring-yellow-400 rounded-lg" : ""}>
                <VehicleCombobox
                  value={vehicle.color}
                  onChange={val => setVehicle(v => ({ ...v, color: val }))}
                  options={VEHICLE_COLORS}
                  placeholder="Blanco, Negro..."
                />
              </div>
            </div>
            {/* Cilindrada */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cilindrada</label>
              <input type="text" value={vehicle.cilindrada}
                onChange={e => setVehicle(v => ({ ...v, cilindrada: e.target.value }))}
                placeholder="1.6"
                className={`w-full px-3 py-2 border ${emptyFieldCls(vehicle.cilindrada)} rounded-lg text-sm focus:outline-none focus:ring-2`} />
            </div>
            {/* VIN */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">VIN (Chasis)</label>
              <input type="text" value={vehicle.vin}
                onChange={e => setVehicle(v => ({ ...v, vin: e.target.value.toUpperCase() }))}
                placeholder="3VWBY6AU5FM..."
                className={`w-full px-3 py-2 border ${emptyFieldCls(vehicle.vin)} rounded-lg text-sm focus:outline-none focus:ring-2 uppercase`} />
            </div>
            {/* N° Motor */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">N° Motor</label>
              <input type="text" value={vehicle.num_motor}
                onChange={e => setVehicle(v => ({ ...v, num_motor: e.target.value }))}
                placeholder="YD25310623T"
                className={`w-full px-3 py-2 border ${emptyFieldCls(vehicle.num_motor)} rounded-lg text-sm focus:outline-none focus:ring-2`} />
            </div>
            {/* Kilometraje */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kilometraje</label>
              <input type="number" value={vehicle.kilometraje}
                onChange={e => setVehicle(v => ({ ...v, kilometraje: e.target.value }))}
                placeholder="84245"
                className={`w-full px-3 py-2 border ${emptyFieldCls(vehicle.kilometraje)} rounded-lg text-sm focus:outline-none focus:ring-2`} />
            </div>
            {/* Tapicería */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tapicería</label>
              <input type="text" value={vehicle.tapiceria}
                onChange={e => setVehicle(v => ({ ...v, tapiceria: e.target.value }))}
                placeholder="Tela"
                className={`w-full px-3 py-2 border ${emptyFieldCls(vehicle.tapiceria)} rounded-lg text-sm focus:outline-none focus:ring-2`} />
            </div>
            {/* N° puertas */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">N° puertas</label>
              <select value={vehicle.num_puertas}
                onChange={e => setVehicle(v => ({ ...v, num_puertas: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {["2","3","4","5"].map(o => <option key={o} value={o}>{o} puertas</option>)}
              </select>
            </div>
            {/* Multas */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Multas</label>
              <input type="text" value={vehicle.multas}
                onChange={e => setVehicle(v => ({ ...v, multas: e.target.value }))}
                placeholder="$0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {/* Combustible */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Combustible</label>
              <select value={vehicle.combustible}
                onChange={e => setVehicle(v => ({ ...v, combustible: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {["GASOLINA","DIÉSEL","HÍBRIDO","ELÉCTRICO","GAS","HÍBRIDO ENCHUFABLE"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            {/* Transmisión */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transmisión</label>
              <select value={vehicle.transmision}
                onChange={e => setVehicle(v => ({ ...v, transmision: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {["MECÁNICA","AUTOMÁTICA","CVT","SEMIAUTOMÁTICA","DOBLE EMBRAGUE"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            {/* Tracción */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tracción</label>
              <select value={vehicle.traccion}
                onChange={e => setVehicle(v => ({ ...v, traccion: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {["4x2","4x4","AWD","FWD","RWD"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            {/* Tipo vehículo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo vehículo</label>
              <VehicleCombobox
                value={vehicle.tipo_vehiculo}
                onChange={val => setVehicle(v => ({ ...v, tipo_vehiculo: val }))}
                options={VEHICLE_TYPES}
                placeholder="Auto, Camioneta..."
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-600 mb-3">Documentos del vehículo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "SOAP — Estado", key: "soap_estado", placeholder: "Vigente" },
                { label: "SOAP — Vencimiento", key: "soap_vencimiento", placeholder: "31/03/2026" },
                { label: "Rev. Técnica — Estado", key: "rev_tecnica_estado", placeholder: "Vigente" },
                { label: "Rev. Técnica — Vencimiento", key: "rev_tecnica_vencimiento", placeholder: "31/05/2026" },
                { label: "Permiso Circulación", key: "permiso_circulacion", placeholder: "31/08/2025 - Vigente" },
                { label: "Emisión Contaminantes", key: "emision_contaminantes", placeholder: "31/05/2026 - Vigente" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={(vehicle as any)[f.key]}
                    onChange={e => setVehicle(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={`w-full px-3 py-2 border ${emptyFieldCls((vehicle as any)[f.key])} rounded-lg text-xs focus:outline-none focus:ring-2`}
                  />
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => goToStep("client")} className="mt-5 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition">
            Siguiente: Cliente →
          </button>
        </div>
      )}

      {/* ── PASO 2: CLIENTE ─── */}
      {step === "client" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h2 className="font-bold text-gray-800 mb-4">Cliente</h2>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setIsNewClient(false)}
              className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition",
                !isNewClient ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}
            >
              Cliente existente
            </button>
            <button onClick={() => setIsNewClient(true)}
              className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition",
                isNewClient ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}
            >
              Cliente nuevo
            </button>
          </div>

          {!isNewClient ? (
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Seleccionar cliente --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ""}</option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Nombre completo *", key: "full_name", placeholder: "Max Herrera", full: true },
                { label: "RUT", key: "rut", placeholder: "12.345.678-9" },
                { label: "Teléfono", key: "phone", placeholder: "+569 8776 2210" },
                { label: "Email", key: "email", placeholder: "cliente@correo.com" },
                { label: "Ciudad", key: "city", placeholder: "Santiago" },
                { label: "Dirección", key: "address", placeholder: "Av. Ejemplo 123, San Ramón", full: true },
              ].map(f => (
                <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={(newClient as any)[f.key]}
                    onChange={e => setNewClient(nc => ({ ...nc, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button onClick={() => goToStep("vehicle")} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">← Volver</button>
            <button onClick={() => goToStep("visual")} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition">Iniciar inspección →</button>

          </div>
        </div>
      )}

      {/* ── PASOS 3-5: SECCIONES DE INSPECCIÓN ─── */}
      {(step === "visual" || step === "carroceria" || step === "mecanica") && sectionScore !== null && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
          {/* Header sección */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-gray-800">{sectionLabel}</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sección {sectionNum}</span>
          </div>

          {/* Nota auto-calculada */}
          <div className="mb-5 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Nota calculada automáticamente</p>
            <ScoreBar value={sectionScore} />
          </div>

          {renderInspectionSection(step === "visual" ? 1 : step === "carroceria" ? 2 : 3)}

          {/* Nota post-items */}
          <div className="mt-5 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Nota de esta sección</p>
            <ScoreBar value={sectionScore} />
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => { const prev = STEP_PREV[step]; if (prev) goToStep(prev) }}
              className="py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              ← Volver
            </button>
            <button
              onClick={() => { const next = STEP_NEXT[step]; if (next) goToStep(next) }}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition"
            >
              {step === "visual" ? "Carrocería →" : step === "carroceria" ? "Mecánica →" : "Fotos →"}
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 6: FOTOS ─── */}
      {step === "fotos" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h2 className="font-bold text-gray-800 mb-1">Fotografías del vehículo</h2>
          <p className="text-xs text-gray-400 mb-4">Máximo 10 fotos · 5 MB cada una</p>

          {photoFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photoFiles.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={p.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold leading-none transition"
                  >
                    ×
                  </button>
                  <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoAdd}
          />

          {photoFiles.length < 10 && (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-full py-6 border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-xl text-sm text-gray-400 hover:text-blue-500 transition flex flex-col items-center justify-center gap-2"
            >
              <Camera size={22} />
              <span>{photoFiles.length > 0 ? "Agregar más fotos" : "Toca aquí para agregar fotos"}</span>
              <span className="text-xs text-gray-300">{photoFiles.length}/10 agregadas</span>
            </button>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => goToStep("mecanica")}
              className="py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              ← Volver
            </button>
            <button
              onClick={() => goToStep("observaciones")}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition"
            >
              Observaciones →
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 7: OBSERVACIONES ─── */}
      {step === "observaciones" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h2 className="font-bold text-gray-800 mb-1">Observaciones finales</h2>
          <p className="text-xs text-gray-400 mb-4">Genera con IA o escribe tus propias observaciones</p>

          {/* Botones de estilo IA */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            {AI_STYLES.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => handleAI(s.key)}
                disabled={!!aiLoading}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition disabled:opacity-60",
                  "bg-white text-gray-700 border-purple-200 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
                )}
              >
                {aiLoading === s.key
                  ? <Loader2 size={14} className="animate-spin text-purple-500" />
                  : <Sparkles size={14} className="text-purple-400" />
                }
                <span>{aiLoading === s.key ? "Generando..." : s.label}</span>
                <span className="text-xs font-normal text-gray-400">{s.desc}</span>
              </button>
            ))}
          </div>

          <textarea
            value={comentarios}
            onChange={e => setComentarios(e.target.value)}
            rows={6}
            placeholder="Las observaciones generadas por IA aparecerán aquí, o escribe las tuyas..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {/* Resumen de notas */}
          <div className="mt-4 p-4 bg-slate-800 rounded-xl text-white">
            <p className="text-xs text-slate-400 mb-3">Resumen de notas</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "Visual", value: notaVisual },
                { label: "Carrocería", value: notaCarroceria },
                { label: "Mecánica", value: notaMecanica },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className={cn("text-xl font-black", s.value >= 6.5 ? "text-green-400" : s.value >= 5 ? "text-yellow-400" : "text-red-400")}>
                    {s.value.toFixed(1)}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-600 pt-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Nota final</p>
              <p className={cn("text-5xl font-black", notaFinal >= 6.5 ? "text-green-400" : notaFinal >= 5 ? "text-yellow-400" : "text-red-400")}>
                {notaFinal.toFixed(1)}
              </p>
              <p className="text-slate-500 text-sm mt-0.5">/ 7.0</p>
              <p className={cn("text-lg font-bold mt-0.5", notaFinal >= 6.5 ? "text-green-400" : notaFinal >= 5 ? "text-yellow-400" : "text-red-400")}>
                {Math.round((notaFinal / 7) * 100)}%
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => goToStep("fotos")}
              className="py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              ← Volver
            </button>
            <div className="flex flex-col gap-2 flex-1">
              <button
                onClick={() => handleSave("completed")}
                disabled={!!savingAs}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition"
              >
                {savingAs === "complete" ? "Guardando..." : "✓ Guardar y completar"}
              </button>
              <button
                onClick={() => handleSave("draft")}
                disabled={!!savingAs}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium disabled:opacity-50 transition"
              >
                {savingAs === "draft" ? "Guardando..." : "💾 Guardar borrador"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
