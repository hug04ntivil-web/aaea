import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function InspectionsList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const { data: inspections } = await admin
    .from("inspections")
    .select(`id, fecha_inspeccion, nota_final, status, vehicles(patente, marca, modelo, anio), clients(full_name)`)
    .eq("inspector_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle="Inspecciones">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{inspections?.length ?? 0} inspecciones</p>
          <Link href="/inspector/inspections/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
            <Plus size={15} /> Nueva
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {inspections && inspections.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {inspections.map((ins: any) => (
                <Link key={ins.id} href={`/inspector/inspections/${ins.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${ins.nota_final >= 6.5 ? "bg-green-50" : ins.nota_final >= 5 ? "bg-yellow-50" : "bg-red-50"}`}>
                    <span className={`text-lg font-black leading-none ${ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                      {ins.nota_final > 0 ? ins.nota_final : "--"}
                    </span>
                    <span className="text-xs text-gray-400">/7</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ins.vehicles?.patente} · {ins.vehicles?.marca} {ins.vehicles?.modelo} {ins.vehicles?.anio}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{ins.clients?.full_name} · {formatDate(ins.fecha_inspeccion)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${ins.status === "completed" ? "bg-green-100 text-green-700" : ins.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                    {ins.status === "draft" ? "Borrador" : ins.status === "completed" ? "Completa" : "Enviada"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm mb-3">No hay inspecciones aún</p>
              <Link href="/inspector/inspections/new" className="text-blue-600 text-sm hover:underline font-medium">Crear la primera →</Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
