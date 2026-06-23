import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import EditUserForm from "./edit-user-form"

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase.from("profiles").select("id, full_name, email, phone, role").eq("id", id).single()
  if (!profile) notFound()

  const { data: me } = await supabase.from("profiles").select("full_name").eq("id", (await supabase.auth.getUser()).data.user!.id).single()

  return <EditUserForm profile={profile} adminName={me?.full_name ?? ""} />
}
