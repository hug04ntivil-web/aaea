"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, CheckCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import ShareBudgetPanel from "./share-budget-panel"

interface Props {
  budget: any
  isPublic?: boolean
  settings?: Record<string, string>
}

function fmt(n: number | null | undefined) { return Math.round(n ?? 0).toLocaleString("es-CL") }

export default function BudgetDetail({ budget, isPublic = false, settings = {} }: Props) {
  const [accepting, setAccepting] = useState("")
  const [accepted, setAccepted] = useState(budget.status === "accepted")
  const [opcionAceptada, setOpcionAceptada] = useState<string>(budget.opcion_aceptada ?? "")

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

  const totalOrig = calcTotal("rep_genuino")
  const totalAlt  = calcTotal("rep_korea")
  const totalOtro = calcTotal("rep_multi")

  const hasAlt  = items.some((i: any) => (i.rep_korea  ?? 0) > 0)
  const hasOtro = items.some((i: any) => (i.rep_multi  ?? 0) > 0)

  const client = budget.clients ?? null
  const clienteNombre = client?.full_name ?? budget.cliente_nombre ?? "—"
  const clienteRut    = client?.rut       ?? budget.cliente_rut     ?? ""
  const clienteTel    = client?.phone     ?? budget.cliente_telefono ?? ""
  const clienteEmail  = client?.email     ?? budget.cliente_email    ?? ""

  const opciones = [
    { key: "original",    label: "Original",    t: totalOrig, color: "border-blue-300 bg-blue-50",   badge: "bg-blue-100 text-blue-700",   show: true },
    { key: "alternativo", label: "Alternativo", t: totalAlt,  color: "border-amber-300 bg-amber-50", badge: "bg-amber-100 text-amber-700", show: hasAlt },
    { key: "otro",        label: "Otro",        t: totalOtro, color: "border-green-300 bg-green-50", badge: "bg-green-100 text-green-700", show: hasOtro },
  ].filter(o => o.show)

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
        setOpcionAceptada(opcion)
        toast.success("¡Presupuesto aceptado!")
      } else toast.error("Error al aceptar el presupuesto")
    } catch { toast.error("Error de conexión") }
    finally { setAccepting("") }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{budget.numero}</h2>
            <p className="text-sm text-gray-500">{formatDate(budget.created_at)}</p>
          </div>
          {accepted ? (
            <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-full font-semibold">
              <CheckCircle size={13} /> Aceptado
            </span>
          ) : (
            <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
              {budget.status === "draft" ? "Borrador" : "Enviado"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Cliente</p><p className="font-medium">{clienteNombre}</p></div>
          {clienteRut    && <div><p className="text-xs text-gray-400">RUT</p><p className="font-medium">{clienteRut}</p></div>}
          {clienteTel    && <div><p className="text-xs text-gray-400">Teléfono</p><p className="font-medium">{clienteTel}</p></div>}
          {clienteEmail  && <div><p className="text-xs text-gray-400">Email</p><p className="font-medium">{clienteEmail}</p></div>}
          {budget.vehicle_patente && <div><p className="text-xs text-gray-400">Patente</p><p className="font-bold">{budget.vehicle_patente}</p></div>}
          {budget.vehicle_marca && (
            <div><p className="text-xs text-gray-400">Vehículo</p>
            <p className="font-medium">{budget.vehicle_marca} {budget.vehicle_modelo} {budget.vehicle_anio}</p></div>
          )}
        </div>
      </div>

      {/* Ítems */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Detalle de trabajos y repuestos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-2 py-2 text-right text-blue-600">Original</th>
                  {hasAlt  && <th className="px-2 py-2 text-right text-amber-600">Alternativo</th>}
                  {hasOtro && <th className="px-2 py-2 text-right text-green-700">Otro</th>}
                  <th className="px-2 py-2 text-right">M. Obra</th>
                  {items.some((i: any) => i.dcto_pct > 0) && <th className="px-2 py-2 text-center">Dcto.</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-gray-800">{item.descripcion}</p>
                      {item.gestion && item.gestion !== "MECÁNICO" && (
                        <p className="text-xs text-gray-400">{item.gestion === "OTRO" ? item.gestion_custom : item.gestion}</p>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right text-blue-700 font-medium whitespace-nowrap">
                      {(item.rep_genuino ?? 0) > 0 ? `$${fmt(item.rep_genuino)}` : "—"}
                    </td>
                    {hasAlt  && <td className="px-2 py-2.5 text-right text-amber-600 font-medium whitespace-nowrap">
                      {(item.rep_korea  ?? 0) > 0 ? `$${fmt(item.rep_korea)}` : "—"}
                    </td>}
                    {hasOtro && <td className="px-2 py-2.5 text-right text-green-700 font-medium whitespace-nowrap">
                      {(item.rep_multi  ?? 0) > 0 ? `$${fmt(item.rep_multi)}` : "—"}
                    </td>}
                    <td className="px-2 py-2.5 text-right text-gray-600 whitespace-nowrap">
                      {(item.val_mano_obra ?? 0) > 0 ? `$${fmt(item.val_mano_obra)}` : "—"}
                    </td>
                    {items.some((i: any) => i.dcto_pct > 0) && (
                      <td className="px-2 py-2.5 text-center text-orange-500">
                        {(item.dcto_pct ?? 0) > 0 ? `${item.dcto_pct}%` : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totales por opción */}
      <div className={`grid gap-3 ${opciones.length === 3 ? "grid-cols-3" : opciones.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {opciones.map(o => (
          <div key={o.key} className={`rounded-xl border-2 ${o.color} p-3 text-center relative`}>
            {accepted && opcionAceptada === o.key && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow">
                <Check size={12} className="text-white" />
              </div>
            )}
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${o.badge}`}>{o.label}</span>
            <p className="text-lg font-black text-gray-900 mt-1">${fmt(o.t.total)}</p>
            <p className="text-xs text-gray-400">IVA {iva}% incl.</p>
            {dto > 0 && <p className="text-xs text-orange-500">Dcto: -${fmt(dto)}</p>}
            {isPublic && !accepted && (
              <button onClick={() => handleAccept(o.key)} disabled={!!accepting}
                className="mt-2 w-full py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-medium transition disabled:opacity-50">
                {accepting === o.key ? "..." : "Aceptar"}
              </button>
            )}
          </div>
        ))}
      </div>

      {budget.descripcion_servicio && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
          <p className="text-xs font-medium text-yellow-700 mb-1">Descripción del servicio</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{budget.descripcion_servicio}</p>
        </div>
      )}

      {/* Compartir — usando panel reutilizable */}
      {!isPublic && (
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
      )}

      {/* Inspector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Inspector</p>
            <p className="font-semibold text-gray-800">{budget.profiles?.full_name ?? "—"}</p>
            {budget.profiles?.professional_title && (
              <p className="text-xs text-gray-500">{budget.profiles.professional_title}</p>
            )}
            {budget.profiles?.signature_url && (
              <img src={budget.profiles.signature_url} alt="Firma" className="mt-2 h-10 object-contain" />
            )}
          </div>
          <p className="text-xs text-gray-400 text-right">{formatDate(budget.created_at)}</p>
        </div>
      </div>
    </div>
  )
}
