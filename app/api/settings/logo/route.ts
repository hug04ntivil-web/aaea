import { NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/public"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from("settings")
    .select("company_logo_url, company_name")
    .limit(1)
    .single()

  return NextResponse.json({
    logoUrl: data?.company_logo_url ?? null,
    companyName: data?.company_name ?? "AAEA Inspecciones",
  })
}
