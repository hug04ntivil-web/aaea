import { NextResponse } from "next/server"
import { createClient as createAnonClient } from "@supabase/supabase-js"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const anon = createAnonClient(url, anonKey)

  // Test login with current password
  const loginTest = await anon.auth.signInWithPassword({
    email: "hugo0.4ntivil@gmail.com",
    password: "Aaea2025!",
  })

  return NextResponse.json({
    loginTest: {
      ok: !loginTest.error,
      error: loginTest.error?.message ?? null,
      code: loginTest.error?.status ?? null,
      userId: loginTest.data?.user?.id ?? null,
      emailConfirmed: loginTest.data?.user?.email_confirmed_at ?? null,
    },
    sqlToRun: `
-- Ejecuta esto en el SQL Editor de Supabase:
UPDATE auth.users
SET
  encrypted_password = crypt('Aaea2025!', gen_salt('bf', 10)),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'hugo0.4ntivil@gmail.com';

UPDATE auth.users
SET
  encrypted_password = crypt('Inspector2025!', gen_salt('bf', 10)),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'inspector@aaea.cl';

-- Agregar política RLS para que usuarios lean su propio perfil:
CREATE POLICY IF NOT EXISTS "usuarios leen su perfil" ON public.profiles
FOR SELECT USING (auth.uid() = id);
    `.trim(),
  })
}
