"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Search, ChevronRight, User, Car, ClipboardList, ArrowUp, X, Camera } from "lucide-react"
import { INSPECTION_ITEMS, getSubsections, getItemsBySubsection } from "@/lib/inspection-items"
import { cn, calcNotaFinal, calcSectionScore } from "@/lib/utils"

interface Client { id: string; full_name: string; email: string; phone: string }

interface Props {
  inspectorId: string
  inspectorName: string
  clients: Client[]
}

type Step = "vehicle" | "client" | "visual" | "carroceria" | "mecanica"

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "vehicle", label: "Vehículo", icon: Car },
  { key: "client", label: "Cliente", icon: User },
  { key: "visual", label: "Visual", icon: ClipboardList },
  { key: "carroceria", label: "Carrocería", icon: ClipboardList },
  { key: "mecanica", label: "Mecánica", icon: ClipboardList },
]

const SECTION_ITEMS = {
  visual: INSPECTION_ITEMS.filter(i => i.section === 1),
  carroceria: INSPECTION_ITEMS.filter(i => i.section === 2),
  mecanica: INSPECTION_ITEMS.filter(i => i.section === 3),
}

function ScoreBar({ value }: { value: number }) {
  const pct = (value / 7) * 100
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-2xl font-black tabular-nums",
        value >= 6.5 ? "text-green-500" : value >= 5 ? "text-yellow-500" : "text-red-500"
      )}>
        {value.toFixed(1)}
      </span>
      <span className="text-sm text-gray-400">/ 7.0</span>
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

