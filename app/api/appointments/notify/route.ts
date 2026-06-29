import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(req: NextRequest) {
  const { cliente_nombre, cliente_email, titulo, fecha, hora, cliente_direccion, descripcion } = await req.json()

  if (!cliente_email || !titulo || !fecha) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY?.replace(/﻿/g, "").trim())

  const fechaFormateada = new Date(fecha + "T12:00:00").toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#f8fafc;padding:32px 16px">
      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
        <h2 style="color:#1e293b;margin:0 0 4px">Agendamiento confirmado</h2>
        <p style="color:#64748b;margin:0 0 24px;font-size:14px">AAEA Inspecciones — Aledalbertz AE Automotive</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#64748b;width:120px">Servicio</td><td style="padding:8px 0;font-weight:600;color:#1e293b">${titulo}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Fecha</td><td style="padding:8px 0;font-weight:600;color:#1e293b">${fechaFormateada}</td></tr>
          ${hora ? `<tr><td style="padding:8px 0;color:#64748b">Hora</td><td style="padding:8px 0;font-weight:600;color:#1e293b">${hora}</td></tr>` : ""}
          ${cliente_nombre ? `<tr><td style="padding:8px 0;color:#64748b">Cliente</td><td style="padding:8px 0;color:#1e293b">${cliente_nombre}</td></tr>` : ""}
          ${cliente_direccion ? `<tr><td style="padding:8px 0;color:#64748b">Dirección</td><td style="padding:8px 0;color:#1e293b">${cliente_direccion}</td></tr>` : ""}
          ${descripcion ? `<tr><td style="padding:8px 0;color:#64748b;vertical-align:top">Nota</td><td style="padding:8px 0;color:#1e293b">${descripcion}</td></tr>` : ""}
        </table>

        <div style="margin-top:24px;padding:14px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
          <p style="margin:0;font-size:13px;color:#166534">Su agendamiento ha sido registrado. Si necesita reagendar o cancelar, contáctenos directamente.</p>
        </div>

        <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center">AAEA Inspecciones · San Ramón, Santiago · aaea.cl</p>
      </div>
    </div>
  `

  const { error } = await resend.emails.send({
    from: `AAEA Inspecciones <${process.env.RESEND_FROM_EMAIL ?? "noreply@aaea.cl"}>`,
    to: cliente_email.trim(),
    subject: `Agendamiento confirmado — ${titulo}`,
    html,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
