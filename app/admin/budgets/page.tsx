import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import BudgetsFilterTable from "@/components/admin/budgets-filter-table"

export const dynamic = "force-dynamic"

export default async function AdminBudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()

  const [{ data: budgets }, { data: inspectors }] = await Promise.all([
    supabase
      .from("budgets")
      .select(`id, numero, total, status, created_at, vehicle_patente, cliente_nombre, clients(full_name), profiles(full_name)`)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "inspector")
      .order("full_name"),
  ])

  return (
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Presupuestos">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)]">Presupuestos</h2>
          <p className="text-sm text-[var(--text-2)]">{budgets?.length ?? 0} en total</p>
        </div>
        <BudgetsFilterTable
          budgets={budgets ?? []}
          inspectors={inspectors ?? []}
        />
      </div>
    </AppShell>
  )
}
