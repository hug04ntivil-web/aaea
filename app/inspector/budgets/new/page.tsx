import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import AppShell from "@/components/layout/app-shell"
import BudgetForm from "@/components/budget/budget-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function NewBudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const [{ data: clients }, { data: inspections }] = await Promise.all([
    admin.from("clients").select("id, full_name, phone").order("full_name"),
    admin.from("inspections")
      .select("id, vehicles(patente, marca, modelo)")
      .eq("inspector_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle="Nuevo presupuesto">
      <div className="space-y-4">
        <Link href="/inspector/budgets" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft size={15} /> Volver a presupuestos
        </Link>
        <BudgetForm
          inspectorId={user!.id}
          clients={clients ?? []}
          inspections={inspections ?? []}
        />
      </div>
    </AppShell>
  )
}
