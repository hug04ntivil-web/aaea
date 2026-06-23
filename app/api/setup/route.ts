import { NextResponse } from "next/server"
import { createClient as createAnonClient } from "@supabase/supabase-js"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const anon = createAnonClient(url, anonKey)

  const { error } = await anon.auth.resetPasswordForEmail(
    "hugo0.4ntivil@gmail.com",
    { redirectTo: "https://aaea-pdtb.vercel.app/reset-password" }
  )

  return NextResponse.json({
    sent: !error,
    error: error?.message ?? null,
    note: "Revisa tu Gmail: hugo0.4ntivil@gmail.com",
  })
}
