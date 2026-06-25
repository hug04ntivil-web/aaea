import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { Plus } from "lucide-react"
import InspectorInspectionsList from "@/components/inspector/inspector-inspections-list"

export default async function InspectionsList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const { data: inspections } = await supabase
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
        <InspectorInspectionsList inspections={(inspections ?? []) as any} />
      </div>
    </AppShell>
  )
}
