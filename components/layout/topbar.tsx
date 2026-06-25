"use client"

import { Menu } from "lucide-react"
import { useTheme } from "next-themes"
import GlobalSearch from "./global-search"

interface TopbarProps {
  title: string
  onMenuClick: () => void
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex items-center px-4 gap-3 sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu size={20} className="text-gray-600 dark:text-slate-300" />
      </button>
      <h1 className="text-base font-semibold text-gray-800 dark:text-slate-100 flex-1 truncate">{title}</h1>

      <GlobalSearch />

      {/* Toggle dark mode */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-lg flex-shrink-0"
        aria-label="Cambiar tema"
        title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        suppressHydrationWarning
      >
        <span suppressHydrationWarning>{theme === "dark" ? "☀️" : "🌙"}</span>
      </button>
    </header>
  )
}
