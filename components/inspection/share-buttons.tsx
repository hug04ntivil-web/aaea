"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Mail, MessageCircle, Download, Copy, Check } from "lucide-react"

interface Props {
  inspectionId: string
  publicToken: string
  clientEmail?: string
  clientPhone?: string
}

export default function ShareButtons({ inspectionId, publicToken, clientEmail, clientPhone }: Props) {
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${publicToken}` : `/p/${publicToken}`

  async function handleCopyLink() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast.success("Link copiado al portapapeles")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSendEmail() {
    if (!clientEmail) { toast.error("El cliente no tiene email registrado"); return }
    setSending(true)
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "inspection", id: inspectionId, email: clientEmail, publicUrl }),
      })
      toast[res.ok ? "success" : "error"](res.ok ? "Email enviado al cliente" : "Error al enviar el email")
    } catch { toast.error("Error de conexión") }
    finally { setSending(false) }
  }

  function handleWhatsApp() {
    const phone = clientPhone?.replace(/[^0-9]/g, "") ?? ""
    const msg = encodeURIComponent(`Hola, te comparto el informe de inspección de tu vehículo:\n${publicUrl}`)
    const wa = phone
      ? `https://wa.me/${phone.startsWith("56") ? phone : "56" + phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`
    window.open(wa, "_blank")
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-medium text-gray-500 mb-3">Compartir informe</p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition">
          {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
          {copied ? "Copiado" : "Copiar link"}
        </button>
        <button onClick={handleSendEmail} disabled={sending}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition disabled:opacity-50">
          <Mail size={13} /> {sending ? "Enviando..." : "Email"}
        </button>
        <button onClick={handleWhatsApp}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition">
          <MessageCircle size={13} /> WhatsApp
        </button>
        <button onClick={() => window.open(`/api/pdf/inspection/${inspectionId}`, "_blank")}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition">
          <Download size={13} /> PDF
        </button>
      </div>
    </div>
  )
}
