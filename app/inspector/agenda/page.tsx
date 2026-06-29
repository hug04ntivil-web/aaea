"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus, Car, User, Clock, X, CalendarDays, Trash2, Mail, MessageCircle, MapPin, AtSign } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Inspection {
  id: string
  fecha_inspeccion: string
  status: string
  nota_final: number | null
  vehicles: { patente: string; marca: string | null; modelo: string | null } | null
  clients: { full_name: string } | null
}

interface Appointment {
  id: string
  fecha: string
  hora: string | null
  titulo: string
  descripcion: string | null
  cliente_nombre: string | null
  patente: string | null
  status: string
}

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function statusColor(s: string) {
  if (s === "completed") return "bg-green-500"
  if (s === "sent")      return "bg-blue-500"
  if (s === "draft")     return "bg-yellow-500"
  return "bg-gray-400"
}

function statusLabel(s: string) {
  if (s === "completed") return "Completa"
  if (s === "sent")      return "Enviada"
  if (s === "draft")     return "Borrador"
  return "Pendiente"
}

interface NewApptForm {
  titulo: string
  hora: string
  descripcion: string
  cliente_nombre: string
  patente: string
  cliente_email: string
  cliente_direccion: string
}

const EMPTY_FORM: NewApptForm = { titulo: "", hora: "", descripcion: "", cliente_nombre: "", patente: "", cliente_email: "", cliente_direccion: "" }

