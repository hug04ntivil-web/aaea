"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Search, ChevronRight, User, Car, ClipboardList } from "lucide-react"
import { INSPECTION_ITEMS, getSubsections, getItemsBySubsection } from "@/lib/inspection-items"
import { cn, calcNotaFinal } from "@/lib/utils"

interface Client { id: string; full_name: string; email: string; phone: string }

interface Props {
  inspectorId: string
  inspectorName: string
  clients: Client[]
}

type Step = "vehicle" | "client" | "visual" | "carroceria" | "mecanica" | "summary"

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "vehicle", label: "Vehículo", icon: Car },
  { key: "client", label: "Cliente", icon: User },
  { key: "visual", label: "Visual", icon: ClipboardList },
  { key: "carroceria", label: "Carrocería", icon: ClipboardList },
  { key: "mecanica", label: "Mecánica", icon: ClipboardList },
]

export default function NewInspectionForm({ inspectorId, inspectorName, clients }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("vehicle")
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

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

  // Inspection items state: key → { estado, observaciones }
  const [items, setItems] = useState<Record<string, { estado: string; observaciones: string }>>(() => {
    const init: Record<string, { estado: string; observaciones: string }> = {}
    INSPECTION_ITEMS.forEach(i => { init[i.key] = { estado: "N/A", observaciones: "" } })
    return init
  })

  // Scores
  const [notaVisual, setNotaVisual] = useState(7.0)
  const [notaCarroceria, setNotaCarroceria] = useState(7.0)
  const [notaMecanica, setNotaMecanica] = useState(7.0)
  const [comentarios, setComentarios] = useState("")

  // Búsqueda de patente (manual por ahora)
  async function handleSearchPatente() {
    if (!patente.trim()) return
    setSearching(true)
    const ppu = patente.trim().toUpperCase()
    setVehicle(v => ({ ...v, patente: ppu }))
    // Primero buscar en nuestra BD
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
      <div className="space-y-6">
        {subsections.map(sub => (
          <div key={sub}>
            <h3 className="text-sm font-bold text-gray-700 mb-3 pb-1 border-b border-gray-100">{sub}</h3>
            <div className="space-y-2">
              {getItemsBySubsection(sub).map(item => (
                <div key={item.key} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="text-sm font-medium text-gray-700 flex-1">{item.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.estados.map(estado => (
                        <button
                          key={estado}
                          type="button"
                          onClick={() => updateItem(item.key, "estado", estado)}
                          className={cn(
                            "px-3 py-1 text-xs rounded-full font-medium border transition-all",
                            items[item.key]?.estado === estado
                              ? estado === "N/A" ? "bg-gray-400 text-white border-gray-400"
                                : estado.includes("Daño") || estado === "Malo" || estado === "Presenta" && item.key.startsWith("fuga") || estado === "Bajo nivel" || estado === "Anormal"
                                ? "bg-red-500 text-white border-red-500"
                                : estado === "Con Daño" ? "bg-orange-500 text-white border-orange-500"
                                : "bg-green-500 text-white border-green-500"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          )}
                        >
                          {estado}
                        </button>
                      ))}
                    </div>
                  </div>
                  {item.hasVidaUtil && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Vida útil restante (ej: 60%)"
                        value={items[item.key]?.observaciones ?? ""}
                        onChange={e => updateItem(item.key, "observaciones", e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  )}
                  {item.hasObservaciones && !item.hasVidaUtil && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Observaciones (opcional)"
                        value={items[item.key]?.observaciones ?? ""}
                        onChange={e => updateItem(item.key, "observaciones", e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
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

  const stepIndex = ["vehicle", "client", "visual", "carroceria", "mecanica"].indexOf(step)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress steps */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => i <= stepIndex + 1 && setStep(s.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                step === s.key ? "bg-blue-600 text-white shadow-sm" :
                i < stepIndex ? "bg-green-100 text-green-700" :
                "bg-gray-100 text-gray-500"
              )}
            >
              <s.icon size={13} />
              {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* ── PASO 1: VEHÍCULO ─────────────────── */}
      {step === "vehicle" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">Datos del vehículo</h2>

          {/* Búsqueda por patente */}
          <div className="flex gap-2 mb-5">
            <input
              type="text"
              value={patente}
              onChange={e => setPatente(e.target.value.toUpperCase())}
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
              {searching ? "Buscando..." : "Buscar"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Patente", key: "patente", placeholder: "HPTT72" },
              { label: "Marca", key: "marca", placeholder: "Volkswagen" },
              { label: "Modelo", key: "modelo", placeholder: "Golf" },
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

            {/* Selects */}
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

          {/* Datos documentos */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-600 mb-3">Documentos del vehículo</p>
            <div className="grid grid-cols-2 gap-3">
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

          <button
            onClick={() => setStep("client")}
            className="mt-5 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition"
          >
            Siguiente: Cliente →
          </button>
        </div>
      )}

      {/* ── PASO 2: CLIENTE ─────────────────── */}
      {step === "client" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">Cliente</h2>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setIsNewClient(false)}
              className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition",
                !isNewClient ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}
            >
              Cliente existente
            </button>
            <button
              onClick={() => setIsNewClient(true)}
              className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition",
                isNewClient ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}
            >
              Cliente nuevo
            </button>
          </div>

          {!isNewClient ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Selecciona un cliente</label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Seleccionar --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `· ${c.phone}` : ""}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Nombre completo *", key: "full_name", placeholder: "Max Herrera Bahamondes", span: true },
                { label: "RUT", key: "rut", placeholder: "12.345.678-9" },
                { label: "Teléfono", key: "phone", placeholder: "+569 8776 2210" },
                { label: "Email", key: "email", placeholder: "cliente@correo.com" },
                { label: "Ciudad", key: "city", placeholder: "Santiago" },
              ].map(f => (
                <div key={f.key} className={f.span ? "col-span-2" : ""}>
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
            <button onClick={() => setStep("vehicle")} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">← Volver</button>
            <button onClick={() => setStep("visual")} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition">Iniciar inspección →</button>
          </div>
        </div>
      )}

      {/* ── PASO 3: INSPECCIÓN VISUAL ─────────── */}
      {step === "visual" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800">1. Inspección Visual</h2>
            <span className="text-xs text-gray-500">Sección 1/3</span>
          </div>
          <div className="flex items-center gap-2 mb-5">
            <label className="text-sm text-gray-600 font-medium">Nota:</label>
            <input
              type="number" min="0" max="7" step="0.1"
              value={notaVisual}
              onChange={e => setNotaVisual(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-400">/ 7.0</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${notaVisual >= 6.5 ? "bg-green-500" : notaVisual >= 5 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${(notaVisual / 7) * 100}%` }}
              />
            </div>
          </div>
          {renderInspectionSection(1)}
          <div className="flex gap-2 mt-5">
            <button onClick={() => setStep("client")} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">← Volver</button>
            <button onClick={() => setStep("carroceria")} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm">Carrocería →</button>
          </div>
        </div>
      )}

      {/* ── PASO 4: CARROCERÍA ────────────────── */}
      {step === "carroceria" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800">2. Inspección Carrocería</h2>
            <span className="text-xs text-gray-500">Sección 2/3</span>
          </div>
          <div className="flex items-center gap-2 mb-5">
            <label className="text-sm text-gray-600 font-medium">Nota:</label>
            <input
              type="number" min="0" max="7" step="0.1"
              value={notaCarroceria}
              onChange={e => setNotaCarroceria(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-400">/ 7.0</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${notaCarroceria >= 6.5 ? "bg-green-500" : notaCarroceria >= 5 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${(notaCarroceria / 7) * 100}%` }}
              />
            </div>
          </div>
          {renderInspectionSection(2)}
          <div className="flex gap-2 mt-5">
            <button onClick={() => setStep("visual")} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">← Volver</button>
            <button onClick={() => setStep("mecanica")} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm">Mecánica →</button>
          </div>
        </div>
      )}

      {/* ── PASO 5: MECÁNICA ──────────────────── */}
      {step === "mecanica" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800">3. Inspección Mecánica</h2>
            <span className="text-xs text-gray-500">Sección 3/3</span>
          </div>
          <div className="flex items-center gap-2 mb-5">
            <label className="text-sm text-gray-600 font-medium">Nota:</label>
            <input
              type="number" min="0" max="7" step="0.1"
              value={notaMecanica}
              onChange={e => setNotaMecanica(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-400">/ 7.0</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${notaMecanica >= 6.5 ? "bg-green-500" : notaMecanica >= 5 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${(notaMecanica / 7) * 100}%` }}
              />
            </div>
          </div>
          {renderInspectionSection(3)}

          {/* Comentarios finales */}
          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios finales</label>
            <textarea
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              rows={3}
              placeholder="Observaciones generales de la inspección..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Nota final */}
          <div className="mt-4 p-4 bg-slate-800 rounded-xl text-white">
            <p className="text-xs text-slate-400 mb-1">Nota final</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black ${calcNotaFinal(notaVisual, notaCarroceria, notaMecanica) >= 6.5 ? "text-green-400" : calcNotaFinal(notaVisual, notaCarroceria, notaMecanica) >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                {calcNotaFinal(notaVisual, notaCarroceria, notaMecanica).toFixed(1)}
              </span>
              <span className="text-slate-400 text-lg">/ 7.0</span>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-slate-400">
              <span>Visual: {notaVisual}</span>
              <span>Carrocería: {notaCarroceria}</span>
              <span>Mecánica: {notaMecanica}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={() => setStep("carroceria")} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">← Volver</button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium text-sm disabled:opacity-50 transition"
            >
              {loading ? "Guardando..." : "✓ Guardar inspección"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
