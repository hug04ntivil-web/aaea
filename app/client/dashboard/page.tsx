import { createClient } from "@/lib/supabase/server"
import AppShell from "@/components/layout/app-shell"
import Link from "next/link"
import { Car, Receipt } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function ClientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()
  const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user!.id).single()
  const clientId = client?.id

  const [{ data: inspections }, { data: budgets }] = await Promise.all([
    clientId
      ? supabase.from("inspections").select(`id, fecha_inspeccion, nota_final, status, vehicles(patente, marca, modelo, anio)`).eq("client_id", clientId).order("created_at", { ascending: false }).limit(10)
      : { data: [] },
    clientId
      ? supabase.from("budgets").select(`id, numero, total, status, created_at`).eq("client_id", clientId).order("created_at", { ascending: false }).limit(5)
      : { data: [] },
  ])

  return (
    <AppShell role="client" userName={profile?.full_name ?? ""} pageTitle="Mis inspecciones">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Hola, {profile?.full_name?.split(" ")[0]} 👋</h2>
          <p className="text-sm text-gray-500">Tus inspecciones y presupuestos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <Car size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-800">Mis inspecciones</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {inspections && inspections.length > 0 ? (
              inspections.map((ins: any) => (
                <Link key={ins.id} href={`/client/inspections/${ins.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{ins.vehicles?.patente} — {ins.vehicles?.marca} {ins.vehicles?.modelo} {ins.vehicles?.anio}</p>
                    <p className="text-xs text-gray-500">{formatDate(ins.fecha_inspeccion)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ins.nota_final > 0 && (
                      <span className={`text-sm font-bold ${ins.nota_final >= 6.5 ? "text-green-600" : ins.nota_final >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                        {ins.nota_final}/7
                      </span>
                    )}
                    <span className="text-xs text-blue-600">Ver →</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">Tu inspector agregará tus inspecciones aquí.</div>
            )}
          </div>
        </div>
        {budgets && budgets.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 p-4 border-b border-gray-100">
              <Receipt size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800">Mis presupuestos</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {budgets.map((b: any) => (
                <Link key={b.id} href={`/client/budgets/${b.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{b.numero}</p>
                    <p className="text-xs text-gray-500">{formatDate(b.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">${b.total?.toLocaleString("es-CL")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === "accepted" ? "bg-green-100 text-green-700" : b.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {b.status === "accepted" ? "Aceptado" : b.status === "sent" ? "Pendiente" : "Borrador"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
