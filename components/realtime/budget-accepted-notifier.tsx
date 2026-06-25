"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Props {
  inspectorId: string
}

export default function BudgetAcceptedNotifier({ inspectorId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`budgets-inspector-${inspectorId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "budgets",
          filter: `inspector_id=eq.${inspectorId}`,
        },
        (payload) => {
          const newRow = payload.new as any
          const oldRow = payload.old as any
          if (newRow.status === "accepted" && oldRow.status !== "accepted") {
            toast.success(
              `¡Presupuesto ${newRow.numero ?? ""} aceptado por el cliente!`,
              {
                duration: 8000,
                action: {
                  label: "Ver",
                  onClick: () => router.push(`/inspector/budgets/${newRow.id}`),
                },
              }
            )
            router.refresh()
          }
          if (newRow.status === "completed" && oldRow.status !== "completed") {
            toast.success(`Presupuesto ${newRow.numero ?? ""} marcado como completado`)
            router.refresh()
          }
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [inspectorId])

  return null
}
