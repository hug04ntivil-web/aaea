"use client"

import { useState, useEffect } from "react"
import AppShell from "@/components/layout/app-shell"
import { toast } from "sonner"
import { Save } from "lucide-react"

interface Settings {
  company_name: string
  company_rut: string
  company_phone: string
  company_email: string
  company_address: string
  default_iva: string
  budget_next_number: string
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    company_name: "",
    company_rut: "",
    company_phone: "",
    company_email: "",
    company_address: "",
    default_iva: "19",
    budget_next_number: "1",
  })

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings) setSettings(prev => ({ ...prev, ...d.settings }))
      setLoading(false)
    })
  }, [])

  function update(key: keyof Settings, val: string) {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      if (res.ok) toast.success("Configuración guardada")
      else { const d = await res.json(); toast.error(d.error ?? "Error al guardar") }
    } catch { toast.error("Error de conexión") }
    finally { setSaving(false) }
  }

  if (loading) return (
    <AppShell role="admin" userName="Admin" pageTitle="Configuración">
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    </AppShell>
  )

  return (
    <AppShell role="admin" userName="Admin" pageTitle="Configuración">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Datos de la empresa</h3>
          {[
            { key: "company_name" as const, label: "Nombre / Razón social", placeholder: "AAEA Inspecciones SpA" },
            { key: "company_rut" as const, label: "RUT empresa", placeholder: "76.123.456-7" },
            { key: "company_phone" as const, label: "Teléfono", placeholder: "+56 9 1234 5678" },
            { key: "company_email" as const, label: "Email de contacto", placeholder: "contacto@aaea.cl" },
            { key: "company_address" as const, label: "Dirección", placeholder: "Av. Ejemplo 123, Santiago" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                type="text"
                value={settings[f.key]}
                onChange={e => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Configuración de presupuestos</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IVA por defecto (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.default_iva}
              onChange={e => update("default_iva", e.target.value)}
              className="w-32 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Próximo número de presupuesto</label>
            <input
              type="number"
              min="1"
              value={settings.budget_next_number}
              onChange={e => update("budget_next_number", e.target.value)}
              className="w-32 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">El próximo presupuesto tendrá el número PR-{settings.budget_next_number.padStart(4, "0")}</p>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 w-full justify-center"
        >
          <Save size={15} />
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </AppShell>
  )
}
