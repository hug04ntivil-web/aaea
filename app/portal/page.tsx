import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role
  if (role === "admin")     redirect("/admin/dashboard")
  if (role === "inspector") redirect("/inspector/dashboard")
  if (role === "client")    redirect("/client/dashboard")

  redirect("/inspector/dashboard")
}
