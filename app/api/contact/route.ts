import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

function cleanKey(k: string | undefined) {
  return k?.replace(/﻿/g, "").trim() ?? ""
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, telefono, email, vehiculo, mensaje } = body

    if (!nombre?.trim() || !email?.trim() || !mensaje?.trim()) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const resend = new Resend(cleanKey(process.env.RESEND_API_KEY))

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Nueva consulta — Aledalbertz</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f7f4;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#1e4d1e;padding:24px;text-align:center;">
      <h1 style="color:white;font-size:20px;margin:0;font-weight:700;">Aledalbertz AE Automotive</h1>
      <p style="color:#a3d9a3;font-size:13px;margin:6px 0 0;">Nueva consulta desde el sitio web</p>
    </div>
    <div style="padding:28px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;width:110px;vertical-align:top;">Nombre</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111827;">${nombre}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;vertical-align:top;">Email</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111827;">${email}</td>
        </tr>
        ${telefono ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;vertical-align:top;">Teléfono</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111827;">${telefono}</td></tr>` : ""}
        ${vehiculo ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;vertical-align:top;">Vehículo</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111827;">${vehiculo}</td></tr>` : ""}
      </table>
      <div style="margin-top:20px;background:#f4f7f4;border-radius:10px;padding:16px;border-left:4px solid #2d7a2d;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Mensaje</p>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">${mensaje.replace(/\n/g, "<br>")}</p>
      </div>
      ${email ? `<a href="mailto:${email}?subject=Re: Consulta Aledalbertz AE Automotive" style="display:block;margin-top:20px;background:#2d7a2d;color:white;text-decoration:none;text-align:center;padding:13px;border-radius:8px;font-weight:600;font-size:14px;">Responder a ${nombre}</a>` : ""}
    </div>
    <div style="background:#f4f7f4;padding:14px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">Aledalbertz AE Automotive · Sargento Candelaria 1451, San Ramón, Santiago</p>
    </div>
  </div>
</body>
</html>`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@aaea.cl",
      to: "aledalbert@gmail.com",
      subject: `Nueva consulta de ${nombre} — Aledalbertz AE Automotive`,
      html,
      replyTo: email,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("Contact email error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
