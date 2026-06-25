import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import InspectionsFilterTable from "@/components/admin/inspections-filter-table"

export const dynamic = "force-dynamic"

export default async function AdminInspectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()

  const [{ data: inspections }, { data: inspectors }] = await Promise.all([
    supabase
      .from("inspections")
      .select(`id, fecha_inspeccion, nota_final, status, vehicles(patente, marca, modelo, anio), clients(full_name), profiles(full_name)`)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "inspector")
      .order("full_name"),
  ])

  return (
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Todas las inspecciones">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)]">Inspecciones</h2>
          <p className="text-sm text-[var(--text-2)]">{inspections?.length ?? 0} en total</p>
        </div>
        <InspectionsFilterTable
          inspections={inspections ?? []}
          inspectors={inspectors ?? []}
        />
      </div>
    </AppShell>
  )
}