export default function AgendaPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [today] = useState(new Date())
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showNewAppt, setShowNewAppt] = useState(false)
  const [apptForm, setApptForm] = useState<NewApptForm>(EMPTY_FORM)
  const [savingAppt, setSavingAppt] = useState(false)
  const [savedAppt, setSavedAppt] = useState<(NewApptForm & { fecha: string }) | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  const loadData = useCallback(async (date: Date) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const from = new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString().slice(0, 10)
    const to   = new Date(date.getFullYear(), date.getMonth() + 2, 0).toISOString().slice(0, 10)

    const [inspRes, apptRes] = await Promise.all([
      supabase.from("inspections")
        .select("id, fecha_inspeccion, status, nota_final, vehicles(patente, marca, modelo), clients(full_name)")
        .eq("inspector_id", user.id)
        .gte("fecha_inspeccion", from)
        .lte("fecha_inspeccion", to)
        .order("fecha_inspeccion", { ascending: true }),
      fetch(`/api/appointments?from=${from}&to=${to}`).then(r => r.json()),
    ])

    setInspections((inspRes.data ?? []) as unknown as Inspection[])
    setAppointments(apptRes.appointments ?? [])
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("full_name, role").eq("id", user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  useEffect(() => { loadData(viewDate) }, [viewDate, loadData])

  const { days, year, month } = useMemo(() => {
    const year  = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const first = new Date(year, month, 1).getDay()
    const last  = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = Array(first).fill(null)
    for (let d = 1; d <= last; d++) days.push(d)
    while (days.length % 7 !== 0) days.push(null)
    return { days, year, month }
  }, [viewDate])

  const byDay = useMemo(() => {
    const map: Record<string, { inspections: Inspection[]; appointments: Appointment[] }> = {}
    inspections.forEach(ins => {
      const key = ins.fecha_inspeccion.slice(0, 10)
      if (!map[key]) map[key] = { inspections: [], appointments: [] }
      map[key].inspections.push(ins)
    })
    appointments.forEach(appt => {
      const key = appt.fecha
      if (!map[key]) map[key] = { inspections: [], appointments: [] }
      map[key].appointments.push(appt)
    })
    return map
  }, [inspections, appointments])

  function dayKey(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const selectedData = selectedDay ? (byDay[selectedDay] ?? { inspections: [], appointments: [] }) : null

  function prevMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDay(null) }
  function nextMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDay(null) }

  function openNewAppt(day: string) {
    setApptForm(EMPTY_FORM)
    setSelectedDay(day)
    setShowNewAppt(true)
  }

  async function saveAppointment() {
    if (!apptForm.titulo.trim()) { toast.error("Ingresa un título"); return }
    if (!selectedDay) return
    setSavingAppt(true)
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: selectedDay, ...apptForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Agendamiento creado")
      setSavedAppt({ ...apptForm, fecha: selectedDay })
      setApptForm(EMPTY_FORM)
      await loadData(viewDate)
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar")
    } finally {
      setSavingAppt(false)
    }
  }

  async function sendEmailNotification() {
    if (!savedAppt?.cliente_email) return
    setSendingEmail(true)
    try {
      const res = await fetch("/api/appointments/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedAppt),
      })
      if (res.ok) toast.success("Correo enviado al cliente")
      else toast.error("Error al enviar correo")
    } catch {
      toast.error("Error al enviar correo")
    } finally {
      setSendingEmail(false)
    }
  }

  function buildWhatsAppLink(appt: NewApptForm & { fecha: string }) {
    const fecha = new Date(appt.fecha + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    const lines = [
      `✅ *Agendamiento confirmado — AAEA Inspecciones*`,
      ``,
      `📋 *Servicio:* ${appt.titulo}`,
      `📅 *Fecha:* ${fecha}`,
      appt.hora ? `⏰ *Hora:* ${appt.hora}` : "",
      appt.cliente_direccion ? `📍 *Dirección:* ${appt.cliente_direccion}` : "",
      appt.descripcion ? `📝 *Nota:* ${appt.descripcion}` : "",
      ``,
      `_Si necesita reagendar, contáctenos directamente._`,
    ].filter(Boolean).join("\n")
    return `https://wa.me/?text=${encodeURIComponent(lines)}`
  }

  async function deleteAppointment(id: string) {
    if (!confirm("¿Eliminar este agendamiento?")) return
    const res = await fetch(`/api/appointments?id=${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Eliminado"); await loadData(viewDate) }
    else toast.error("Error al eliminar")
  }

  return (
    <AppShell role={profile?.role as any ?? "inspector"} userName={profile?.full_name ?? ""} pageTitle="Agenda">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Modal nuevo agendamiento */}
        {showNewAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <CalendarDays size={16} className="text-blue-500" />
                  Nuevo agendamiento
                </h3>
                <button onClick={() => { setShowNewAppt(false); setSavedAppt(null) }} className="text-gray-400 hover:text-gray-600 transition">
                  <X size={18} />
                </button>
              </div>
              {selectedDay && (
                <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-lg mb-4 font-medium">
                  📅 {new Date(selectedDay + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}

              {savedAppt ? (
                /* Paso 2: agendamiento guardado, ofrecer notificar */
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">✅ Agendamiento guardado</p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">{savedAppt.titulo}</p>
                  </div>
                  <p className="text-xs font-medium text-gray-600 dark:text-slate-400">¿Notificar al cliente?</p>
                  <div className="flex gap-2">
                    {savedAppt.cliente_email ? (
                      <button
                        onClick={sendEmailNotification}
                        disabled={sendingEmail}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition"
                      >
                        <Mail size={14} />
                        {sendingEmail ? "Enviando..." : "Email"}
                      </button>
                    ) : null}
                    <a
                      href={buildWhatsAppLink(savedAppt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  </div>
                  <button
                    onClick={() => { setShowNewAppt(false); setSavedAppt(null) }}
                    className="w-full py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  >
                    Cerrar sin notificar
                  </button>
                </div>
              ) : (
                /* Paso 1: formulario */
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Título *</label>
                      <input
                        type="text"
                        placeholder="Ej: Inspección Toyota Corolla"
                        value={apptForm.titulo}
                        onChange={e => setApptForm(f => ({ ...f, titulo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Hora</label>
                        <input
                          type="time"
                          value={apptForm.hora}
                          onChange={e => setApptForm(f => ({ ...f, hora: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Patente</label>
                        <input
                          type="text"
                          placeholder="HPTT72"
                          value={apptForm.patente}
                          onChange={e => setApptForm(f => ({ ...f, patente: e.target.value.toUpperCase() }))}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 flex items-center gap-1"><User size={11} /> Cliente</label>
                      <input
                        type="text"
                        placeholder="Nombre del cliente"
                        value={apptForm.cliente_nombre}
                        onChange={e => setApptForm(f => ({ ...f, cliente_nombre: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 flex items-center gap-1"><AtSign size={11} /> Email cliente</label>
                      <input
                        type="email"
                        placeholder="cliente@correo.com"
                        value={apptForm.cliente_email}
                        onChange={e => setApptForm(f => ({ ...f, cliente_email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 flex items-center gap-1"><MapPin size={11} /> Dirección</label>
                      <input
                        type="text"
                        placeholder="Av. Ejemplo 123, Santiago"
                        value={apptForm.cliente_direccion}
                        onChange={e => setApptForm(f => ({ ...f, cliente_direccion: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Descripción</label>
                      <textarea
                        rows={2}
                        placeholder="Notas adicionales..."
                        value={apptForm.descripcion}
                        onChange={e => setApptForm(f => ({ ...f, descripcion: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setShowNewAppt(false)} className="flex-1 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                      Cancelar
                    </button>
                    <button onClick={saveAppointment} disabled={savingAppt} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition">
                      {savingAppt ? "Guardando..." : "Agendar"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Cabecera mes */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] transition">
              <ChevronLeft size={18} className="text-[var(--text-2)]" />
            </button>
            <h2 className="text-base font-bold text-[var(--text-1)]">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] transition">
              <ChevronRight size={18} className="text-[var(--text-2)]" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-[var(--text-3)] py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => {
              if (!d) return <div key={i} />
              const key = dayKey(d)
              const dayData = byDay[key]
              const totalDots = (dayData?.inspections.length ?? 0) + (dayData?.appointments.length ?? 0)
              const isToday = key === todayKey
              const isSelected = key === selectedDay
              return (
                <button key={i} onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={cn(
                    "relative flex flex-col items-center py-1 rounded-lg text-xs transition",
                    isSelected ? "bg-blue-600 text-white" :
                    isToday ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold" :
                    "hover:bg-[var(--bg-subtle)] text-[var(--text-1)]"
                  )}>
                  <span className="font-medium">{d}</span>
                  {totalDots > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full">
                      {(dayData?.inspections ?? []).slice(0, 2).map((ins, j) => (
                        <span key={`i${j}`} className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : statusColor(ins.status))} />
                      ))}
                      {(dayData?.appointments ?? []).slice(0, 2).map((_, j) => (
                        <span key={`a${j}`} className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/70" : "bg-purple-400")} />
                      ))}
                      {totalDots > 4 && <span className={cn("text-[9px] leading-none", isSelected ? "text-white" : "text-[var(--text-3)]")}>+{totalDots - 4}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 px-1 flex-wrap">
          {[["Borrador","bg-yellow-500"],["Completa","bg-green-500"],["Agendamiento","bg-purple-400"]].map(([lbl,cls]) => (
            <span key={lbl} className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
              <span className={cn("w-2 h-2 rounded-full", cls)} /> {lbl}
            </span>
          ))}
        </div>

        {/* Panel día seleccionado */}
        {selectedDay && selectedData && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-1)]">
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => openNewAppt(selectedDay)}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                  <Plus size={12} /> Agendar
                </button>
                <button
                  onClick={() => router.push("/inspector/inspections/new")}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                  <Plus size={12} /> Inspección
                </button>
              </div>
            </div>

            {/* Agendamientos del día */}
            {selectedData.appointments.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 uppercase tracking-wide">Agendamientos</p>
                <div className="space-y-2">
                  {selectedData.appointments.map(appt => (
                    <div key={appt.id} className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800">
                      <CalendarDays size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-1)]">{appt.titulo}</p>
                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                          {appt.hora && <span className="text-xs text-[var(--text-2)] flex items-center gap-1"><Clock size={10} />{appt.hora}</span>}
                          {appt.cliente_nombre && <span className="text-xs text-[var(--text-2)] flex items-center gap-1"><User size={10} />{appt.cliente_nombre}</span>}
                          {appt.patente && <span className="text-xs text-[var(--text-2)] flex items-center gap-1"><Car size={10} />{appt.patente}</span>}
                        </div>
                        {appt.descripcion && <p className="text-xs text-[var(--text-3)] mt-1">{appt.descripcion}</p>}
                      </div>
                      <button onClick={() => deleteAppointment(appt.id)} className="text-gray-300 hover:text-red-400 transition flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inspecciones del día */}
            {selectedData.inspections.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">Inspecciones</p>
                <div className="space-y-2">
                  {selectedData.inspections.map(ins => (
                    <button key={ins.id} onClick={() => router.push(`/inspector/inspections/${ins.id}`)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-subtle)] hover:border-blue-300 border border-transparent transition">
                      <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", statusColor(ins.status))} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-1)] flex items-center gap-1.5">
                          <Car size={12} className="text-[var(--text-3)]" />
                          {ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo}
                        </p>
                        {ins.clients?.full_name && (
                          <p className="text-xs text-[var(--text-2)] flex items-center gap-1 mt-0.5">
                            <User size={11} className="text-[var(--text-3)]" />
                            {ins.clients.full_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {ins.nota_final && (
                          <p className={cn("text-sm font-bold", ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-500" : "text-red-500")}>
                            {ins.nota_final}/7
                          </p>
                        )}
                        <span className="text-xs text-[var(--text-3)]">{statusLabel(ins.status)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedData.inspections.length === 0 && selectedData.appointments.length === 0 && (
              <p className="text-sm text-[var(--text-3)] italic">Sin actividad para este día.</p>
            )}
          </div>
        )}

        {/* Lista este mes (si no hay día seleccionado) */}
        {!selectedDay && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                <Clock size={14} className="text-blue-500" /> Este mes
              </h3>
              <div className="flex gap-2">
                <button onClick={() => { const today = todayKey; setSelectedDay(today); openNewAppt(today) }}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                  <Plus size={12} /> Agendar
                </button>
                <button onClick={() => router.push("/inspector/inspections/new")}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                  <Plus size={12} /> Inspección
                </button>
              </div>
            </div>

            {inspections.filter(i => i.fecha_inspeccion.slice(0,7) === `${year}-${String(month+1).padStart(2,"0")}`).length === 0 &&
             appointments.filter(a => a.fecha.slice(0,7) === `${year}-${String(month+1).padStart(2,"0")}`).length === 0 ? (
              <p className="text-sm text-[var(--text-3)] italic">Sin actividad este mes. Haz clic en un día para agregar.</p>
            ) : (
              <div className="space-y-2">
                {[
                  ...appointments
                    .filter(a => a.fecha.slice(0,7) === `${year}-${String(month+1).padStart(2,"0")}`)
                    .map(a => ({ type: "appt" as const, date: a.fecha, appt: a })),
                  ...inspections
                    .filter(i => i.fecha_inspeccion.slice(0,7) === `${year}-${String(month+1).padStart(2,"0")}`)
                    .map(i => ({ type: "insp" as const, date: i.fecha_inspeccion, insp: i })),
                ].sort((a, b) => a.date.localeCompare(b.date)).map((item, idx) => {
                  if (item.type === "appt") {
                    const a = item.appt
                    return (
                      <div key={`a${a.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800">
                        <CalendarDays size={14} className="text-purple-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-1)]">{a.titulo}</p>
                          <p className="text-xs text-[var(--text-2)] mt-0.5">
                            {new Date(a.fecha + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                            {a.hora ? ` · ${a.hora}` : ""}
                            {a.cliente_nombre ? ` · ${a.cliente_nombre}` : ""}
                          </p>
                        </div>
                        <button onClick={() => deleteAppointment(a.id)} className="text-gray-300 hover:text-red-400 transition flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  } else {
                    const ins = item.insp
                    return (
                      <button key={`i${ins.id}`} onClick={() => router.push(`/inspector/inspections/${ins.id}`)}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-subtle)] hover:border-blue-300 border border-transparent transition">
                        <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", statusColor(ins.status))} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-1)]">
                            {ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo}
                          </p>
                          <p className="text-xs text-[var(--text-2)] mt-0.5">
                            {new Date(ins.fecha_inspeccion + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                            {ins.clients?.full_name ? ` · ${ins.clients.full_name}` : ""}
                          </p>
                        </div>
                        {ins.nota_final && (
                          <span className={cn("text-sm font-bold flex-shrink-0", ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-500" : "text-red-500")}>
                            {ins.nota_final}/7
                          </span>
                        )}
                      </button>
                    )
                  }
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
