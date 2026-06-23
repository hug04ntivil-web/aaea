import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

export function formatRut(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, "")
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1).toUpperCase()
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`
}

export function generatePublicToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function calcNotaFinal(visual: number, carroceria: number, mecanica: number): number {
  return Math.round(((visual + carroceria + mecanica) / 3) * 10) / 10
}

// Estados considerados "buenos" en la inspección
const GOOD_STATES = new Set([
  "Sin Daño", "Bueno", "Normal", "Funciona", "A nivel",
  "No Encendido", "Presenta", "No Presenta",
])
// Estados intermedios (descuento parcial)
const WARN_STATES = new Set(["Con Daño", "Regular"])
// Estados malos (descuento total)
const BAD_STATES = new Set(["Malo", "Anormal", "No Funciona", "Bajo nivel", "Encendido"])

export function calcSectionScore(
  sectionItems: Array<{ key: string }>,
  itemStates: Record<string, { estado: string; observaciones: string }>
): number {
  let points = 0
  let total = 0
  for (const item of sectionItems) {
    const estado = itemStates[item.key]?.estado ?? "N/A"
    if (estado === "N/A") continue
    total++
    if (GOOD_STATES.has(estado)) points += 1
    else if (WARN_STATES.has(estado)) points += 0.6
    // BAD_STATES → 0 points
  }
  if (total === 0) return 7.0
  return Math.min(7.0, Math.round((7 * points / total) * 10) / 10)
}

export function getNotaColor(nota: number): string {
  if (nota >= 6.5) return "text-green-600"
  if (nota >= 5.0) return "text-yellow-600"
  return "text-red-600"
}

export function getNotaBg(nota: number): string {
  if (nota >= 6.5) return "bg-green-500"
  if (nota >= 5.0) return "bg-yellow-500"
  return "bg-red-500"
}
