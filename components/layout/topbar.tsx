"use client"

import { Menu } from "lucide-react"

interface TopbarProps {
  title: string
  onMenuClick: () => void
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu size={20} className="text-gray-600" />
      </button>
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
    </header>
  )
}
