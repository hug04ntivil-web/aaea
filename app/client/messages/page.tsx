"use client"

import { useState, useEffect, useRef } from "react"
import AppShell from "@/components/layout/app-shell"
import { Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  body: string
  created_at: string
  sender_id: string
  profiles: { full_name: string; role: string }
}

export default function ClientMessagesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const res = await fetch("/api/me")
      const d = await res.json()
      setUserName(d.profile?.full_name ?? "")

      const msgRes = await fetch("/api/messages")
      const msgData = await msgRes.json()
      setMessages(msgData.messages ?? [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send() {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      })
      if (res.ok) {
        const msgRes = await fetch("/api/messages")
        const msgData = await msgRes.json()
        setMessages(msgData.messages ?? [])
        setNewMessage("")
      }
    } catch { }
    finally { setSending(false) }
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  }

  if (loading) return (
    <AppShell role="client" userName="" pageTitle="Consultas">
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    </AppShell>
  )

  return (
    <AppShell role="client" userName={userName} pageTitle="Consultas al inspector">
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-130px)]">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Chat con el inspector</p>
            <p className="text-xs text-gray-400">Puedes hacer preguntas sobre tu inspección o presupuesto</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                Aún no hay mensajes. Escribe tu consulta abajo.
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_id === userId
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                    {!isMe && <p className="text-xs font-semibold mb-1 text-gray-500">{msg.profiles?.full_name}</p>}
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-gray-100 flex gap-2">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Escribe tu consulta..."
              rows={1}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={send} disabled={sending || !newMessage.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
