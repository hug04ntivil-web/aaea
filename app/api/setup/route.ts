import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
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

  return NextResponse.json({ results })
}
