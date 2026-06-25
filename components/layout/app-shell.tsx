"use client"

import { useState } from "react"
import Sidebar from "./sidebar"
import Topbar from "./topbar"

interface AppShellProps {
  role: "admin" | "inspector" | "client"
  userName: string
  pageTitle: string
  children: React.ReactNode
}

export default function AppShell({ role, userName, pageTitle, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[var(--bg-app)] overflow-hidden">
      <Sidebar
        role={role}
        userName={userName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
