"use client"

import { ArrowLeft, FileText } from "lucide-react"

function fmt(n: number | undefined | null) { return Math.round(n ?? 0).toLocaleString("es-CL") }

interface PreviewData {
  settings: Record<string, string>
  cliente: any
  vehiculo: any
  items: any[]
  ivaPct: number
  descuentoGlobal: number
  formaPago: string
  vigenciaDias: string | number
  descripcionServicio: string
  totals: { orig: number; alt: number; otro: number }
  subOrig: number; subAlt: number; subOtro: number
  ivaO: number; ivaA: number; ivaT: number
  totalOrig: number; totalAlt: number; totalOtro: number
}

interface Props {
  data: PreviewData
  onBack: () => void
  onFinalize: () => void
  saving: boolean
}

export default function BudgetPreview({ data, onBack, onFinalize, saving }: Props) {
  const {
    settings, cliente, vehiculo, items, ivaPct, descuentoGlobal, formaPago, vigenciaDias,
    descripcionServicio, totals, subOrig, subAlt, subOtro, ivaO, ivaA, ivaT,
    totalOrig, totalAlt, totalOtro,
  } = data

  const activeItems = items.filter(i => i.descripcion || i.rep_original > 0 || i.rep_alternativo > 0 || i.rep_otro > 0 || i.val_mano_obra > 0)
  const today = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })

  const hasAlt  = activeItems.some(i => (Number(i.rep_alternativo) || 0) > 0)
  const hasOtro = activeItems.some(i => (Number(i.rep_otro)        || 0) > 0)

  const boxes = [
    { label: "ORIGINAL",    sub: subOrig, iva: ivaO, total: totalOrig, color: "bg-blue-600",  bg: "bg-blue-50",  text: "text-blue-700",  show: true },
    { label: "ALTERNATIVO", sub: subAlt,  iva: ivaA, total: totalAlt,  color: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", show: hasAlt },
    { label: "OTRO",        sub: subOtro, iva: ivaT, total: totalOtro, color: "bg-green-600", bg: "bg-green-50", text: "text-green-700", show: hasOtro },
  ].filter(b => b.show)

  const hasPaymentInfo = settings.payment_bank || settings.payment_account_number

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-gray-100 shadow-sm p-3 sticky top-4 z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition">
          <ArrowLeft size={16} /> Volver a editar
        </button>
        <p className="text-xs text-gray-500 hidden sm:block">Vista previa — así se verá el PDF</p>
        <button onClick={onFinalize} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 shadow-sm">
          <FileText size={15} />
          {saving ? "Creando..." : "Finalizar y crear PDF"}
        </button>
      </div>

      {/* Documento */}
      <div className="bg-white shadow-lg border border-gray-200 rounded-xl overflow-hidden text-xs" style={{ fontFamily: "Arial, sans-serif" }}>

        {/* HEADER celeste */}
        <div style={{ background: "#0ea5e9", padding: "14px 20px" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {settings.company_logo_url ? (
                <img src={settings.company_logo_url} alt="Logo" className="h-14 w-auto object-contain bg-white rounded p-1" />
              ) : (
                <div className="h-14 w-14 bg-sky-700 rounded-lg flex items-center justify-center text-white font-black text-xl">AA</div>
              )}
              <div>
                <p className="font-bold text-lg text-white leading-tight">{settings.company_name || "AAEA Inspecciones"}</p>
                <p className="text-xs text-sky-100 mt-0.5">{settings.company_services || "INSPECCIÓN Y ASESORÍA AUTOMOTRIZ"}</p>
                {settings.company_address && <p className="text-xs text-sky-200 mt-0.5">{settings.company_address}{settings.company_address2 ? " // " + settings.company_address2 : ""}</p>}
                {settings.company_rut && <p className="text-xs text-sky-200">RUT: {settings.company_rut}</p>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="bg-sky-700 rounded px-3 py-1.5 text-center">
                <p className="text-[10px] text-sky-200">ORDEN DE TRABAJO</p>
                <p className="text-xs font-bold text-white mt-0.5">[Se asignará al guardar]</p>
              </div>
              <p className="text-[10px] text-sky-200 mt-1.5">Válido por: {vigenciaDias} días</p>
              <p className="text-[9px] text-sky-300 mt-0.5">NO VÁLIDO COMO BOLETA/FACTURA</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">

          {/* DATOS CLIENTE / VEHÍCULO */}
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                {[
                  { label: "PATENTE", value: vehiculo.patente },
                  { label: "CLIENTE", value: cliente?.full_name || cliente?.nombre || "—" },
                  { label: "TELÉFONO", value: cliente?.phone || cliente?.telefono || "—" },
                  { label: "FECHA", value: today },
                  { label: "FORMA PAGO", value: formaPago },
                ].map((col, i) => (
                  <td key={i} className="border border-gray-300 px-2 py-1.5">
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">{col.label}</p>
                    <p className="font-bold text-gray-800 mt-0.5">{col.value || "—"}</p>
                  </td>
                ))}
              </tr>
              <tr>
                {[
                  { label: "MARCA", value: vehiculo.marca },
                  { label: "MODELO", value: vehiculo.modelo },
                  { label: "AÑO", value: vehiculo.anio },
                  { label: "COLOR", value: vehiculo.color },
                  { label: "KM ACTUAL", value: vehiculo.km ? Number(vehiculo.km).toLocaleString("es-CL") : "" },
                ].map((col, i) => (
                  <td key={i} className="border border-gray-300 px-2 py-1.5">
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">{col.label}</p>
                    <p className="font-bold text-gray-800 mt-0.5">{col.value || "—"}</p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 px-2 py-1.5">
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">VIN / CHASIS</p>
                  <p className="font-bold text-gray-800 mt-0.5">{vehiculo.vin || "—"}</p>
                </td>
                <td className="border border-gray-300 px-2 py-1.5">
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">N° MOTOR</p>
                  <p className="font-bold text-gray-800 mt-0.5">{vehiculo.num_motor || "—"}</p>
                </td>
                <td className="border border-gray-300 px-2 py-1.5" colSpan={3}>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase">VERSIÓN</p>
                  <p className="font-bold text-gray-800 mt-0.5">{vehiculo.version || "—"}</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABLA ÍTEMS */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[600px]">
              <thead>
                <tr style={{ background: "#0284c7", color: "white" }}>
                  <th className="px-2 py-1.5 text-center w-6">#</th>
                  <th className="px-2 py-1.5 text-left">TRABAJO / DESCRIPCIÓN</th>
                  <th className="px-2 py-1.5 text-center w-16">GESTIÓN</th>
                  <th className="px-2 py-1.5 text-right w-20 text-blue-100">$ ORIGINAL</th>
                  {hasAlt  && <th className="px-2 py-1.5 text-right w-20 text-amber-200">$ ALT.</th>}
                  {hasOtro && <th className="px-2 py-1.5 text-right w-20 text-green-200">$ OTRO</th>}
                  <th className="px-2 py-1.5 text-right w-20">$ M. OBRA</th>
                  <th className="px-2 py-1.5 text-center w-14">DCTO.</th>
                  <th className="px-2 py-1.5 text-right w-20">TOTAL ÍTEM</th>
                </tr>
              </thead>
              <tbody>
                {activeItems.map((item, i) => {
                  const orig = Number(item.rep_original)    || 0
                  const alt  = Number(item.rep_alternativo) || 0
                  const otro = Number(item.rep_otro)        || 0
                  const mo   = Number(item.val_mano_obra)   || 0
                  const dcto = Number(item.dcto_pct)        || 0
                  const f    = 1 - dcto / 100
                  const totalItem = Math.round((orig + mo) * f)
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f0f9ff" }}>
                      <td className="px-2 py-1.5 text-center text-gray-400 border-b border-gray-100">{item.orden}</td>
                      <td className="px-2 py-1.5 text-gray-800 border-b border-gray-100 font-medium">{item.descripcion}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500 border-b border-gray-100">
                        {item.gestion === "OTRO" ? (item.gestion_custom || "OTRO") : item.gestion}
                      </td>
                      <td className="px-2 py-1.5 text-right text-blue-700 border-b border-gray-100 font-medium">
                        {orig > 0 ? `$${fmt(orig)}` : "—"}
                      </td>
                      {hasAlt  && <td className="px-2 py-1.5 text-right text-amber-600 border-b border-gray-100 font-medium">{alt  > 0 ? `$${fmt(alt)}`  : "—"}</td>}
                      {hasOtro && <td className="px-2 py-1.5 text-right text-green-700 border-b border-gray-100 font-medium">{otro > 0 ? `$${fmt(otro)}` : "—"}</td>}
                      <td className="px-2 py-1.5 text-right text-gray-700 border-b border-gray-100">{mo > 0 ? `$${fmt(mo)}` : "—"}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500 border-b border-gray-100">{dcto > 0 ? `${dcto}%` : "—"}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-gray-800 border-b border-gray-100">{totalItem > 0 ? `$${fmt(totalItem)}` : "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* CUADROS DE TOTALES */}
          <div className={`grid gap-3 ${boxes.length === 3 ? "grid-cols-3" : boxes.length === 2 ? "grid-cols-2" : "grid-cols-1 max-w-xs ml-auto"}`}>
            {boxes.map(b => (
              <div key={b.label} className={`rounded-lg border overflow-hidden ${b.bg}`}>
                <div className={`${b.color} text-white text-center py-1.5 text-xs font-bold`}>{b.label}</div>
                <div className="p-3 space-y-1 text-xs">
                  {descuentoGlobal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dcto. global:</span>
                      <span className="text-red-600 font-medium">-${fmt(descuentoGlobal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal neto:</span>
                    <span className="font-semibold text-gray-800">${fmt(b.sub)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">IVA ({ivaPct}%):</span>
                    <span className="text-gray-700">${fmt(b.iva)}</span>
                  </div>
                  <div className={`flex justify-between pt-1 border-t font-black text-sm ${b.text}`}>
                    <span>TOTAL:</span>
                    <span>${fmt(b.total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESCRIPCIÓN SERVICIO */}
          {descripcionServicio && (
            <div className="border border-amber-200 rounded p-3 bg-amber-50">
              <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Observaciones / Descripción del servicio</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{descripcionServicio}</p>
            </div>
          )}

          {/* DATOS DE PAGO */}
          {hasPaymentInfo && (
            <div className="border border-blue-200 rounded p-3 bg-blue-50 text-xs text-gray-700">
              <p className="font-bold text-blue-800 mb-1 text-[11px]">INFORMACIÓN DE PAGO</p>
              {settings.payment_note && <p className="mb-1 text-gray-600">{settings.payment_note}</p>}
              <p>
                <strong>TRANSFERIR A:</strong> {settings.company_name}
                {settings.payment_rut && <> // RUT: {settings.payment_rut}</>}
                {settings.payment_account_type && <> // {settings.payment_account_type}:</>}
                {settings.payment_account_number && <> {settings.payment_account_number}</>}
                {settings.payment_bank && <> // {settings.payment_bank}</>}
                {settings.payment_email && <> // {settings.payment_email}</>}
              </p>
            </div>
          )}

          {/* PIE */}
          <div className="flex justify-between items-end pt-2 border-t border-gray-200">
            <p className="text-[10px] text-gray-400 italic">VALOR TOTAL CON IVA INCLUIDO · NO VÁLIDO COMO BOLETA/FACTURA</p>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-700">{settings.company_name}</p>
              {settings.company_rut && <p className="text-[10px] text-gray-400">RUT: {settings.company_rut}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
