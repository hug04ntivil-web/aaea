"use client"

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"

interface MonthlyData { mes: string; inspecciones: number; presupuestos: number }
interface StatusData  { name: string; value: number; color: string }
interface Props {
  monthly: MonthlyData[]
  statusData: StatusData[]
  ticketPromedio?: number
  tasaAceptacion?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-[var(--text-1)] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

const PLACEHOLDER_MONTHS = ["Ene","Feb","Mar","Abr","May","Jun"].map(mes => ({ mes, inspecciones: 0, presupuestos: 0 }))
const STATUS_DEFAULT = [
  { name: "Borrador",  value: 0, color: "#94a3b8" },
  { name: "Enviado",   value: 0, color: "#3b82f6" },
  { name: "Aprobado",  value: 0, color: "#22c55e" },
]

export default function DashboardCharts({ monthly, statusData, ticketPromedio, tasaAceptacion }: Props) {
  const chartData  = monthly.some(m => m.inspecciones > 0 || m.presupuestos > 0) ? monthly : PLACEHOLDER_MONTHS
  const pieData    = statusData.length > 0 ? statusData : STATUS_DEFAULT
  const noData     = !monthly.some(m => m.inspecciones > 0 || m.presupuestos > 0)
  const noPieData  = !statusData.some(s => s.value > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Actividad mensual */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Actividad últimos 6 meses</h3>
          {noData && <span className="text-xs text-[var(--text-3)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded-full">Sin actividad aún</span>}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barGap={4}>
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--text-2)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-2)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            {!noData && <Tooltip content={<CustomTooltip />} />}
            <Bar dataKey="inspecciones" name="Inspecciones" fill={noData ? "var(--border)" : "#3b82f6"} radius={[4,4,0,0]} maxBarSize={28} />
            <Bar dataKey="presupuestos" name="Presupuestos" fill={noData ? "var(--border)" : "#8b5cf6"} radius={[4,4,0,0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-2)]"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Inspecciones</span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-2)]"><span className="w-3 h-3 rounded-sm bg-violet-500 inline-block" />Presupuestos</span>
        </div>
      </div>

      {/* Estado de presupuestos (dona) */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Estado de presupuestos</h3>
          {noPieData && <span className="text-xs text-[var(--text-3)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded-full">Sin presupuestos aún</span>}
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
              dataKey="value" paddingAngle={noPieData ? 0 : 3}>
              {pieData.map((entry, i) => (
                <Cell key={i} fill={noPieData ? "var(--border)" : entry.color} />
              ))}
            </Pie>
            {!noPieData && (
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs shadow-lg">
                    <span style={{ color: payload[0].payload.color }} className="font-semibold">{payload[0].name}: {payload[0].value}</span>
                  </div>
                )
              }} />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 justify-center mt-1">
          {STATUS_DEFAULT.map((s, i) => (
            <span key={s.name} className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: s.color }} />
              {s.name}: <strong>{statusData[i]?.value ?? 0}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[var(--text-2)] mb-1">Ticket promedio (aceptados)</p>
          <p className="text-2xl font-bold text-[var(--text-1)]">
            {ticketPromedio ? `$${Math.round(ticketPromedio).toLocaleString("es-CL")}` : "$0"}
          </p>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[var(--text-2)] mb-1">Tasa de aceptación</p>
          <p className="text-2xl font-bold text-[var(--text-1)]">
            {tasaAceptacion ? `${tasaAceptacion.toFixed(0)}%` : "0%"}
          </p>
        </div>
      </div>
    </div>
  )
}
