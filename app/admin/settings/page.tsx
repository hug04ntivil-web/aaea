"use client"

import { useState, useEffect, useRef } from "react"
import AppShell from "@/components/layout/app-shell"
import { toast } from "sonner"
import { Save, Upload, X, Building2, CreditCard, Receipt, Image } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

interface Settings {
  company_name: string
  company_rut: string
  company_phone: string
  company_email: string
  company_address: string
  company_address2: string
  company_services: string
  company_logo_url: string
  payment_bank: string
  payment_account_type: string
  payment_account_number: string
  payment_rut: string
  payment_email: string
  payment_note: string
  iva_pct: string
  budget_next_number: string
}

const EMPTY: Settings = {
  company_name: "", company_rut: "", company_phone: "", company_email: "",
  company_address: "", company_address2: "", company_services: "", company_logo_url: "",
  payment_bank: "", payment_account_type: "Cuenta Corriente", payment_account_number: "",
  payment_rut: "", payment_email: "", payment_note: "", iva_pct: "19", budget_next_number: "1",
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [settings, setSettings] = useState<Settings>(EMPTY)
  const logoRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings) setSettings(prev => ({ ...prev, ...d.settings }))
      setLoading(false)
    })
  }, [])

  function update(key: keyof Settings, val: string) {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  async function uploadLogo(file: File) {
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo máximo 2MB"); return }
    setUploadingLogo(true)
    try {
      const ext = file.name.split(".").pop()
      const path = `company/logo.${ext}`
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path)
      update("company_logo_url", publicUrl + "?t=" + Date.now())
      toast.success("Logo subido")
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir logo")
    } finally {
      setUploadingLogo(false)
    }
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

  const nextNumPreview = `PTO_${String(parseInt(settings.budget_next_number) || 1).padStart(6, "0")}`

  return (
    <AppShell role="admin" userName="Admin" pageTitle="Configuración">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Logo */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Image size={16} className="text-gray-500" />
            <h3 className="font-semibold text-gray-800">Logo de la empresa</h3>
          </div>
          <div className="flex items-center gap-4">
            {settings.company_logo_url ? (
              <div className="relative">
                <img src={settings.company_logo_url} alt="Logo" className="h-16 w-auto object-contain border border-gray-200 rounded-lg p-1" />
                <button onClick={() => update("company_logo_url", "")}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                  <X size={10} />
                </button>
              </div>
            ) : (
              <div className="w-20 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <Image size={20} className="text-gray-400" />
              </div>
            )}
            <div>
              <button onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
                <Upload size={14} />
                {uploadingLogo ? "Subiendo..." : "Subir logo"}
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG — máximo 2MB</p>
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
            </div>
          </div>
        </div>

        {/* Datos empresa */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-gray-500" />
            <h3 className="font-semibold text-gray-800">Datos de la empresa</h3>
          </div>
          {[
            { key: "company_name" as const, label: "Nombre / Razón social", placeholder: "AAEA Inspecciones SpA" },
            { key: "company_rut" as const, label: "RUT empresa", placeholder: "76.123.456-7" },
            { key: "company_phone" as const, label: "Teléfono", placeholder: "+56 9 1234 5678" },
            { key: "company_email" as const, label: "Email de contacto", placeholder: "contacto@aaea.cl" },
            { key: "company_address" as const, label: "Dirección principal", placeholder: "Av. Ejemplo 123, Santiago" },
            { key: "company_address2" as const, label: "Dirección secundaria (opcional)", placeholder: "Otra dirección, ciudad" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <input type="text" value={settings[f.key]} onChange={e => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción de servicios</label>
            <textarea value={settings.company_services} onChange={e => update("company_services", e.target.value)}
              rows={2} placeholder="SERVICIOS INTEGRALES DE INSPECCIÓN Y ASESORÍA AUTOMOTRIZ"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* Datos bancarios */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={16} className="text-gray-500" />
            <h3 className="font-semibold text-gray-800">Datos de pago / Transferencia</h3>
          </div>
          {[
            { key: "payment_bank" as const, label: "Banco", placeholder: "Banco de Chile" },
            { key: "payment_account_number" as const, label: "N° de cuenta", placeholder: "00-884-07720-09" },
            { key: "payment_rut" as const, label: "RUT titular cuenta", placeholder: "76.123.456-7" },
            { key: "payment_email" as const, label: "Email de pago", placeholder: "pagos@aaea.cl" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <input type="text" value={settings[f.key]} onChange={e => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de cuenta</label>
            <select value={settings.payment_account_type} onChange={e => update("payment_account_type", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Cuenta Corriente</option>
              <option>Cuenta Vista</option>
              <option>Cuenta de Ahorro</option>
              <option>Cuenta RUT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nota de pago (aparece en PDF)</label>
            <textarea value={settings.payment_note} onChange={e => update("payment_note", e.target.value)}
              rows={2} placeholder="Monto a pagar en efectivo o transferencia. Pago a fecha recarga 10%."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* Presupuestos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={16} className="text-gray-500" />
            <h3 className="font-semibold text-gray-800">Configuración de presupuestos</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">IVA por defecto (%)</label>
              <input type="number" min="0" max="100" value={settings.iva_pct}
                onChange={e => update("iva_pct", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Próximo N° correlativo</label>
              <input type="number" min="1" value={settings.budget_next_number}
                onChange={e => update("budget_next_number", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p className="text-xs text-gray-400">Próximo presupuesto: <span className="font-mono font-semibold text-gray-600">{nextNumPreview}</span></p>
        </div>

        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 w-full justify-center shadow-sm">
          <Save size={15} />
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </AppShell>
  )
}
