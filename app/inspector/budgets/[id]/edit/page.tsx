import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import BudgetForm from "@/components/budget/budget-form"

export const dynamic = "force-dynamic"

export default async function EditBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: budget }, { data: clients }, { data: inspections }, { data: settingsRows }, { data: profile }] = await Promise.all([
    supabase.from("budgets")
      .select(`*, clients(full_name, email, phone, rut), profiles(full_name, signature_url), budget_items(*)`)
      .eq("id", id).single(),
    supabase.from("clients").select("id, full_name, rut, phone, email, address, city").order("full_name"),
    supabase.from("inspections")
      .select("id, vehicles(patente, marca, modelo, anio, version, vin, num_motor, color), clients(full_name, phone, email, rut), kilometraje")
      .order("created_at", { ascending: false }),
    supabase.from("settings").select("key, value"),
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
  ])

  if (!budget) notFound()
  if (budget.status === "accepted") redirect(`/inspector/budgets/${id}`)

  const settings: Record<string, string> = {}
  settingsRows?.forEach(r => { settings[r.key] = r.value ?? "" })

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle={`Editar ${budget.numero}`}>
      <BudgetForm
        inspectorId={user.id}
        clients={clients ?? []}
        inspections={(inspections ?? []) as any}
        settings={settings}
        initialBudget={budget}
        mode="edit"
      />
    </AppShell>
  )
}
