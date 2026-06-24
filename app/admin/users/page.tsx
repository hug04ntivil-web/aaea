import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { Plus, Mail, Phone } from "lucide-react"
import { RowActions } from "@/components/admin/row-actions"

export const dynamic = "force-dynamic"

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  inspector: "Inspector",
  client: "Cliente",
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-50 text-purple-700",
  inspector: "bg-blue-50 text-blue-700",
  client: "bg-green-50 text-green-700",
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, created_at")
    .in("role", ["admin", "inspector"])
    .order("role")
    .order("full_name")

  if (usersError) console.error("[users page] query error:", usersError)
  console.log("[users page] users found:", users?.length, users?.map(u => u.email))

  const admins = users?.filter(u => u.role === "admin") ?? []
  const inspectors = users?.filter(u => u.role === "inspector") ?? []

  return (
    <AppShell role="admin" userName={profile?.full_name ?? ""} pageTitle="Usuarios">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {admins.length} admin(s) · {inspectors.length} inspector(es)
          </p>
          <Link
            href="/admin/users/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <Plus size={15} /> Nuevo usuario
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {users && users.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {users.map((u: any) => (
                <div key={u.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 font-bold text-sm">
                      {u.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{u.full_name}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {u.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail size={11} /> {u.email}
                        </span>
                      )}
                      {u.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone size={11} /> {u.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-50 text-gray-700"}`}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                  <RowActions
                    editUrl={`/admin/users/${u.id}/edit`}
                    deleteUrl={`/api/admin/users/${u.id}`}
                    deleteLabel="¿Eliminar este usuario?"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm mb-3">No hay usuarios registrados</p>
              <Link href="/admin/users/new" className="text-blue-600 text-sm hover:underline font-medium">
                Crear el primero →
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
