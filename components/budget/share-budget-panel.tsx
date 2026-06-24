"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Copy, Check, Mail, MessageCircle, Download, QrCode, X,
  Send, FileText, Image as ImageIcon, ChevronDown,
} from "lucide-react"

interface Props {
  budgetId: string
  budgetNumero: string
  clienteNombre: string
  clienteEmail: string
  clienteTel: string
  vigenciaDias?: number
  formaPago?: string
  companyName?: string
}

export default function ShareBudgetPanel({
  budgetId, budgetNumero, clienteNombre, clienteEmail,
  clienteTel, vigenciaDias = 30, formaPago = "", companyName = "",
}: Props) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showWaOptions, setShowWaOptions] = useState(false)
  const [sending, setSending] = useState(false)

  const pdfUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/pdf/budget/${budgetId}`
    : `/api/pdf/budget/${budgetId}`

  // Email modal state
  const defaultBody =
    `Estimado/a ${clienteNombre},\n\nAdjunto encontrará el presupuesto ${budgetNumero} de servicios automotrices solicitado.\n\nTambién puede visualizarlo en el siguiente link:\n${pdfUrl}\n\nVigencia: ${vigenciaDias} días${formaPago ? `\nForma de pago: ${formaPago}` : ""}\n\nSaludos,\n${companyName}`

  const [emailTo, setEmailTo] = useState(clienteEmail)
  const [emailSubject, setEmailSubject] = useState(`Presupuesto ${budgetNumero} — ${companyName || "AAEA Inspecciones"}`)
  const [emailBody, setEmailBody] = useState(defaultBody)
  const [attachPdf, setAttachPdf] = useState(true)

  // Reset modal values when opened
  useEffect(() => {
    if (showEmailModal) {
      setEmailTo(clienteEmail)
      setEmailSubject(`Presupuesto ${budgetNumero} — ${companyName || "AAEA Inspecciones"}`)
      setEmailBody(defaultBody)
      setAttachPdf(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEmailModal])

  // Generate QR for PDF URL
  useEffect(() => {
    if (showQr && !qrDataUrl && pdfUrl) {
      import("qrcode").then(QR =>
        QR.toDataURL(pdfUrl, { width: 280, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      ).then(setQrDataUrl)
    }
  }, [showQr, pdfUrl, qrDataUrl])

  async function copyPdfLink() {
    await navigator.clipboard.writeText(pdfUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Link del PDF copiado")
  }

  async function sendEmail() {
    if (!emailTo) { toast.error("Ingresa un email de destino"); return }
    setSending(true)
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "budget",
          id: budgetId,
          email: emailTo,
          customSubject: emailSubject,
          customBody: emailBody,
          attachPdf,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Email enviado correctamente")
        setShowEmailModal(false)
      } else {
        toast.error(data.error ?? "Error al enviar")
      }
    } catch { toast.error("Error de conexión") }
    finally { setSending(false) }
  }

  function waSendPdfLink() {
    const phone = clienteTel.replace(/[^0-9]/g, "")
    const msg = encodeURIComponent(
      `Hola ${clienteNombre}, te comparto el presupuesto *${budgetNumero}*:\n\n📄 Ver PDF: ${pdfUrl}\n\nVigencia: ${vigenciaDias} días`
    )
    const wa = phone
      ? `https://wa.me/${phone.startsWith("56") ? phone : "56" + phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`
    window.open(wa, "_blank")
    setShowWaOptions(false)
  }

  function waSendQrImage() {
    // Generate QR if not yet done, then show download + share instructions
    setShowWaOptions(false)
    setShowQr(true)
    toast.info("Descarga el QR y compártelo por WhatsApp")
  }

  async function shareQrNative() {
    if (!qrDataUrl) return
    try {
      const res = await fetch(qrDataUrl)
      const blob = await res.blob()
      const file = new File([blob], `qr-${budgetNumero}.png`, { type: "image/png" })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `QR Presupuesto ${budgetNumero}` })
      } else {
        toast.info("Usa el botón 'Descargar QR' y comparte la imagen")
      }
    } catch { /* user cancelled */ }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-medium text-gray-500 mb-3">Compartir presupuesto</p>
        <div className="flex gap-2 flex-wrap">

          {/* Copiar link PDF */}
          <button onClick={copyPdfLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition">
            {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
            {copied ? "Copiado" : "Copiar link PDF"}
          </button>

          {/* Email */}
          <button onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition">
            <Mail size={13} /> Email
          </button>

          {/* WhatsApp */}
          <div className="relative">
            <button onClick={() => setShowWaOptions(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition">
              <MessageCircle size={13} /> WhatsApp <ChevronDown size={11} />
            </button>
            {showWaOptions && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-52">
                <button onClick={waSendPdfLink}
                  className="flex items-center gap-2 w-full px-4 py-3 text-xs text-gray-700 hover:bg-green-50 transition text-left">
                  <FileText size={13} className="text-green-600 shrink-0" />
                  <span>Enviar link del PDF</span>
                </button>
                <button onClick={waSendQrImage}
                  className="flex items-center gap-2 w-full px-4 py-3 text-xs text-gray-700 hover:bg-green-50 transition text-left border-t border-gray-100">
                  <ImageIcon size={13} className="text-green-600 shrink-0" />
                  <span>Compartir QR como imagen</span>
                </button>
                <button onClick={() => setShowWaOptions(false)}
                  className="w-full px-4 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition text-center border-t border-gray-100">
                  Cerrar
                </button>
              </div>
            )}
          </div>

          {/* Descargar PDF */}
          <a href={`/api/pdf/budget/${budgetId}`} target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition">
            <Download size={13} /> PDF
          </a>

          {/* QR */}
          <button onClick={() => setShowQr(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${showQr ? "bg-indigo-600 text-white" : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"}`}>
            <QrCode size={13} /> QR
          </button>
        </div>

        {/* QR panel */}
        {showQr && (
          <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between w-full">
              <p className="text-xs font-medium text-gray-600">QR → abre el PDF del presupuesto</p>
              <button onClick={() => setShowQr(false)}><X size={14} className="text-gray-400" /></button>
            </div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR PDF" className="w-52 h-52 rounded-lg shadow-sm border border-gray-200" />
            ) : (
              <div className="w-52 h-52 bg-gray-200 rounded-lg animate-pulse" />
            )}
            <div className="flex gap-3 flex-wrap justify-center">
              {qrDataUrl && (
                <>
                  <a href={qrDataUrl} download={`qr-${budgetNumero}.png`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                    <Download size={11} /> Descargar QR
                  </a>
                  <button onClick={shareQrNative}
                    className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-1">
                    <MessageCircle size={11} /> Compartir
                  </button>
                </>
              )}
            </div>
            <p className="text-[10px] text-gray-400 text-center break-all max-w-[220px]">{pdfUrl}</p>
          </div>
        )}
      </div>

      {/* ── MODAL EMAIL ──────────────────────────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail size={15} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Enviar presupuesto</h3>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Para</label>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                  placeholder="email@cliente.cl"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Asunto</label>
                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Mensaje</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={10}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-xs" />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={attachPdf} onChange={e => setAttachPdf(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded" />
                <span className="text-sm text-gray-700">
                  Adjuntar PDF del presupuesto
                  <span className="text-xs text-gray-400 ml-1">({budgetNumero}.pdf)</span>
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
                Cancelar
              </button>
              <button onClick={sendEmail} disabled={sending || !emailTo}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                <Send size={14} />
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-outside para cerrar WA options */}
      {showWaOptions && (
        <div className="fixed inset-0 z-10" onClick={() => setShowWaOptions(false)} />
      )}
    </>
  )
}
