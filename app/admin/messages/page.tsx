"use client"

import { useState, useEffect, useRef } from "react"
import AppShell from "@/components/layout/app-shell"
import { Send } from "lucide-react"

interface Client {
  id: string
  full_name: string
  profile_id: string
}

interface Message {
  id: string
  body: string
  created_at: string
  sender_id: string
  profiles: { full_name: string; role: string }
}

export default function AdminMessagesPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/admin/clients-list").then(r => r.json()).then(d => {
      setClients(d.clients ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selectedClient) return
    loadMessages()
  }, [selectedClient])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function loadMessages() {
    if (!selectedClient) return
    const res = await fetch(`/api/admin/messages?clientId=${selectedClient.profile_id}`)
    const d = await res.json()
    setMessages(d.messages ?? [])
  }

  async function send() {
    if (!newMessage.trim() || !selectedClient) return
    setSending(true)
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage, clientId: selectedClient.profile_id }),
      })
      if (res.ok) { await loadMessages(); setNewMessage("") }
    } catch { }
    finally { setSending(false) }
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  }

  if (loading) return (
    <AppShell role="admin" userName="Admin" pageTitle="Mensajes">
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    </AppShell>
  )

  return (
    <AppShell role="admin" userName="Admin" pageTitle="Mensajes">
      <div className="flex gap-4 h-[calc(100vh-130px)]">
        {/* Lista de clientes */}
        <div className="w-64 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clientes</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {clients.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-xs">No hay clientes aún</div>
            )}
            {clients.map(c => (
              <button key={c.id} onClick={() => setSelectedClient(c)}
                className={`w-full text-left px-3 py-3 text-sm transition ${selectedClient?.id === c.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                {c.full_name}
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {!selectedClient ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecciona un cliente para ver los mensajes
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{selectedClient.full_name}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">Sin mensajes aún</div>
                )}
                {messages.map(msg => {
                  const isAdmin = msg.profiles?.role === "admin" || msg.profiles?.role === "inspector"
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm ${isAdmin ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                        {!isAdmin && <p className="text-xs font-semibold mb-1 text-gray-500">{msg.profiles?.full_name}</p>}
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p className={`text-xs mt-1 ${isAdmin ? "text-blue-200" : "text-gray-400"}`}>{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-gray-100 flex gap-2">
                <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Escribe un mensaje..." rows={1}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={send} disabled={sending || !newMessage.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-40">
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
