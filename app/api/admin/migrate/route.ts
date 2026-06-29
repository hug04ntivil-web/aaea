import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Endpoint temporal para migraciones — eliminar después de usar
export async function POST() {
  const admin = createAdminClient()

  // Intentar insertar un registro de prueba con la nueva columna
  // Si la columna no existe, el select fallará y usaremos la alternativa
  const checks = await Promise.allSettled([
    admin.from("appointments").select("cliente_telefono").limit(0),
  ])

  const needsTelefono = checks[0].status === "rejected" ||
    (checks[0].status === "fulfilled" && (checks[0].value as any).error)

  if (!needsTelefono) {
    return NextResponse.json({ ok: true, message: "Columna ya existe" })
  }

  return NextResponse.json({
    ok: false,
    message: "Ejecuta este SQL en Supabase Dashboard > SQL Editor",
    sql: "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cliente_telefono text;",
  })
}
