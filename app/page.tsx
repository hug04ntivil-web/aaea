import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: role } = await supabase.rpc("get_my_role")

  if (role === "admin") redirect("/admin/dashboard")
  if (role === "inspector") redirect("/inspector/dashboard")
  redirect("/client/dashboard")
}
