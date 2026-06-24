"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Copy, Check, Mail, MessageCircle, CheckCircle, Download, QrCode, X } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Props {
  budget: any
  isPublic?: boolean
}

function fmt(n: number | null) { return (n ?? 0).toLocaleString("es-CL") }

export default function BudgetDetail({ budget, isPublic = false }: Props) {
  const [copied, setCopied] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(budget.status === "accepted")
  const [opcionAceptada, setOpcionAceptada] = useState(budget.opcion_aceptada ?? "")
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState("")

  useEffect(() => {
    if (showQr && !qrDataUrl) {
      import("qrcode").then(QR =>
        QR.toDataURL(publicUrl, { width: 280, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      ).then(setQrDataUrl)
    }
  }, [showQr, publicUrl, qrDataUrl])

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/q/${budget.public_token}` : `/q/${budget.public_token}`

  const opciones = [
    { key: "genuino", label: "Genuino", total: budget.total_genuino, color: "border-blue-300 bg-blue-50", badge: "bg-blue-100 text-blue-700" },
    { key: "korea", label: "Korea", total: budget.total_korea, color: "border-yellow-300 bg-yellow-50", badge: "bg-yellow-100 text-yellow-700" },
    { key: "multi", label: "Multi origen", total: budget.total_multi, color: "border-green-300 bg-green-50", badge: "bg-green-100 text-green-700" },
  ]

  async function handleAccept(opcion: string) {
    if (accepted) return
    setAccepting(true)
    try {
      const res = await fetch(`/api/budgets/${budget.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opcion }),
      })
      if (res.ok) {
        setAccepted(true)
        setOpcionAceptada(opcion)
        toast.success("¡Presupuesto aceptado! El inspector será notificado.")
      } else toast.error("Error al aceptar el presupuesto")
    } catch { toast.error("Error de conexión") }
    finally { setAccepting(false) }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Link copiado")
  }

  function sendWhatsApp() {
    const phone = budget.clients?.phone?.replace(/[^0-9]/g, "") ?? ""
    const msg = encodeURIComponent(`Hola ${budget.clients?.full_name}, te comparto el presupuesto ${budget.numero}:\n${publicUrl}`)
    const wa = phone ? `https://wa.me/${phone.startsWith("56") ? phone : "56" + phone}?text=${msg}` : `https://wa.me/?text=${msg}`
    window.open(wa, "_blank")
  }

  async function sendEmail() {
    if (!budget.clients?.email) { toast.error("El cliente no tiene email"); return }
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "budget", id: budget.id, email: budget.clients.email, publicUrl }),
    })
    toast[res.ok ? "success" : "error"](res.ok ? "Email enviado" : "Error al enviar")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{budget.numero}</h2>
            <p className="text-sm text-gray-500">{formatDate(budget.created_at)}</p>
          </div>
          {accepted ? (
            <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-full font-semibold">
              <CheckCircle size={13} /> Aceptado
            </span>
          ) : (
            <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
              {budget.status === "draft" ? "Borrador" : "Enviado"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Cliente</p><p className="font-medium">{budget.clients?.full_name}</p></div>
          {budget.clients?.rut && <div><p className="text-xs text-gray-400">RUT</p><p className="font-medium">{budget.clients.rut}</p></div>}
          {budget.clients?.phone && <div><p className="text-xs text-gray-400">Teléfono</p><p className="font-medium">{budget.clients.phone}</p></div>}
          {budget.clients?.email && <div><p className="text-xs text-gray-400">Email</p><p className="font-medium">{budget.clients.email}</p></div>}
        </div>
      </div>

      {/* Ítems */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Detalle de repuestos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-center">Cant.</th>
                <th className="px-3 py-2 text-right">Genuino</th>
                <th className="px-3 py-2 text-right">Korea</th>
                <th className="px-3 py-2 text-right">Multi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {budget.budget_items?.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{item.descripcion}</td>
                  <td className="px-3 py-3 text-center text-gray-600">{item.cantidad}</td>
                  <td className="px-3 py-3 text-right text-gray-700">${fmt(item.precio_genuino * item.cantidad)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">${fmt(item.precio_korea * item.cantidad)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">${fmt(item.precio_multi * item.cantidad)}</td>
                </tr>
              ))}
              {budget.mano_de_obra > 0 && (
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-3 text-gray-700">Mano de obra / Instalación</td>
                  <td className="px-3 py-3 text-center text-gray-500">—</td>
                  <td className="px-3 py-3 text-right text-gray-700">${fmt(budget.mano_de_obra)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">${fmt(budget.mano_de_obra)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">${fmt(budget.mano_de_obra)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opciones de precio */}
      <div className="grid grid-cols-3 gap-3">
        {opciones.map(o => (
          <div key={o.key} className={`rounded-xl border-2 ${o.color} p-4 text-center relative`}>
            {accepted && opcionAceptada === o.key && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">{o.label}</p>
            <p className="text-lg font-black text-gray-800">${fmt(o.total)}</p>
            <p className="text-xs text-gray-400">IVA {budget.iva_pct}% incl.</p>
            {isPublic && !accepted && (
              <button onClick={() => handleAccept(o.key)} disabled={accepting}
                className="mt-3 w-full py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-medium transition disabled:opacity-50">
                {accepting ? "..." : "Aceptar esta opción"}
              </button>
            )}
          </div>
        ))}
      </div>

      {budget.notes && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">Notas</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{budget.notes}</p>
        </div>
      )}

      {/* Compartir — solo para inspector */}
      {!isPublic && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Compartir presupuesto</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition">
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiado" : "Copiar link"}
            </button>
            <button onClick={sendEmail}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition">
              <Mail size={13} /> Email
            </button>
            <button onClick={sendWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition">
              <MessageCircle size={13} /> WhatsApp
            </button>
            <button onClick={() => window.open(`/api/pdf/budget/${budget.id}`, "_blank")}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition">
              <Download size={13} /> PDF
            </button>
            <button onClick={() => setShowQr(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${showQr ? "bg-indigo-600 text-white" : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"}`}>
              <QrCode size={13} /> QR
            </button>
          </div>

          {showQr && (
            <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between w-full">
                <p className="text-xs font-medium text-gray-600">Escanea para ver el presupuesto</p>
                <button onClick={() => setShowQr(false)} className="text-gray-400 hover:text-gray-600 transition">
                  <X size={14} />
                </button>
              </div>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Presupuesto" className="w-52 h-52 rounded-lg shadow-sm" />
              ) : (
                <div className="w-52 h-52 bg-gray-200 rounded-lg animate-pulse" />
              )}
              <p className="text-[10px] text-gray-400 text-center max-w-[200px] break-all">{publicUrl}</p>
              {qrDataUrl && (
                <a href={qrDataUrl} download={`qr-presupuesto-${budget.numero}.png`}
                  className="text-xs text-indigo-600 hover:text-indigo-800 transition font-medium">
                  Descargar imagen QR
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Firma inspector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Inspector</p>
            <p className="font-semibold text-gray-800">{budget.profiles?.full_name}</p>
            {budget.profiles?.signature_url && (
              <img src={budget.profiles.signature_url} alt="Firma" className="mt-2 h-12 object-contain" />
            )}
          </div>
          <p className="text-xs text-gray-400 text-right">AAEA Inspecciones</p>
        </div>
      </div>
    </div>
  )
}
