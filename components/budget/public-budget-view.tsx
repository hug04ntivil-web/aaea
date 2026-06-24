"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, CheckCircle } from "lucide-react"
import ShareBudgetPanel from "./share-budget-panel"

interface Props {
  budget: any
  settings: Record<string, string>
}

function fmt(n: number | null | undefined) { return Math.round(n ?? 0).toLocaleString("es-CL") }
function fmtDate(d: string) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const OPCIONES = [
  { key: "original",    label: "Original",    rep: "rep_genuino", color: "border-blue-400 bg-blue-50",   badge: "bg-blue-100 text-blue-700",   btn: "bg-blue-600 hover:bg-blue-700" },
  { key: "alternativo", label: "Alternativo", rep: "rep_korea",   color: "border-amber-400 bg-amber-50", badge: "bg-amber-100 text-amber-700", btn: "bg-amber-500 hover:bg-amber-600" },
  { key: "otro",        label: "Otro",        rep: "rep_multi",   color: "border-green-400 bg-green-50", badge: "bg-green-100 text-green-700", btn: "bg-green-600 hover:bg-green-700" },
]

export default function PublicBudgetView({ budget, settings }: Props) {
  const [accepted, setAccepted]         = useState(budget.status === "accepted")
  const [opcionAceptada, setOpcion]     = useState<string>(budget.opcion_aceptada ?? "")
  const [accepting, setAccepting]       = useState("")

  const client = budget.clients ?? null
  const clienteNombre = client?.full_name ?? budget.cliente_nombre ?? "—"
  const clienteRut    = client?.rut       ?? budget.cliente_rut     ?? ""
  const clienteTel    = client?.phone     ?? budget.cliente_telefono ?? ""
  const clienteEmail  = client?.email     ?? budget.cliente_email    ?? ""

  const items = (budget.budget_items ?? []).filter((i: any) => i.descripcion)
  const iva = Number(budget.iva_pct ?? 19)
  const dto = Number(budget.descuento_global ?? 0)

  function calcTotal(repField: string) {
    const sumRep = items.reduce((acc: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return acc + Math.round((Number(i[repField]) || 0) * f)
    }, 0)
    const sumMO = items.reduce((acc: number, i: any) => {
      const f = 1 - (Number(i.dcto_pct) || 0) / 100
      return acc + Math.round((Number(i.val_mano_obra) || 0) * f)
    }, 0)
    const sub = sumRep + sumMO - dto
    const ivaM = Math.round(sub * iva / 100)
    return { sub, ivaM, total: sub + ivaM }
  }

  const totales = [
    calcTotal("rep_genuino"),
    calcTotal("rep_korea"),
    calcTotal("rep_multi"),
  ]

  const hasAnyPrice = items.some((i: any) => i.rep_genuino > 0 || i.rep_korea > 0 || i.rep_multi > 0)
  const hasAlt      = items.some((i: any) => (i.rep_korea ?? 0) > 0)
  const hasOtro     = items.some((i: any) => (i.rep_multi ?? 0) > 0)

  const visibleOpts = OPCIONES.filter((o, idx) => idx === 0 || (idx === 1 && hasAlt) || (idx === 2 && hasOtro))

  async function handleAccept(opcion: string) {
    if (accepted || accepting) return
    setAccepting(opcion)
    try {
      const res = await fetch(`/api/budgets/${budget.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opcion }),
      })
      if (res.ok) {
        setAccepted(true)
        setOpcion(opcion)
        toast.success("¡Presupuesto aceptado! El inspector será notificado.")
      } else toast.error("Error al aceptar el presupuesto")
    } catch { toast.error("Error de conexión") }
    finally { setAccepting("") }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header empresa */}
        <div className="bg-sky-600 rounded-xl p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            {settings.company_logo_url && (
              <img src={settings.company_logo_url} alt="Logo" className="h-12 w-auto object-contain bg-white rounded-lg p-1" />
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight">{settings.company_name || "AAEA Inspecciones"}</h1>
              {settings.company_services && <p className="text-sky-100 text-xs mt-0.5">{settings.company_services}</p>}
              {settings.company_rut && <p className="text-sky-200 text-xs">RUT: {settings.company_rut}</p>}
            </div>
          </div>
        </div>

        {/* Número + Estado */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Presupuesto</p>
              <p className="text-2xl font-black text-gray-900">{budget.numero}</p>
            </div>
            {accepted ? (
              <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-sm px-3 py-1.5 rounded-full font-semibold">
                <CheckCircle size={15} /> Aceptado
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full font-medium">Vigente</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div><p className="text-xs text-gray-400">Fecha</p><p className="font-medium">{fmtDate(budget.created_at)}</p></div>
            <div><p className="text-xs text-gray-400">Vigencia</p><p className="font-medium">{budget.vigencia_dias ?? 30} días</p></div>
            {budget.forma_pago && <div className="col-span-2"><p className="text-xs text-gray-400">Forma de pago</p><p className="font-medium">{budget.forma_pago}</p></div>}
          </div>
        </div>

        {/* Cliente */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="col-span-2"><p className="text-xs text-gray-400">Nombre</p><p className="font-semibold text-gray-800">{clienteNombre}</p></div>
            {clienteRut && <div><p className="text-xs text-gray-400">RUT</p><p>{clienteRut}</p></div>}
            {clienteTel && <div><p className="text-xs text-gray-400">Teléfono</p><p>{clienteTel}</p></div>}
          </div>
        </div>

        {/* Vehículo */}
        {budget.vehicle_patente && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Vehículo</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <div><p className="text-xs text-gray-400">Patente</p><p className="font-bold text-gray-900">{budget.vehicle_patente}</p></div>
              {budget.vehicle_marca   && <div><p className="text-xs text-gray-400">Marca</p><p>{budget.vehicle_marca}</p></div>}
              {budget.vehicle_modelo  && <div><p className="text-xs text-gray-400">Modelo</p><p>{budget.vehicle_modelo}</p></div>}
              {budget.vehicle_anio    && <div><p className="text-xs text-gray-400">Año</p><p>{budget.vehicle_anio}</p></div>}
              {budget.vehicle_version && <div><p className="text-xs text-gray-400">Versión</p><p>{budget.vehicle_version}</p></div>}
              {budget.vehicle_color   && <div><p className="text-xs text-gray-400">Color</p><p>{budget.vehicle_color}</p></div>}
              {budget.vehicle_km      && <div><p className="text-xs text-gray-400">KM</p><p>{Number(budget.vehicle_km).toLocaleString("es-CL")}</p></div>}
            </div>
          </div>
        )}

        {/* Tabla ítems */}
        {items.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-2">Detalle de trabajos y repuestos</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Descripción</th>
                    {hasAnyPrice && <th className="px-2 py-2 text-right font-medium whitespace-nowrap text-blue-600">Orig.</th>}
                    {hasAlt      && <th className="px-2 py-2 text-right font-medium whitespace-nowrap text-amber-600">Alt.</th>}
                    {hasOtro     && <th className="px-2 py-2 text-right font-medium whitespace-nowrap text-green-700">Otro</th>}
                    <th className="px-2 py-2 text-right font-medium whitespace-nowrap">M. Obra</th>
                    {items.some((i: any) => i.dcto_pct > 0) && <th className="px-2 py-2 text-center font-medium">Dcto.</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-gray-800">
                        <p className="font-medium">{item.descripcion}</p>
                        {item.gestion && item.gestion !== "MECÁNICO" && (
                          <p className="text-xs text-gray-400">{item.gestion === "OTRO" ? item.gestion_custom : item.gestion}</p>
                        )}
                        {item.notas && <p className="text-xs text-gray-400 italic">{item.notas}</p>}
                      </td>
                      {hasAnyPrice && <td className="px-2 py-2.5 text-right text-blue-700 font-medium whitespace-nowrap">
                        {item.rep_genuino > 0 ? `$${fmt(item.rep_genuino)}` : "—"}
                      </td>}
                      {hasAlt  && <td className="px-2 py-2.5 text-right text-amber-600 font-medium whitespace-nowrap">
                        {item.rep_korea > 0 ? `$${fmt(item.rep_korea)}` : "—"}
                      </td>}
                      {hasOtro && <td className="px-2 py-2.5 text-right text-green-700 font-medium whitespace-nowrap">
                        {item.rep_multi > 0 ? `$${fmt(item.rep_multi)}` : "—"}
                      </td>}
                      <td className="px-2 py-2.5 text-right text-gray-600 whitespace-nowrap">
                        {item.val_mano_obra > 0 ? `$${fmt(item.val_mano_obra)}` : "—"}
                      </td>
                      {items.some((i: any) => i.dcto_pct > 0) && (
                        <td className="px-2 py-2.5 text-center text-orange-500">
                          {item.dcto_pct > 0 ? `${item.dcto_pct}%` : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Opciones de precio + aceptar */}
        <div className={`grid gap-3 ${visibleOpts.length === 3 ? "grid-cols-3" : visibleOpts.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {visibleOpts.map((o, idx) => {
            const t = totales[idx]
            const isSelected = accepted && opcionAceptada === o.key
            return (
              <div key={o.key} className={`rounded-xl border-2 ${o.color} p-3 sm:p-4 relative ${isSelected ? "ring-2 ring-green-400" : ""}`}>
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow">
                    <Check size={12} className="text-white" />
                  </div>
                )}
                <p className={`text-xs font-bold uppercase tracking-wide mb-1 px-2 py-0.5 rounded-full inline-block ${o.badge}`}>{o.label}</p>
                <p className="text-xl font-black text-gray-900 mt-1">${fmt(t.total)}</p>
                <p className="text-xs text-gray-500">IVA {iva}% incl.</p>
                <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                  {dto > 0 && <p>Dcto: -${fmt(dto)}</p>}
                  <p>Neto: ${fmt(t.sub)}</p>
                  <p>IVA: ${fmt(t.ivaM)}</p>
                </div>
                {!accepted && (
                  <button onClick={() => handleAccept(o.key)} disabled={!!accepting}
                    className={`mt-3 w-full py-2 text-white rounded-lg text-xs font-semibold transition ${o.btn} disabled:opacity-50`}>
                    {accepting === o.key ? "Aceptando..." : "Aceptar"}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Descripción */}
        {budget.descripcion_servicio && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Observaciones / Descripción del servicio</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{budget.descripcion_servicio}</p>
          </div>
        )}

        {/* Datos de pago */}
        {(settings.payment_bank || settings.payment_account_number) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Información de pago</p>
            {settings.payment_note && <p className="text-sm text-gray-700 mb-2">{settings.payment_note}</p>}
            <div className="text-sm text-gray-700 space-y-1">
              {settings.company_name          && <p><span className="font-medium">Razón social:</span> {settings.company_name}</p>}
              {settings.payment_rut           && <p><span className="font-medium">RUT:</span> {settings.payment_rut}</p>}
              {settings.payment_bank          && <p><span className="font-medium">Banco:</span> {settings.payment_bank}</p>}
              {settings.payment_account_type && settings.payment_account_number && (
                <p><span className="font-medium">{settings.payment_account_type}:</span> {settings.payment_account_number}</p>
              )}
              {settings.payment_email && <p><span className="font-medium">Email:</span> {settings.payment_email}</p>}
            </div>
          </div>
        )}

        {/* Inspector */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Inspector a cargo</p>
              <p className="font-semibold text-gray-800">{budget.profiles?.full_name ?? "—"}</p>
              {budget.profiles?.professional_title && <p className="text-xs text-gray-500">{budget.profiles.professional_title}</p>}
              {budget.profiles?.signature_url && (
                <img src={budget.profiles.signature_url} alt="Firma" className="mt-2 h-10 object-contain" />
              )}
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>{settings.company_name}</p>
              <p>{fmtDate(budget.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Compartir */}
        <ShareBudgetPanel
          budgetId={budget.id}
          budgetNumero={budget.numero}
          clienteNombre={clienteNombre}
          clienteEmail={clienteEmail}
          clienteTel={clienteTel}
          vigenciaDias={budget.vigencia_dias}
          formaPago={budget.forma_pago}
          companyName={settings.company_name ?? ""}
        />

        <p className="text-center text-xs text-gray-400 pb-4">VALOR TOTAL INCLUYE IVA · NO VÁLIDO COMO BOLETA/FACTURA</p>
      </div>
    </div>
  )
}
