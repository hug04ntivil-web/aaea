import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import BudgetForm from "@/components/budget/budget-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function NewBudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const [{ data: clients }, { data: inspections }, { data: settingsRows }] = await Promise.all([
    supabase.from("clients").select("id, full_name, rut, phone, email, address, city").order("full_name"),
    supabase.from("inspections")
      .select("id, kilometraje, vehicles(patente, marca, modelo, anio, version, vin, num_motor, color), clients(full_name, phone, email, rut)")
      .eq("inspector_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("settings").select("key, value"),
  ])

  const settings: Record<string, string> = {}
  settingsRows?.forEach((r: any) => { settings[r.key] = r.value ?? "" })

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle="Nuevo presupuesto">
      <div className="space-y-4">
        <Link href="/inspector/budgets" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft size={15} /> Volver a presupuestos
        </Link>
        <BudgetForm
          inspectorId={user!.id}
          clients={clients ?? []}
          inspections={(inspections ?? []).map((i: any) => ({
            id: i.id,
            kilometraje: i.kilometraje,
            vehicles: Array.isArray(i.vehicles) ? i.vehicles[0] : i.vehicles,
            clients: Array.isArray(i.clients) ? i.clients[0] : i.clients,
          }))}
          settings={settings}
        />
      </div>
    </AppShell>
  )
}
