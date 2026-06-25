import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

// Vercel Cron — se ejecuta cada noche a las 9am Chile (UTC-3 → 12:00 UTC)
// Agrega en vercel.json: { "crons": [{ "path": "/api/cron/budget-reminders", "schedule": "0 12 * * *" }] }

export async function GET(req: NextRequest) {
  // Si CRON_SECRET está configurado, validar; si no, solo acepta llamadas de Vercel Cron
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  const supabase = await createClient()
  const resend = new Resend((process.env.RESEND_API_KEY ?? "").replace(/﻿/g, "").trim())

  // Presupuestos enviados hace 3+ días sin respuesta
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const { data: pending } = await supabase
    .from("budgets")
    .select(`
      id, numero, total, public_token, updated_at,
      cliente_nombre, cliente_email,
      clients(full_name, email),
      profiles(full_name, email)
    `)
    .eq("status", "sent")
    .lt("updated_at", threeDaysAgo.toISOString())

  if (!pending?.length) return NextResponse.json({ sent: 0 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aaea.cl"
  let sent = 0

  for (const budget of pending) {
    const clientEmail = (budget as any).clients?.email ?? budget.cliente_email
    const clientName  = (budget as any).clients?.full_name ?? budget.cliente_nombre
    const inspName    = (budget as any).profiles?.full_name ?? "El equipo"

    if (!clientEmail || !budget.public_token) continue

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@aaea.cl",
        to: clientEmail,
        subject: `Recordatorio: Tu cotización ${budget.numero} está pendiente de respuesta`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#1e293b">Hola${clientName ? `, ${clientName}` : ""}</h2>
            <p>Te recordamos que tienes una cotización pendiente de revisión.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;color:#64748b">Número:</td><td style="padding:8px;font-weight:bold">${budget.numero}</td></tr>
              ${budget.total ? `<tr><td style="padding:8px;color:#64748b">Total:</td><td style="padding:8px;font-weight:bold">$${Number(budget.total).toLocaleString("es-CL")}</td></tr>` : ""}
            </table>
            <a href="${appUrl}/q/${budget.public_token}"
               style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
              Ver cotización →
            </a>
            <p style="margin-top:24px;color:#94a3b8;font-size:12px">
              ${inspName} · AAEA Inspecciones
            </p>
          </div>
        `,
      })
      sent++
    } catch { /* continuar con el siguiente */ }
  }

  return NextResponse.json({ sent, total: pending.length })
}
