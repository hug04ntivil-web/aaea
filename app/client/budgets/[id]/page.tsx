import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import BudgetDetail from "@/components/budget/budget-detail"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function ClientBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
  const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user.id).single()
  if (!client) notFound()

  const { data: budget } = await supabase
    .from("budgets")
    .select(`*, clients(full_name, rut, phone, email), profiles(full_name, signature_url), budget_items(*)`)
    .eq("id", id)
    .eq("client_id", client.id)
    .single()

  if (!budget) notFound()

  return (
    <AppShell role="client" userName={profile?.full_name ?? ""} pageTitle="Presupuesto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/client/dashboard" className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <h2 className="text-lg font-bold text-gray-800">{budget.numero}</h2>
        </div>
        <p className="text-sm text-gray-600 mb-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
          Revisa las opciones de presupuesto y acepta la que mejor se adapte a tus necesidades.
          Una vez aceptada, el inspector será notificado.
        </p>
        <BudgetDetail budget={budget} isPublic={true} />
      </div>
    </AppShell>
  )
}
