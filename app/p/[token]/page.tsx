import { createPublicClient } from "@/lib/supabase/public"
import { notFound } from "next/navigation"
import PublicInspectionView from "@/components/inspection/public-view"

export default async function PublicInspectionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createPublicClient()

  const { data: inspection } = await supabase
    .from("inspections")
    .select(`*, vehicles(*), clients(full_name), profiles(full_name, signature_url)`)
    .eq("public_token", token)
    .single()

  if (!inspection) notFound()

  const { data: items } = await supabase
    .from("inspection_items")
    .select("*")
    .eq("inspection_id", inspection.id)
    .order("section")
    .order("sort_order")

  return <PublicInspectionView inspection={inspection} items={items ?? []} />
}
