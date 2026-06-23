"use client"

import { formatDate } from "@/lib/utils"
import ScoreCard from "./score-card"
import ItemsView from "./items-view"
import { Download } from "lucide-react"

interface Props {
  inspection: any
  items: any[]
}

export default function PublicInspectionView({ inspection, items }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-slate-900 text-white py-5 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xs font-black">AA</span>
            </div>
            <div>
              <p className="font-bold text-sm">AAEA Inspecciones</p>
              <p className="text-xs text-slate-400">Informe de inspección vehicular</p>
            </div>
          </div>
          <button
            onClick={() => window.open(`/api/pdf/inspection/${inspection.id}`, "_blank")}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-medium transition"
          >
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Vehículo */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{inspection.vehicles?.patente}</h1>
              <p className="text-base text-gray-600 mt-0.5">
                {inspection.vehicles?.marca} {inspection.vehicles?.modelo} {inspection.vehicles?.anio}
              </p>
              <p className="text-sm text-gray-500 mt-1">{inspection.vehicles?.color} · {inspection.vehicles?.combustible}</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              {formatDate(inspection.fecha_inspeccion)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
            {[
              { label: "VIN", value: inspection.vehicles?.vin },
              { label: "Kilometraje", value: inspection.kilometraje ? `${inspection.kilometraje.toLocaleString("es-CL")} km` : null },
              { label: "SOAP", value: inspection.vehicles?.soap_estado },
              { label: "Rev. Técnica", value: inspection.vehicles?.rev_tecnica_estado },
              { label: "Multas", value: inspection.vehicles?.multas },
              { label: "Permiso Circ.", value: inspection.vehicles?.permiso_circulacion },
            ].filter(d => d.value).map(d => (
              <div key={d.label}>
                <p className="text-xs text-gray-400">{d.label}</p>
                <p className="font-medium text-gray-700">{d.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nota */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Resultado de la inspección</h3>
          <ScoreCard
            visual={inspection.nota_visual}
            carroceria={inspection.nota_carroceria}
            mecanica={inspection.nota_mecanica}
            final={inspection.nota_final}
            size="lg"
          />
        </div>

        {/* Ítems */}
        <ItemsView items={items} />

        {inspection.comentarios && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-2">Comentarios del inspector</h3>
            <p className="text-sm text-gray-600">{inspection.comentarios}</p>
          </div>
        )}

        {/* Firma */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Inspector</p>
              <p className="font-semibold text-gray-800">{inspection.profiles?.full_name}</p>
              {inspection.profiles?.signature_url && (
                <img src={inspection.profiles.signature_url} alt="Firma" className="mt-2 h-12 object-contain" />
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Fecha</p>
              <p className="text-sm font-medium text-gray-700">{formatDate(inspection.fecha_inspeccion)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 border-t pt-3">
            Este informe representa las conclusiones del inspector al momento de la revisión.
          </p>
        </div>
      </div>
    </div>
  )
}
