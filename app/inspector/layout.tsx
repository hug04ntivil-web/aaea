import { createClient } from "@/lib/supabase/server"
import BudgetAcceptedNotifier from "@/components/realtime/budget-accepted-notifier"

export default async function InspectorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      {user && <BudgetAcceptedNotifier inspectorId={user.id} />}
      {children}
    </>
  )
}
