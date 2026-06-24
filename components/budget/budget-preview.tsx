"use client"

import { ArrowLeft, FileText } from "lucide-react"

function fmt(n: number) { return Math.round(n).toLocaleString("es-CL") }

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
  totalRepuestos: number
  totalMO: number
  granTotal: number
  subtotalNeto: number
  ivaMonto: number
  total: number
}

interface Props {
  data: PreviewData
  onBack: () => void
  onFinalize: () => void
  saving: boolean
}

export default function BudgetPreview({ data, onBack, onFinalize, saving }: Props) {
  const { settings, cliente, vehiculo, items, ivaPct, descuentoGlobal, formaPago, vigenciaDias, descripcionServicio, totalRepuestos, totalMO, granTotal, subtotalNeto, ivaMonto, total } = data
  const activeItems = items.filter(i => i.descripcion || i.valor_item > 0)
  const today = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })

  const hasPaymentInfo = settings.payment_bank || settings.payment_account_number

  return (
    <div className="max-w-4xl mx-auto pb-10">
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
      <div className="bg-white shadow-lg border border-gray-200 rounded-xl overflow-hidden" style={{ fontFamily: "Arial, sans-serif" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{ background: "#1e293b", color: "white", padding: "14px 20px" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {settings.company_logo_url ? (
                <img src={settings.company_logo_url} alt="Logo" className="h-14 w-auto object-contain bg-white rounded p-1" />
              ) : (
                <div className="h-14 w-14 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl">AA</div>
              )}
              <div>
                <p className="font-bold text-lg leading-tight">{settings.company_name || "AAEA Inspecciones"}</p>
                <p className="text-xs text-slate-300 mt-0.5">{settings.company_services || "INSPECCIÓN Y ASESORÍA AUTOMOTRIZ"}</p>
                {settings.company_address && <p className="text-xs text-slate-400 mt-0.5">{settings.company_address}{settings.company_address2 ? " // " + settings.company_address2 : ""}</p>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-slate-400 mb-1">
                <span>R.U.T.: </span><span className="text-white font-semibold">{settings.company_rut || "—"}</span>
              </div>
              <div className="bg-slate-700 rounded px-3 py-1.5 text-center">
                <p className="text-[10px] text-slate-400">ORDEN DE TRABAJO</p>
                <p className="text-xs font-bold text-white mt-0.5">{"[Se asignará al guardar]"}</p>
              </div>
              <div className="mt-1.5 text-right">
                <p className="text-[10px] text-slate-400">Presupuesto válido por: <span className="text-slate-300">{vigenciaDias} días</span></p>
                <p className="text-[9px] text-slate-500 mt-0.5">NO VÁLIDO COMO BOLETA/FACTURA</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* ── DATOS CLIENTE / VEHÍCULO ──────────────────────────────────── */}
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                {[
                  { label: "PATENTE", value: vehiculo.patente },
                  { label: "CLIENTE", value: cliente?.full_name || cliente?.nombre || "—" },
                  { label: "TELÉFONO", value: cliente?.phone || cliente?.telefono || "—" },
                  { label: "FECHA", value: today },
                  { label: "CIUDAD", value: cliente?.city || cliente?.ciudad || "—" },
                ].map((col, i) => (
                  <td key={i} className="border border-gray-300 px-2 py-1.5" style={{ width: i === 1 ? "25%" : "auto" }}>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">{col.label}</p>
                    <p className="font-bold text-gray-800 mt-0.5">{col.value || "—"}</p>
                  </td>
                ))}
              </tr>
              <tr>
                {[
                  { label: "MARCA", value: vehiculo.marca },
                  { label: "DIRECCIÓN", value: cliente?.address || cliente?.direccion || "" },
                  { label: "EMAIL", value: cliente?.email || "" },
                  { label: "FORMA PAGO", value: formaPago, span: 2 },
                ].map((col, i) => (
                  <td key={i} className="border border-gray-300 px-2 py-1.5" colSpan={(col as any).span}>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">{col.label}</p>
                    <p className="font-bold text-gray-800 mt-0.5">{col.value || "—"}</p>
                  </td>
                ))}
              </tr>
              <tr>
                {[
                  { label: "MODELO", value: vehiculo.modelo },
                  { label: "VIN / CHASIS", value: vehiculo.vin },
                  { label: "N° MOTOR", value: vehiculo.num_motor },
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
                {[
                  { label: "AÑO", value: vehiculo.anio },
                  { label: "VERSIÓN", value: vehiculo.version },
                ].map((col, i) => (
                  <td key={i} className="border border-gray-300 px-2 py-1.5" colSpan={i === 1 ? 4 : 1}>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">{col.label}</p>
                    <p className="font-bold text-gray-800 mt-0.5">{col.value || "—"}</p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* ── TABLA DE ÍTEMS ────────────────────────────────────────────── */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ background: "#1e293b", color: "white" }}>
                <th className="px-2 py-2 text-center font-bold w-8">#</th>
                <th className="px-2 py-2 text-left font-bold">TRABAJO A REALIZAR / TIPO DE TRABAJO</th>
                <th className="px-2 py-2 text-center font-bold w-20">GESTIÓN</th>
                <th className="px-2 py-2 text-right font-bold w-20">$ REPUESTO</th>
                <th className="px-2 py-2 text-right font-bold w-20">$ MANO OBRA</th>
                <th className="px-2 py-2 text-center font-bold w-14">DCTOS</th>
                <th className="px-2 py-2 text-right font-bold w-22">VALOR TOTAL ÍTEM</th>
                <th className="px-2 py-2 text-left font-bold">DESCRIPCIÓN TRABAJO</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td className="px-2 py-1.5 text-center text-gray-500 border-b border-gray-100">{item.orden}</td>
                  <td className="px-2 py-1.5 text-gray-800 border-b border-gray-100 font-medium">{item.descripcion}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600 border-b border-gray-100">
                    {item.gestion === "OTRO" ? (item.gestion_custom || "OTRO") : item.gestion}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700 border-b border-gray-100">
                    {Number(item.val_repuesto) > 0 ? `$${fmt(Number(item.val_repuesto))}` : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700 border-b border-gray-100">
                    {Number(item.val_mano_obra) > 0 ? `$${fmt(Number(item.val_mano_obra))}` : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-center text-gray-600 border-b border-gray-100">
                    {Number(item.dcto_pct) > 0 ? `${item.dcto_pct}%` : "0%"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-gray-800 border-b border-gray-100">
                    {item.valor_item > 0 ? `$${fmt(item.valor_item)}` : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-gray-500 text-[10px] border-b border-gray-100">{item.notas || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── TOTALES ───────────────────────────────────────────────────── */}
          <div className="flex justify-between items-end gap-4">
            {/* Fila de subtotales */}
            <table className="text-xs border-collapse" style={{ minWidth: "300px" }}>
              <tbody>
                <tr style={{ background: "#f1f5f9" }}>
                  <td className="px-3 py-1 font-bold text-gray-700 border border-gray-300">TOTALES</td>
                  <td className="px-3 py-1 text-right font-bold text-gray-700 border border-gray-300">${fmt(totalRepuestos)}</td>
                  <td className="px-3 py-1 text-right font-bold text-gray-700 border border-gray-300">${fmt(totalMO)}</td>
                  <td className="px-3 py-1 text-right font-bold text-gray-700 border border-gray-300">${fmt(granTotal)}</td>
                </tr>
              </tbody>
            </table>

            {/* Cuadro de totales */}
            <div className="text-right space-y-1 min-w-[180px]">
              <div className="flex justify-between gap-6 text-xs text-gray-600">
                <span>Gran Total:</span><span className="font-semibold">${fmt(granTotal)}</span>
              </div>
              {descuentoGlobal > 0 && (
                <div className="flex justify-between gap-6 text-xs text-red-600">
                  <span>Descuento:</span><span className="font-semibold">-${fmt(descuentoGlobal)}</span>
                </div>
              )}
              <div className="flex justify-between gap-6 text-xs text-gray-700 border-t pt-1">
                <span>Subtotal:</span><span className="font-semibold">${fmt(subtotalNeto)}</span>
              </div>
              <div className="flex justify-between gap-6 text-xs text-gray-600">
                <span>IVA ({ivaPct}%):</span><span>${fmt(ivaMonto)}</span>
              </div>
              <div className="flex justify-between gap-6 text-base font-black text-gray-900 border-t-2 pt-1">
                <span>Gran Total:</span><span className="text-blue-700">${fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* ── DESCRIPCIÓN SERVICIO ─────────────────────────────────────── */}
          {descripcionServicio && (
            <div className="border border-gray-200 rounded p-3 bg-amber-50">
              <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">Observaciones / Descripción del servicio</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{descripcionServicio}</p>
            </div>
          )}

          {/* ── DATOS DE PAGO ─────────────────────────────────────────────── */}
          {hasPaymentInfo && (
            <div className="border border-gray-200 rounded p-3 bg-blue-50 text-xs text-gray-700">
              <p className="font-bold text-gray-800 mb-1">INFORMACIÓN DE PAGO</p>
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

          {/* ── PIE DE PÁGINA ────────────────────────────────────────────── */}
          <div className="flex justify-between items-end pt-2 border-t border-gray-200">
            <p className="text-[10px] text-gray-400 italic">VALOR TOTAL PRESUPUESTO ES CON IVA INCLUIDO</p>
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
