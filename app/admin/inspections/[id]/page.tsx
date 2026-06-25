import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import ScoreCard from "@/components/inspection/score-card"
import ShareButtons from "@/components/inspection/share-buttons"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function AdminInspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()

  const { data: ins } = await supabase
    .from("inspections")
    .select(`*, vehicles(*), clients(full_name, rut, phone, email), profiles(full_name)`)
    .eq("id", id)
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
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Detalle inspección">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/admin/inspections" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition">
            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-1)]">
              {ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo}
            </h2>
            <p className="text-xs text-[var(--text-2)]">
              {formatDate(ins.fecha_inspeccion)} · Cliente: {ins.clients?.full_name} · Inspector: {ins.profiles?.full_name}
            </p>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm p-5">
          <ScoreCard
            final={ins.nota_final}
            visual={ins.nota_visual}
            carroceria={ins.nota_carroceria}
            mecanica={ins.nota_mecanica}
            size="lg"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm p-5">
          {[
            ["Patente", ins.vehicles?.patente], ["Año", ins.vehicles?.anio],
            ["Color", ins.vehicles?.color], ["Km", ins.kilometraje ? `${ins.kilometraje.toLocaleString("es-CL")} km` : "—"],
            ["Combustible", ins.vehicles?.combustible], ["Transmisión", ins.vehicles?.transmision],
            ["Cliente", ins.clients?.full_name], ["Teléfono", ins.clients?.phone],
          ].map(([label, val]) => (
            <div key={label as string}>
              <p className="text-xs text-[var(--text-3)]">{label}</p>
              <p className="text-sm font-medium text-[var(--text-1)]">{val ?? "—"}</p>
            </div>
          ))}
        </div>

        {/* Share / envío al cliente */}
        {ins.public_token && (
          <ShareButtons
            inspectionId={ins.id}
            publicToken={ins.public_token}
            clientEmail={ins.clients?.email}
            clientPhone={ins.clients?.phone}
          />
        )}

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-1)]">Detalle de la inspección</h3>
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
                <div className="px-4 py-1.5 bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-2)]">{subsection}</div>
                {groupItems?.map(item => (
                  <div key={item.id} className="flex items-start justify-between px-4 py-2.5 border-b border-[var(--border)] last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-1)]">{item.item_label}</p>
                      {item.observaciones && (
                        <p className="text-xs text-[var(--text-3)] mt-0.5 italic">{item.observaciones}</p>
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
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Comentarios del inspector</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap">{ins.comentarios}</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
