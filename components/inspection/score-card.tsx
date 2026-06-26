"use client"

interface Props {
  visual: number
  carroceria: number
  mecanica: number
  final: number
  size?: "sm" | "lg"
}

function pct(nota: number) { return Math.round((nota / 7) * 100) }

export default function ScoreCard({ visual, carroceria, mecanica, final, size = "sm" }: Props) {
  const color = final >= 6.5 ? "from-green-500 to-emerald-600" : final >= 5 ? "from-yellow-500 to-amber-500" : "from-red-500 to-rose-600"
  const label = final >= 6.5 ? "Muy bueno" : final >= 5 ? "Regular" : "Con observaciones"
  const bigSize = size === "lg" ? "w-28 h-28" : "w-20 h-20"

  return (
    <div className={size === "lg" ? "flex items-start gap-5" : "bg-white rounded-xl border border-gray-100 shadow-sm p-5"}>
      <div className={`flex-shrink-0 ${bigSize} rounded-2xl bg-gradient-to-br ${color} flex flex-col items-center justify-center shadow-lg`}>
        <span className={`font-black text-white leading-none ${size === "lg" ? "text-4xl" : "text-3xl"}`}>{final?.toFixed(1)}</span>
        <span className="text-[11px] text-white/70 font-medium">{pct(final)}%</span>
      </div>
      <div className="flex-1">
        {size === "lg" && <p className="text-lg font-bold text-gray-800 mb-0.5">Nota final</p>}
        <p className={`text-sm font-medium mb-3 ${final >= 6.5 ? "text-green-600" : final >= 5 ? "text-yellow-600" : "text-red-600"}`}>
          {label}
        </p>
        <div className="flex gap-4">
          {[{ label: "Visual", nota: visual }, { label: "Carrocería", nota: carroceria }, { label: "Mecánica", nota: mecanica }].map(s => (
            <div key={s.label} className="text-center">
              <div className={`font-bold ${s.nota >= 6.5 ? "text-green-600" : s.nota >= 5 ? "text-yellow-600" : "text-red-600"} ${size === "lg" ? "text-lg" : "text-base"}`}>
                {s.nota?.toFixed(1)}
              </div>
              <div className="text-[10px] text-gray-400 font-medium">{pct(s.nota)}%</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 leading-snug">
          * La nota final se calcula en base a los ítems revisados y marcados durante la inspección. Los ítems marcados como <strong>N/A</strong> (No Aplica) quedan excluidos del cálculo.
        </p>
      </div>
    </div>
  )
}
