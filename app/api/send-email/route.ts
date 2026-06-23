import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { type, id, email, publicUrl } = await req.json()
    const supabase = await createClient()

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
      <div style="display: inline-flex; width: 48px; height: 48px; background: #2563eb; border-radius: 12px; align-items: center; justify-content: center; margin-bottom: 12px;">
        <span style="color: white; font-weight: 900; font-size: 14px;">AA</span>
      </div>
      <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">AAEA Inspecciones</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">Informe de inspección vehicular</p>
    </div>
    <div style="padding: 28px;">
      <p style="color: #374151; font-size: 15px;">Hola <strong>${ins.clients?.full_name ?? "Cliente"}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Tu informe de inspección vehicular está listo. Aquí el resumen:</p>

      <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Vehículo</p>
        <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 700;">${ins.vehicles?.patente} — ${ins.vehicles?.marca} ${ins.vehicles?.modelo} ${ins.vehicles?.anio ?? ""}</p>
      </div>

      <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Nota final</p>
        <p style="margin: 0; color: ${notaColor}; font-size: 40px; font-weight: 900; line-height: 1;">${ins.nota_final?.toFixed(1)}<span style="font-size: 18px; color: #9ca3af;"> /7.0</span></p>
      </div>

      <a href="${publicUrl}" style="display: block; background: #2563eb; color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        Ver informe completo
      </a>

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
        Inspector: ${ins.profiles?.full_name} · ${new Date(ins.fecha_inspeccion).toLocaleDateString("es-CL")}
      </p>
    </div>
    <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">AAEA Inspecciones · Todos los derechos reservados</p>
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
        .select(`*, clients(*), profiles(full_name), inspections(vehicles(*))`)
        .eq("id", id)
        .single()

      if (!budget) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

      const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Presupuesto ${budget.numero}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">AAEA Inspecciones</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">Presupuesto de mantención y reparación</p>
    </div>
    <div style="padding: 28px;">
      <p style="color: #374151; font-size: 15px;">Hola <strong>${budget.clients?.full_name ?? "Cliente"}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px;">Te enviamos el presupuesto <strong>${budget.numero}</strong>:</p>

      <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Total con IVA</p>
        <p style="margin: 0; color: #111827; font-size: 36px; font-weight: 900;">$${budget.total?.toLocaleString("es-CL")}</p>
      </div>

      <a href="${publicUrl}" style="display: block; background: #7c3aed; color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        Ver y aceptar presupuesto
      </a>
    </div>
  </div>
</body>
</html>`

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@aaea.cl",
        to: email,
        subject: `Presupuesto ${budget.numero} — AAEA Inspecciones`,
        html,
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 })
  } catch (err: any) {
    console.error("Email error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
