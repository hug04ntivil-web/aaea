import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"

function cleanKey(k: string | undefined) {
  return k?.replace(/﻿/g, "").trim() ?? ""
}

export async function POST(req: NextRequest) {
  const resend = new Resend(cleanKey(process.env.RESEND_API_KEY))
  try {
    const body = await req.json()
    const { type, id, email, publicUrl, customSubject, customBody, attachPdf } = body
    const supabase = await createClient()

    // Nombre de empresa desde settings (con fallback)
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["company_name", "company_logo_url"])
    const settingsMap: Record<string, string> = {}
    settingsRows?.forEach(r => { settingsMap[r.key] = r.value ?? "" })
    const companyName = settingsMap["company_name"] || "AAEA Inspecciones"

    if (type === "inspection") {
      const { data: ins } = await supabase
        .from("inspections")
        .select(`*, vehicles(*), clients(*), profiles(full_name)`)
        .eq("id", id)
        .single()

      if (!ins) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

      const notaColor = ins.nota_final >= 6.5 ? "#16a34a" : ins.nota_final >= 5 ? "#ca8a04" : "#dc2626"

      const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Informe de Inspección</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">${companyName}</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">Informe de inspección vehicular</p>
    </div>
    <div style="padding: 28px;">
      <p style="color: #374151; font-size: 15px;">Hola <strong>${ins.clients?.full_name ?? "Cliente"}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Tu informe de inspección vehicular está listo.</p>
      <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Vehículo</p>
        <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 700;">${ins.vehicles?.patente} — ${ins.vehicles?.marca} ${ins.vehicles?.modelo} ${ins.vehicles?.anio ?? ""}</p>
      </div>
      <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Nota final</p>
        <p style="margin: 0; color: ${notaColor}; font-size: 40px; font-weight: 900; line-height: 1;">${ins.nota_final?.toFixed(1)}<span style="font-size: 18px; color: #9ca3af;"> /7.0</span></p>
      </div>
      <a href="${publicUrl}" style="display: block; background: #2563eb; color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 20px 0;">Ver informe completo</a>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">Inspector: ${ins.profiles?.full_name} · ${new Date(ins.fecha_inspeccion).toLocaleDateString("es-CL")}</p>
    </div>
    <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">${companyName} · Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>`

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@aaea.cl",
        to: email,
        subject: `Informe de inspección — ${ins.vehicles?.patente} ${ins.vehicles?.marca} ${ins.vehicles?.modelo}`,
        html,
      })
      return NextResponse.json({ ok: true })
    }

    if (type === "budget") {
      const { data: budget } = await supabase
        .from("budgets")
        .select(`*, clients(full_name, rut, email), profiles(full_name)`)
        .eq("id", id)
        .single()

      if (!budget) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

      const pdfUrl = `${req.nextUrl.origin}/api/pdf/budget/${id}`
      const clienteNombre = budget.clients?.full_name ?? budget.cliente_nombre ?? "Cliente"

      // Construir HTML del email
      const bodyHtml = customBody
        ? customBody.replace(/\n/g, "<br>")
        : `
          <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p>Adjunto encontrará el presupuesto <strong>${budget.numero}</strong> de servicios automotrices solicitado.</p>
          <p>También puede ver y aceptar el presupuesto en línea:</p>
          <a href="${pdfUrl}" style="display:inline-block;background:#0284c7;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin:12px 0;">
            Ver presupuesto PDF
          </a>
          <p style="color:#6b7280;font-size:13px;">Vigencia: ${budget.vigencia_dias ?? 30} días · Forma de pago: ${budget.forma_pago ?? "—"}</p>
        `

      const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Presupuesto ${budget.numero}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: #0ea5e9; padding: 24px; text-align: center;">
      <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">${companyName}</h1>
      <p style="color: #e0f2fe; font-size: 13px; margin: 4px 0 0;">Presupuesto ${budget.numero}</p>
    </div>
    <div style="padding: 28px;">${bodyHtml}</div>
    <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">${companyName} · NO VÁLIDO COMO BOLETA/FACTURA</p>
    </div>
  </div>
</body>
</html>`

      // Adjuntar PDF si se solicita
      const attachments: { filename: string; content: string }[] = []
      if (attachPdf) {
        try {
          const pdfRes = await fetch(pdfUrl, {
            headers: { cookie: req.headers.get("cookie") ?? "" },
          })
          if (pdfRes.ok) {
            const buf = Buffer.from(await pdfRes.arrayBuffer())
            attachments.push({
              filename: `presupuesto-${budget.numero}.pdf`,
              content: buf.toString("base64"),
            })
          }
        } catch { /* sin adjunto */ }
      }

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@aaea.cl",
        to: email,
        subject: customSubject || `Presupuesto ${budget.numero} — AAEA Inspecciones`,
        html,
        attachments: attachments.length ? attachments : undefined,
      } as any)

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 })
  } catch (err: any) {
    console.error("Email error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
