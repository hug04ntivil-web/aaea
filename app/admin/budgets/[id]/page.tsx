import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import BudgetDetail from "@/components/budget/budget-detail"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function AdminBudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()

  const { data: budget } = await supabase
    .from("budgets")
    .select(`*, clients(full_name, rut, phone, email), profiles(full_name, signature_url), budget_items(*)`)
    .eq("id", id)
    .single()

  if (!budget) notFound()

  return (
    <AppShell role="admin" userName={profile?.full_name ?? "Admin"} pageTitle="Presupuesto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/admin/budgets" className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <h2 className="text-lg font-bold text-gray-800">{budget.numero}</h2>
        </div>
        <BudgetDetail budget={budget} isPublic={false} />
      </div>
    </AppShell>
  )
}
