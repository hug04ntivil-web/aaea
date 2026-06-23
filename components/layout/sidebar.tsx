"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Car, ClipboardList, Users, Settings,
  MessageSquare, LogOut, FileText, UserCircle, Receipt, X
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inspections", label: "Inspecciones", icon: ClipboardList },
  { href: "/admin/budgets", label: "Presupuestos", icon: Receipt },
  { href: "/admin/clients", label: "Clientes", icon: Users },
  { href: "/admin/users", label: "Inspectores", icon: UserCircle },
  { href: "/admin/messages", label: "Mensajes", icon: MessageSquare },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
]

const inspectorNav: NavItem[] = [
  { href: "/inspector/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inspector/inspections/new", label: "Nueva inspección", icon: Car },
  { href: "/inspector/inspections", label: "Mis inspecciones", icon: ClipboardList },
  { href: "/inspector/budgets", label: "Presupuestos", icon: Receipt },
  { href: "/inspector/clients", label: "Mis clientes", icon: Users },
  { href: "/inspector/profile", label: "Mi perfil", icon: UserCircle },
]

const clientNav: NavItem[] = [
  { href: "/client/dashboard", label: "Mis vehículos", icon: Car },
  { href: "/client/budgets", label: "Mis presupuestos", icon: Receipt },
  { href: "/client/messages", label: "Consultas", icon: MessageSquare },
  { href: "/client/profile", label: "Mi perfil", icon: UserCircle },
]

interface SidebarProps {
  role: "admin" | "inspector" | "client"
  userName: string
  open: boolean
  onClose: () => void
}

export default function Sidebar({ role, userName, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const nav = role === "admin" ? adminNav : role === "inspector" ? inspectorNav : clientNav
  const roleLabel = role === "admin" ? "Administrador" : role === "inspector" ? "Inspector" : "Cliente"
  const roleColor = role === "admin" ? "bg-purple-100 text-purple-700" : role === "inspector" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("Sesión cerrada")
    router.push("/login")
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-50 flex flex-col transition-transform duration-300",
        "lg:translate-x-0 lg:static lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-black">AA</span>
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">AAEA</p>
              <p className="text-xs text-slate-400">Inspecciones</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block", roleColor)}>
            {roleLabel}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {nav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-slate-300 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
