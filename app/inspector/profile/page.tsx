"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import AppShell from "@/components/layout/app-shell"
import { toast } from "sonner"
import { Save, Lock } from "lucide-react"

export default function InspectorProfilePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<"inspector" | "admin">("inspector")
  const [userName, setUserName] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? "")

      const res = await fetch("/api/me")
      const data = await res.json()
      if (data.profile) {
        setFullName(data.profile.full_name ?? "")
        setPhone(data.profile.phone ?? "")
        setRole(data.profile.role ?? "inspector")
        setUserName(data.profile.full_name ?? "")
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, phone }),
      })
      if (res.ok) { toast.success("Perfil actualizado"); setUserName(fullName) }
      else { const d = await res.json(); toast.error(d.error ?? "Error al guardar") }
    } catch { toast.error("Error de conexión") }
    finally { setSaving(false) }
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 6) { toast.error("Mínimo 6 caracteres"); return }
    if (newPassword !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return }
    setChangingPassword(true)
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) { toast.success("Contraseña cambiada"); setNewPassword(""); setConfirmPassword("") }
      else { const d = await res.json(); toast.error(d.error ?? "Error al cambiar contraseña") }
    } catch { toast.error("Error de conexión") }
    finally { setChangingPassword(false) }
  }

  if (loading) return (
    <AppShell role={role} userName="" pageTitle="Mi perfil">
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    </AppShell>
  )

  return (
    <AppShell role={role} userName={userName} pageTitle="Mi perfil">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Datos personales</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar desde aquí.</p>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Lock size={16} className="text-gray-400" /> Cambiar contraseña
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={changePassword}
            disabled={changingPassword}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            <Lock size={15} />
            {changingPassword ? "Cambiando..." : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
