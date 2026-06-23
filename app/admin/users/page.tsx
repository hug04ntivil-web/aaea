import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { Plus, Mail, Phone } from "lucide-react"

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("full_name, role").eq("id", user!.id).single()

  const { data: inspectors } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, role, created_at")
    .eq("role", "inspector")
    .order("full_name")

  return (
    <AppShell role="admin" userName={profile?.full_name ?? ""} pageTitle="Inspectores">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{inspectors?.length ?? 0} inspector(es)</p>
          <Link
            href="/admin/users/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <Plus size={15} /> Nuevo inspector
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {inspectors && inspectors.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {inspectors.map((ins: any) => (
                <div key={ins.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold text-sm">
                      {ins.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{ins.full_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {ins.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail size={11} /> {ins.email}
                        </span>
                      )}
                      {ins.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone size={11} /> {ins.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    Inspector
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm mb-3">No hay inspectores registrados</p>
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
