import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaea.cl"

function buildHtml(resetLink: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Recuperación de contraseña — AAEA Inspecciones</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#1e4d1e;padding:28px;text-align:center;">
      <h1 style="color:white;font-size:20px;margin:0;font-weight:700;">AAEA Inspecciones</h1>
      <p style="color:#a3d9a3;font-size:13px;margin:6px 0 0;">Sistema de inspección vehicular</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#111827;font-size:18px;margin:0 0 12px;">Recuperación de contraseña</h2>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">Hola,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        Haz clic en el botón de abajo para elegir una nueva contraseña:
      </p>
      <a href="${resetLink}" style="display:block;background:#2d7a2d;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:24px;">
        Restablecer mi contraseña
      </a>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;padding-top:16px;border-top:1px solid #f0f0f0;">
        Este enlace expira en 24 horas. Si no solicitaste este cambio, puedes ignorar este correo —
        tu contraseña seguirá siendo la misma.
      </p>
    </div>
    <div style="background:#f4f7f4;padding:14px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">AAEA Inspecciones · Sistema de inspección vehicular · San Ramón, Santiago</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Intenta enviar con Resend (email en español, sin branding de Supabase)
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: email.trim(),
        options: { redirectTo: `${SITE_URL}/reset-password` },
      })

      if (!error && data?.properties?.action_link) {
        const resend = new Resend(process.env.RESEND_API_KEY?.replace(/﻿/g, "").trim())
        await resend.emails.send({
          from: `AAEA Inspecciones <${process.env.RESEND_FROM_EMAIL ?? "noreply@aaea.cl"}>`,
          to: email.trim(),
          subject: "Recuperación de contraseña — AAEA Inspecciones",
          html: buildHtml(data.properties.action_link),
        })
        return NextResponse.json({ ok: true })
      }
    } catch (resendErr: any) {
      console.warn("Resend no disponible, usando email de Supabase:", resendErr.message)
    }

    // Fallback: email de Supabase (funciona siempre)
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error: fallbackError } = await anonClient.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${SITE_URL}/reset-password`,
    })

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("Reset password error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
