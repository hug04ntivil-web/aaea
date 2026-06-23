import { createClient } from "@supabase/supabase-js"

// Cliente sin sesión para páginas públicas (portal cliente)
// Usa el rol 'anon' de Supabase con las políticas de acceso público
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
