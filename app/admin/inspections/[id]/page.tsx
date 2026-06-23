import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import ScoreCard from "@/components/inspection/score-card"
import Link from "next/link"
import { ChevronLeft, Download } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function AdminInspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user!.id).single()

  const { data: ins } = await admin
    .from("inspections")
    .select(`*, vehicles(*), clients(full_name, rut, phone, email), profiles(full_name)`)
    .eq("id", id)
    .single()

  if (!ins) notFound()

  const { data: items } = await admin
    .from("inspection_items")
    .select("*")
    .eq("inspection_id", id)
    .order("section")
    .order("sort_order")

  const secciones: Record<number, string> = { 1: "Inspección Visual", 2: "Carrocería", 3: "Mecánica" }
  const grouped: Record<string, typeof items> = {}
  items?.forEach(item => {
    const key = `${item.section}|${item.subsection}`
    if (!grouped[key]) grouped[key] = []
    grouped[key]!.push(item)
  })

  function estadoColor(estado: string) {
    if (estado === "N/A") return "text-gray-400"
    if (["Bueno", "Sin Daño", "Normal", "Funciona", "A nivel", "No Presenta"].includes(estado)) return "text-green-600"
    if (["Malo", "Con Daño", "Anormal", "Bajo nivel", "Presenta"].includes(estado)) return "text-red-600"
    return "text-gray-700"
  }

  let lastSection = -1

  return (
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Detalle inspección">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/admin/inspections" className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo}
            </h2>
            <p className="text-xs text-gray-500">
              {formatDate(ins.fecha_inspeccion)} · Cliente: {ins.clients?.full_name} · Inspector: {ins.profiles?.full_name}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <ScoreCard
            final={ins.nota_final}
            visual={ins.nota_visual}
            carroceria={ins.nota_carroceria}
            mecanica={ins.nota_mecanica}
            size="lg"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          {[
            ["Patente", ins.vehicles?.patente], ["Año", ins.vehicles?.anio],
            ["Color", ins.vehicles?.color], ["Km", ins.kilometraje ? `${ins.kilometraje.toLocaleString("es-CL")} km` : "—"],
            ["Combustible", ins.vehicles?.combustible], ["Transmisión", ins.vehicles?.transmision],
            ["Cliente", ins.clients?.full_name], ["Teléfono", ins.clients?.phone],
          ].map(([label, val]) => (
            <div key={label as string}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-medium text-gray-700">{val ?? "—"}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Detalle de la inspección</h3>
          </div>
          {Object.entries(grouped).map(([key, groupItems]) => {
            const [sectionNum, subsection] = key.split("|")
            const section = parseInt(sectionNum)
            const showSectionHeader = section !== lastSection
            if (showSectionHeader) lastSection = section

            return (
              <div key={key}>
                {showSectionHeader && (
                  <div className="px-4 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-wide">
                    {secciones[section]}
                  </div>
                )}
                <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500">{subsection}</div>
                {groupItems?.map(item => (
                  <div key={item.id} className="flex items-start justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{item.item_label}</p>
                      {item.observaciones && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">{item.observaciones}</p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold ml-3 shrink-0 ${estadoColor(item.estado)}`}>
                      {item.estado}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {ins.comentarios && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">Comentarios del inspector</p>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{ins.comentarios}</p>
          </div>
        )}

        <div className="flex gap-3">
          <a href={`/api/pdf/inspection/${ins.id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition">
            <Download size={14} /> Descargar PDF
          </a>
        </div>
      </div>
    </AppShell>
  )
}
