import { NextRequest, NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/public"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaea.cl"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { opcion } = await request.json()

  if (!["original", "alternativo", "otro"].includes(opcion)) {
    return NextResponse.json({ error: "Opción inválida" }, { status: 400 })
  }

  // Verificar que el presupuesto existe y está disponible (cliente público / RLS)
  const publicClient = createPublicClient()
  const { data: budget, error: fetchErr } = await publicClient
    .from("budgets")
    .select("id, status, numero, inspector_id, clients(full_name)")
    .eq("id", id)
    .single()

  if (fetchErr || !budget) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 })
  if (budget.status === "accepted") return NextResponse.json({ error: "Ya fue aceptado" }, { status: 400 })

  // Usar admin client para el update — evita limitaciones de RLS en seen_by_inspector
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("budgets")
    .update({ status: "accepted", opcion_aceptada: opcion, seen_by_inspector: false })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Enviar correo al inspector
  try {
    const { data: inspectorProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", budget.inspector_id)
      .single()

    const { data: inspectorAuth } = await adminClient.auth.admin.getUserById(budget.inspector_id)
    const inspectorEmail = inspectorAuth?.user?.email

    if (inspectorEmail) {
      const clientName = (budget.clients as any)?.full_name ?? "—"
      const opcionLabel = opcion === "original" ? "Original" : opcion === "alternativo" ? "Alternativo" : "Otro"
      const inspectorName = inspectorProfile?.full_name ?? "Inspector"

      const resend = new Resend(process.env.RESEND_API_KEY?.replace(/﻿/g, "").trim())
      await resend.emails.send({
        from: `AAEA Inspecciones <${process.env.RESEND_FROM_EMAIL ?? "noreply@aaea.cl"}>`,
        to: inspectorEmail,
        subject: `✅ Presupuesto #${budget.numero} aceptado por ${clientName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#f8fafc;padding:32px 16px">
            <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
              <div style="background:#16a34a;color:#fff;border-radius:8px;padding:12px 16px;margin-bottom:20px">
                <h2 style="margin:0;font-size:16px">✅ Presupuesto aceptado</h2>
              </div>
              <p style="color:#374151;font-size:15px">Hola <strong>${inspectorName}</strong>,</p>
              <p style="color:#374151;font-size:14px">El cliente ha aceptado el presupuesto:</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
                <tr><td style="padding:8px 0;color:#6b7280;width:130px">Presupuesto</td><td style="padding:8px 0;font-weight:600;color:#111827">#${budget.numero}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280">Cliente</td><td style="padding:8px 0;font-weight:600;color:#111827">${clientName}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280">Opción elegida</td><td style="padding:8px 0;font-weight:600;color:#16a34a">${opcionLabel}</td></tr>
              </table>
              <a href="${SITE_URL}/inspector/budgets" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Ver presupuesto →</a>
              <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center">AAEA Inspecciones · aaea.cl</p>
            </div>
          </div>
        `,
      })
    }
  } catch (emailErr) {
    console.warn("Email al inspector falló:", emailErr)
  }

  return NextResponse.json({ success: true })
}
