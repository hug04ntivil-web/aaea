import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import ScoreCard from "@/components/inspection/score-card"
import Link from "next/link"
import { ChevronLeft, Download } from "lucide-react"
import { formatDate } from "@/lib/utils"
export default async function ClientInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
  const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user.id).single()
  if (!client) notFound()

  const { data: ins } = await supabase
    .from("inspections")
    .select(`*, vehicles(*), clients(full_name, rut), profiles(full_name)`)
    .eq("id", id)
    .eq("client_id", client.id)
    .single()

  if (!ins) notFound()

  const { data: items } = await supabase
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
    <AppShell role="client" userName={profile?.full_name ?? ""} pageTitle="Detalle de inspección">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/client/dashboard" className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo}
            </h2>
            <p className="text-xs text-gray-500">{formatDate(ins.fecha_inspeccion)} · Inspector: {ins.profiles?.full_name}</p>
          </div>
        </div>

        {/* Notas */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Resultado</p>
          <ScoreCard
            final={ins.nota_final}
            visual={ins.nota_visual}
            carroceria={ins.nota_carroceria}
            mecanica={ins.nota_mecanica}
            size="lg"
          />
        </div>

        {/* Vehículo */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Vehículo</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              ["Patente", ins.vehicles?.patente], ["Año", ins.vehicles?.anio],
              ["Color", ins.vehicles?.color], ["Km", ins.kilometraje ? `${ins.kilometraje.toLocaleString("es-CL")} km` : "—"],
              ["Combustible", ins.vehicles?.combustible], ["Transmisión", ins.vehicles?.transmision],
            ].map(([label, val]) => (
              <div key={label as string}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-700">{val ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ítems */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Detalle de la inspección</h3>
          </div>
          <div>
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
        </div>

        {ins.comentarios && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">Comentarios del inspector</p>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{ins.comentarios}</p>
          </div>
        )}

        <a
          href={`/api/pdf/inspection/${ins.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition"
        >
          <Download size={15} /> Descargar PDF
        </a>
      </div>
    </AppShell>
  )
}
