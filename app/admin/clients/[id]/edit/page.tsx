import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import EditClientForm from "./edit-client-form"

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from("clients").select("id, full_name, rut, email, phone, city, notes").eq("id", id).single()
  if (!client) notFound()

  const { data: me } = await supabase.from("profiles").select("full_name").eq("id", (await supabase.auth.getUser()).data.user!.id).single()

  return <EditClientForm client={client} adminName={me?.full_name ?? ""} />
}
