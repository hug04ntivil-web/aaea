import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const keyInfo = { len: key.length, start: key.slice(0, 20), end: key.slice(-10), url }

  const admin = createAdminClient()

  const users = [
    { id: "a5f83e28-d91f-4d1e-a3bb-e1234e7a5246", password: "Aaea2025!" },
    { id: "cb8dfa4b-ee21-4b95-a670-bf4eb95b1957", password: "Inspector2025!" },
  ]

  const results = []
  for (const u of users) {
    const { data, error } = await admin.auth.admin.updateUserById(u.id, { password: u.password })
    results.push({ id: u.id, email: data?.user?.email, ok: !error, error: error?.message })
  }

  return NextResponse.json({ keyInfo, results })
}