export default function NewInspectionForm({ inspectorId, inspectorName, clients }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("vehicle")
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  // Vehicle data
  const [patente, setPatente] = useState("")
  const [vehicle, setVehicle] = useState({
    patente: "", marca: "", modelo: "", anio: "", color: "", combustible: "GASOLINA",
    transmision: "MECÁNICA", traccion: "4x2", cilindrada: "", tapiceria: "",
    num_puertas: "4", tipo_vehiculo: "auto", vin: "", num_motor: "",
    soap_estado: "", soap_vencimiento: "", rev_tecnica_estado: "", rev_tecnica_vencimiento: "",
    permiso_circulacion: "", emision_contaminantes: "", multas: "$0", kilometraje: "",
  })

  // Client data
  const [selectedClientId, setSelectedClientId] = useState("")
  const [newClient, setNewClient] = useState({ full_name: "", rut: "", email: "", phone: "", city: "Santiago" })
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
    const supabase = createClient()
    const { data: existing } = await supabase.from("vehicles").select("*").eq("patente", ppu).single()
    if (existing) {
      setVehicle({
        patente: existing.patente ?? "",
        marca: existing.marca ?? "",
        modelo: existing.modelo ?? "",
        anio: existing.anio?.toString() ?? "",
        color: existing.color ?? "",
        combustible: existing.combustible ?? "GASOLINA",
        transmision: existing.transmision ?? "MECÁNICA",
        traccion: existing.traccion ?? "4x2",
        cilindrada: existing.cilindrada ?? "",
        tapiceria: existing.tapiceria ?? "",
        num_puertas: existing.num_puertas?.toString() ?? "4",
        tipo_vehiculo: existing.tipo_vehiculo ?? "auto",
        vin: existing.vin ?? "",
        num_motor: existing.num_motor ?? "",
        soap_estado: existing.soap_estado ?? "",
        soap_vencimiento: existing.soap_vencimiento ?? "",
        rev_tecnica_estado: existing.rev_tecnica_estado ?? "",
        rev_tecnica_vencimiento: existing.rev_tecnica_vencimiento ?? "",
        permiso_circulacion: existing.permiso_circulacion ?? "",
        emision_contaminantes: existing.emision_contaminantes ?? "",
        multas: existing.multas ?? "$0",
        kilometraje: "",
      })
      toast.success("Vehículo encontrado en el sistema")
    } else {
      toast.info("Vehículo nuevo — completa los datos manualmente")
    }
    setSearching(false)
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

  async function handleSave() {
    if (!vehicle.patente || !vehicle.marca || !vehicle.modelo) {
      toast.error("Completa los datos del vehículo (patente, marca, modelo)")
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
    setLoading(true)
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

      const res = await fetch("/api/inspections", {
        method: "POST",
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al guardar")
      toast.success("Inspección guardada exitosamente")
      router.push(`/inspector/inspections/${data.inspectionId}`)
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar la inspección")
    } finally {
      setLoading(false)
    }
  }

  const stepIndex = STEPS.findIndex(s => s.key === step)

  // Sección activa score para mostrar en header de sección
  const sectionScore = step === "visual" ? notaVisual : step === "carroceria" ? notaCarroceria : step === "mecanica" ? notaMecanica : null
  const sectionLabel = step === "visual" ? "Inspección Visual" : step === "carroceria" ? "Carrocería" : step === "mecanica" ? "Mecánica" : ""
  const sectionNum = step === "visual" ? "1/3" : step === "carroceria" ? "2/3" : step === "mecanica" ? "3/3" : ""

  return (
    <div className="max-w-2xl mx-auto pb-20" ref={topRef}>
      <ScrollToTopButton />

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

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Patente *", key: "patente", placeholder: "HPTT72" },
              { label: "Marca *", key: "marca", placeholder: "Volkswagen" },
              { label: "Modelo *", key: "modelo", placeholder: "Golf" },
              { label: "Año", key: "anio", placeholder: "2016", type: "number" },
              { label: "Color", key: "color", placeholder: "Rojo Tornado" },
              { label: "Cilindrada", key: "cilindrada", placeholder: "1.6" },
              { label: "VIN (Chasis)", key: "vin", placeholder: "3VWBY6AU5FM..." },
              { label: "N° Motor", key: "num_motor", placeholder: "YD25310623T" },
              { label: "Kilometraje", key: "kilometraje", placeholder: "84245", type: "number" },
              { label: "Tapicería", key: "tapiceria", placeholder: "Tela" },
              { label: "N° puertas", key: "num_puertas", placeholder: "4", type: "number" },
              { label: "Multas", key: "multas", placeholder: "$0" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type={f.type ?? "text"}
                  value={(vehicle as any)[f.key]}
                  onChange={e => setVehicle(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            {[
              { label: "Combustible", key: "combustible", options: ["GASOLINA", "DIÉSEL", "HÍBRIDO", "ELÉCTRICO", "GAS"] },
              { label: "Transmisión", key: "transmision", options: ["MECÁNICA", "AUTOMÁTICA", "CVT", "SEMIAUTOMÁTICA"] },
              { label: "Tracción", key: "traccion", options: ["4x2", "4x4", "AWD", "FWD", "RWD"] },
              { label: "Tipo vehículo", key: "tipo_vehiculo", options: ["auto", "camioneta", "furgón", "moto", "bus", "otro"] },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <select
                  value={(vehicle as any)[f.key]}
                  onChange={e => setVehicle(v => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Fotografías — solo en la última sección, antes de comentarios */}
          {step === "mecanica" && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Camera size={15} className="text-gray-400" /> Fotografías del vehículo
                </label>
                <span className="text-xs text-gray-400">{photoFiles.length}/10 · máx. 5 MB c/u</span>
              </div>

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
                  className="w-full py-3 border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-xl text-sm text-gray-400 hover:text-blue-500 transition flex items-center justify-center gap-2"
                >
                  <Camera size={15} /> Agregar fotos
                </button>
              )}
            </div>
          )}

          {/* Comentarios solo en la última sección */}
          {step === "mecanica" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones finales</label>
              <textarea
                value={comentarios}
                onChange={e => setComentarios(e.target.value)}
                rows={3}
                placeholder="Observaciones generales de la inspección..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {/* Resumen final solo en última sección */}
          {step === "mecanica" && (
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
                <p className="text-slate-500 text-sm mt-1">/ 7.0</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => goToStep(step === "visual" ? "client" : step === "carroceria" ? "visual" : "carroceria")}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              ← Volver
            </button>
            {step !== "mecanica" ? (
              <button
                onClick={() => goToStep(step === "visual" ? "carroceria" : "mecanica")}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition"
              >
                {step === "visual" ? "Carrocería →" : "Mecánica →"}
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition"
              >
                {loading ? "Guardando..." : "✓ Guardar inspección"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
