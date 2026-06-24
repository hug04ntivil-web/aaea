import { createPublicClient } from "@/lib/supabase/public"
import { notFound } from "next/navigation"
import PublicBudgetView from "@/components/budget/public-budget-view"

export default async function PublicBudgetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createPublicClient()

  const [{ data: budget }, { data: settingsRows }] = await Promise.all([
    supabase.from("budgets").select(`
      *, profiles(full_name, professional_title, signature_url),
      clients(full_name, rut, phone, email, address, city),
      budget_items(*)
    `).eq("public_token", token).single(),
    supabase.from("settings").select("key, value"),
  ])

  if (!budget) notFound()

  const settings: Record<string, string> = {}
  settingsRows?.forEach((r: any) => { settings[r.key] = r.value ?? "" })

  return <PublicBudgetView budget={budget} settings={settings} />
}
