"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, X, User, Phone, Mail, MapPin } from "lucide-react"

interface Client {
  id: string
  full_name: string
  rut: string | null
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  notes: string | null
}

const EMPTY_FORM = { full_name: "", rut: "", phone: "", email: "", city: "Santiago", address: "", notes: "" }

export default function InspectorClientsPage() {
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("full_name, role").eq("id", user.id).single()
        .then(({ data }) => setProfile(data))
    })
    loadClients()
  }, [])

  async function loadClients() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtiene clientes de sus inspecciones + los que él creó
      const [inspRes, createdRes] = await Promise.all([
        supabase.from("inspections").select("client_id").eq("inspector_id", user.id),
        supabase.from("clients").select("id").eq("created_by", user.id),
      ])

      const ids = new Set<string>([
        ...(inspRes.data?.map((i: any) => i.client_id).filter(Boolean) ?? []),
        ...(createdRes.data?.map((c: any) => c.id) ?? []),
      ])

      if (ids.size === 0) { setClients([]); return }

      const { data } = await supabase
        .from("clients")
        .select("id, full_name, rut, phone, email, city, address, notes")
        .in("id", [...ids])
        .order("full_name")

      setClients((data ?? []) as Client[])
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditClient(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(c: Client) {
    setEditClient(c)
    setForm({
      full_name: c.full_name ?? "",
      rut: c.rut ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      city: c.city ?? "Santiago",
      address: c.address ?? "",
      notes: c.notes ?? "",
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.full_name.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    try {
      if (editClient) {
        const res = await fetch(`/api/admin/clients/${editClient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) { toast.error((await res.json()).error ?? "Error al actualizar"); return }
        toast.success("Cliente actualizado")
      } else {
        const res = await fetch("/api/admin/create-client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) { toast.error((await res.json()).error ?? "Error al crear"); return }
        toast.success("Cliente creado")
      }
      setShowModal(false)
      await loadClients()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar cliente "${name}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Error al eliminar"); return }
      toast.success("Cliente eliminado")
      await loadClients()
    } finally {
      setDeletingId(null)
    }
  }

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <AppShell role={profile?.role as any ?? "inspector"} userName={profile?.full_name ?? ""} pageTitle="Mis clientes">

      {/* Modal crear / editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{editClient ? "Editar cliente" : "Nuevo cliente"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Nombre completo *", name: "full_name", placeholder: "Juan Pérez" },
                { label: "RUT", name: "rut", placeholder: "12.345.678-9" },
                { label: "Teléfono", name: "phone", placeholder: "+56 9 1234 5678", type: "tel" },
                { label: "Email", name: "email", placeholder: "cliente@correo.com", type: "email" },
                { label: "Ciudad", name: "city", placeholder: "Santiago" },
                { label: "Dirección", name: "address", placeholder: "Av. Ejemplo 123, San Ramón" },
              ].map(f => (
                <div key={f.name}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{f.label}</label>
                  <input
                    type={f.type ?? "text"}
                    placeholder={f.placeholder}
                    value={(form as any)[f.name]}
                    onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas</label>
                <textarea
                  rows={2}
                  placeholder="Información adicional..."
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition">
                {saving ? "Guardando..." : editClient ? "Guardar" : "Crear cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Mis clientes</h2>
            <p className="text-sm text-gray-500">{clients.length} cliente{clients.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            <Plus size={15} /> Nuevo cliente
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Cargando...</div>
          ) : clients.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              <User size={32} className="mx-auto mb-2 opacity-30" />
              No tienes clientes aún. Crea el primero.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clients.map(c => (
                <div key={c.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{c.full_name}</p>
                      {c.rut && <p className="text-xs text-gray-400 mt-0.5">RUT: {c.rut}</p>}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Phone size={10} /> {c.phone}
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Mail size={10} /> {c.email}
                          </a>
                        )}
                        {c.address && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={10} /> {c.address}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.full_name)}
                        disabled={deletingId === c.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
