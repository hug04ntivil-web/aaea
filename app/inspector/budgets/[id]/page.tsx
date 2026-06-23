import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import BudgetDetail from "@/components/budget/budget-detail"

export default async function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const { data: budget } = await supabase
    .from("budgets")
    .select(`*, clients(full_name, email, phone, rut), profiles(full_name, signature_url), budget_items(*)`)
    .eq("id", id)
    .single()

  if (!budget) notFound()

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle={`Presupuesto ${budget.numero}`}>
      <BudgetDetail budget={budget} isPublic={false} />
    </AppShell>
  )
}
