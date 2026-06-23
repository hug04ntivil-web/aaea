import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import AppShell from "@/components/layout/app-shell"
import NewInspectionForm from "@/components/inspection/new-inspection-form"

export default async function NewInspectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role")
    .eq("id", user!.id)
    .single()

  const { data: clients } = await admin
    .from("clients")
    .select("id, full_name, rut, email, phone")
    .order("full_name")

  return (
    <AppShell role={profile?.role as any} userName={profile?.full_name ?? ""} pageTitle="Nueva inspección">
      <NewInspectionForm
        inspectorId={user!.id}
        inspectorName={profile?.full_name ?? ""}
        clients={clients ?? []}
      />
    </AppShell>
  )
}
