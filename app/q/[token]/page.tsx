import { createPublicClient } from "@/lib/supabase/public"
import { notFound } from "next/navigation"
import BudgetDetail from "@/components/budget/budget-detail"

export default async function PublicBudgetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createPublicClient()

  const { data: budget } = await supabase
    .from("budgets")
    .select(`*, clients(full_name, email, phone, rut), profiles(full_name, signature_url), budget_items(*)`)
    .eq("public_token", token)
    .single()

  if (!budget) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-slate-900 text-white py-5 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-xs font-black">AA</span>
          </div>
          <div>
            <p className="font-bold text-sm">AAEA Inspecciones</p>
            <p className="text-xs text-slate-400">Presupuesto de reparación — {budget.numero}</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-600 mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          Revisa las opciones de presupuesto y acepta la que mejor se adapte a tus necesidades.
          Una vez aceptada, el inspector será notificado.
        </p>
        <BudgetDetail budget={budget} isPublic={true} />
      </div>
    </div>
  )
}
