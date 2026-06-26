'use client'

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, FormEvent } from "react"

// ─── Brand constants ──────────────────────────────────────────────────────────
const PHONE = "+56 9 9083 0968"
const WA_RAW = "56990830968"
const WA_MSG = encodeURIComponent("Hola! Me gustaría consultar sobre sus servicios automotrices.")
const WA_URL = `https://wa.me/${WA_RAW}?text=${WA_MSG}`
const ADDRESS = "Sargento Candelaria 1451, San Ramón, Santiago"
const EMAIL_DISPLAY = "aledalbert@gmail.com"

// ─── Types ────────────────────────────────────────────────────────────────────
type FormData = { nombre: string; telefono: string; email: string; vehiculo: string; mensaje: string }
type FormStatus = "idle" | "submitting" | "success" | "error"

// ─── Inline SVG icons (zero dependencies) ────────────────────────────────────
function IconWrench({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}
function IconSearch({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}
function IconDoc({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
function IconCpu({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  )
}
function IconCalendar({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function IconBox({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}
function IconPhone({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.4a16 16 0 0 0 6.29 6.29l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
function IconMail({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}
function IconPin({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function IconCheck({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconArrow({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}
function IconMenu({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
function IconClose({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function IconWhatsApp({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ─── Services data ────────────────────────────────────────────────────────────
const SERVICES = [
  {
    Icon: IconSearch,
    title: "Inspección Mecánica",
    desc: "Revisión integral con más de 90 ítems de evaluación. Informe técnico con calificación /7.0 y evidencia fotográfica.",
  },
  {
    Icon: IconDoc,
    title: "Presupuestos Detallados",
    desc: "Cotizaciones transparentes con 3 opciones de repuesto: Genuino, Korea y Multi-origen. Sin cargos ocultos.",
  },
  {
    Icon: IconCpu,
    title: "Diagnóstico Electrónico",
    desc: "Lectura de códigos de falla OBD2, análisis de sensores y diagnóstico computarizado de sistemas modernos.",
  },
  {
    Icon: IconCalendar,
    title: "Mantención Preventiva",
    desc: "Cambio de aceite, filtros, revisión de frenos, suspensión y todos los servicios programados del fabricante.",
  },
  {
    Icon: IconBox,
    title: "Repuestos e Insumos",
    desc: "Venta de repuestos y accesorios automotrices con asesoría técnica para elegir el componente correcto.",
  },
  {
    Icon: IconWrench,
    title: "Reparación General",
    desc: "Motor, transmisión, frenos, suspensión y dirección. Trabajos garantizados realizados por técnicos certificados.",
  },
]

const NAV_LINKS = [
  ["Inicio", "inicio"],
  ["Servicios", "servicios"],
  ["Nosotros", "nosotros"],
  ["Contacto", "contacto"],
] as const

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [form, setForm] = useState<FormData>({ nombre: "", telefono: "", email: "", vehiculo: "", mensaje: "" })
  const [status, setStatus] = useState<FormStatus>("idle")

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setMenuOpen(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus("success")
        setForm({ nombre: "", telefono: "", email: "", vehiculo: "", mensaje: "" })
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2d7a2d] focus:ring-2 focus:ring-[#2d7a2d]/10 transition bg-white"

  return (
    <div className="min-h-screen font-sans antialiased text-gray-900">

      {/* ═══════════════════════════════════════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════════════════════════════════════ */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/96 backdrop-blur-sm shadow-sm border-b border-gray-100" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo("inicio")} className="flex items-center gap-2 shrink-0">
            <Image
              src="/alelogo.png"
              alt="Aledalbertz AE Automotive"
              width={150}
              height={60}
              className={`object-contain h-10 w-auto transition-all ${!scrolled ? "brightness-0 invert" : ""}`}
              priority
            />
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(([label, id]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`text-sm font-medium transition-colors hover:text-[#2d7a2d] ${
                  scrolled ? "text-gray-700" : "text-white/90 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
            <Link
              href="/login"
              className="ml-2 px-5 py-2 rounded-full text-sm font-semibold bg-[#2d7a2d] text-white hover:bg-[#245a24] transition-colors shadow-md shadow-[#2d7a2d]/20"
            >
              Acceso al Sistema
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            className={`md:hidden p-2 rounded-lg transition ${scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white"}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-xl">
            <div className="px-4 py-5 flex flex-col gap-1">
              {NAV_LINKS.map(([label, id]) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="text-left px-3 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:text-[#2d7a2d] transition-colors"
                >
                  {label}
                </button>
              ))}
              <Link
                href="/login"
                className="mt-3 px-4 py-3 rounded-xl text-center font-semibold bg-[#2d7a2d] text-white hover:bg-[#245a24] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Acceso al Sistema
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════════════ */}
      <section
        id="inicio"
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a1f0a 0%, #173317 35%, #1e4d1e 60%, #0d260d 100%)",
        }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 0h80v80H0z' fill='none'/%3E%3Cpath d='M0 0h1v80H0zM80 0h1v80h-1zM0 0v1h80V0zM0 80v1h80v-1z' fill='%23fff'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Diagonal accent */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute right-0 top-0 w-1/2 h-full opacity-10"
            style={{
              background: "linear-gradient(135deg, transparent 40%, #4caf50 100%)",
            }}
          />
          <div className="absolute -right-20 top-1/4 w-96 h-96 rounded-full bg-[#2d7a2d] opacity-10 blur-3xl" />
          <div className="absolute left-1/4 bottom-0 w-64 h-64 rounded-full bg-[#4caf50] opacity-5 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20 w-full">
          <div className="max-w-2xl">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-7">
              <span className="w-2 h-2 rounded-full bg-[#52c752] animate-pulse shrink-0" />
              <span className="text-[#a3e9a3] text-sm font-medium">San Ramón, Santiago · Atención inmediata</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6 tracking-tight">
              Inspección y{" "}
              <span
                className="relative inline-block"
                style={{ color: "#52c752" }}
              >
                Reparación
              </span>{" "}
              Automotriz Profesional
            </h1>

            {/* Subheading */}
            <p className="text-lg text-white/70 mb-10 leading-relaxed max-w-xl">
              Diagnóstico preciso, presupuestos transparentes y servicio de calidad.
              Tu vehículo en manos de técnicos con más de 10 años de experiencia.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-7 py-4 bg-[#25D366] hover:bg-[#20b858] text-white font-bold rounded-2xl text-base transition-all hover:scale-[1.03] shadow-xl shadow-[#25D366]/25 active:scale-[0.98]"
              >
                <IconWhatsApp className="w-6 h-6" />
                Contactar por WhatsApp
              </a>
              <button
                onClick={() => scrollTo("contacto")}
                className="flex items-center justify-center gap-2 px-7 py-4 border-2 border-white/30 hover:border-[#52c752] hover:bg-white/5 text-white font-bold rounded-2xl text-base transition-all active:scale-[0.98]"
              >
                Solicitar Inspección
                <IconArrow />
              </button>
            </div>

            {/* Trust pills */}
            <div className="mt-12 flex flex-wrap gap-5">
              {["+10 años de experiencia", "Presupuesto sin costo", "Técnicos certificados"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-white/70 text-sm">
                  <span className="text-[#52c752] shrink-0">
                    <IconCheck className="w-4 h-4" />
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 inset-x-0 leading-none">
          <svg viewBox="0 0 1440 72" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="block w-full h-12 sm:h-16 lg:h-20">
            <path d="M0,72 C240,24 480,0 720,24 C960,48 1200,48 1440,24 L1440,72 Z" fill="#f9fafb" />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SERVICES
      ═══════════════════════════════════════════════════════════════════════ */}
      <section id="servicios" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-[#2d7a2d] font-semibold text-xs uppercase tracking-[0.15em] bg-[#2d7a2d]/10 px-3 py-1 rounded-full mb-3">
              Nuestros Servicios
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Todo lo que tu vehículo necesita
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto text-base">
              Tecnología de punta y personal certificado para mantener tu inversión en óptimas condiciones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="group bg-white rounded-2xl p-7 border border-gray-100 hover:border-[#2d7a2d]/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#f0f9f0] flex items-center justify-center text-[#2d7a2d] group-hover:bg-[#2d7a2d] group-hover:text-white transition-colors duration-300 mb-5">
                  <Icon />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-14 bg-[#1e4d1e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: "+500", label: "Inspecciones realizadas" },
              { num: "+10", label: "Años de experiencia" },
              { num: "100%", label: "Garantía en trabajos" },
              { num: "3", label: "Opciones de repuesto" },
            ].map(({ num, label }) => (
              <div key={label} className="text-center">
                <div className="text-4xl sm:text-5xl font-black text-white mb-1.5 tabular-nums">{num}</div>
                <div className="text-[#a3d9a3] text-sm font-medium leading-snug">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          WHY US
      ═══════════════════════════════════════════════════════════════════════ */}
      <section id="nosotros" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-[#2d7a2d] font-semibold text-xs uppercase tracking-[0.15em] bg-[#2d7a2d]/10 px-3 py-1 rounded-full mb-3">
              ¿Por qué elegirnos?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Comprometidos con la excelencia
            </h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">
              Más que un taller mecánico — somos tu aliado de confianza para mantener tu vehículo en perfectas condiciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: "🔬",
                title: "Diagnóstico Preciso",
                desc: "Usamos equipos de diagnóstico electrónico de última generación para detectar fallas con exactitud, ahorrándote tiempo y dinero.",
                points: ["Scanner OBD2 profesional", "Análisis de +90 ítems", "Informe fotográfico completo"],
              },
              {
                emoji: "📋",
                title: "Transparencia Total",
                desc: "Sin letras chicas. Te explicamos qué necesita tu vehículo y cuánto cuesta antes de comenzar cualquier trabajo.",
                points: ["Presupuesto detallado previo", "3 opciones de repuesto", "Sin cargos ocultos"],
              },
              {
                emoji: "⚡",
                title: "Tecnología Moderna",
                desc: "Sistema digital de inspecciones con entrega inmediata de informes por email y WhatsApp. Todo documentado y disponible en línea.",
                points: ["Informes en tiempo real", "Historial digital del vehículo", "Seguimiento por WhatsApp"],
              },
            ].map(({ emoji, title, desc, points }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <div className="text-4xl mb-5">{emoji}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{desc}</p>
                <ul className="space-y-2.5">
                  {points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <span className="text-[#2d7a2d] shrink-0">
                        <IconCheck className="w-4 h-4" />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CONTACT
      ═══════════════════════════════════════════════════════════════════════ */}
      <section id="contacto" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* Left — info */}
            <div>
              <span className="inline-block text-[#2d7a2d] font-semibold text-xs uppercase tracking-[0.15em] bg-[#2d7a2d]/10 px-3 py-1 rounded-full mb-4">
                Contáctanos
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">
                ¿Listo para cuidar tu vehículo?
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                Escríbenos y te contactaremos a la brevedad. También puedes llamarnos o visitarnos en nuestro taller en San Ramón.
              </p>

              <div className="space-y-3">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-[#25D366]/50 hover:shadow-md transition-all group"
                >
                  <div className="w-11 h-11 bg-[#25D366]/10 group-hover:bg-[#25D366] rounded-xl flex items-center justify-center text-[#25D366] group-hover:text-white transition-colors shrink-0">
                    <IconWhatsApp className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">WhatsApp</div>
                    <div className="text-gray-900 font-semibold text-sm">{PHONE}</div>
                  </div>
                </a>

                <a
                  href={`tel:${PHONE.replace(/\s/g, "")}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-[#2d7a2d]/40 hover:shadow-md transition-all group"
                >
                  <div className="w-11 h-11 bg-[#2d7a2d]/10 group-hover:bg-[#2d7a2d] rounded-xl flex items-center justify-center text-[#2d7a2d] group-hover:text-white transition-colors shrink-0">
                    <IconPhone />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Teléfono</div>
                    <div className="text-gray-900 font-semibold text-sm">{PHONE}</div>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-11 h-11 bg-[#2d7a2d]/10 rounded-xl flex items-center justify-center text-[#2d7a2d] shrink-0">
                    <IconPin />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Dirección</div>
                    <div className="text-gray-900 font-semibold text-sm">{ADDRESS}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-11 h-11 bg-[#2d7a2d]/10 rounded-xl flex items-center justify-center text-[#2d7a2d] shrink-0">
                    <IconMail />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Email</div>
                    <div className="text-gray-900 font-semibold text-sm">{EMAIL_DISPLAY}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Envíanos tu consulta</h3>

              {status === "success" ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#f0f9f0] rounded-full flex items-center justify-center mx-auto mb-4 text-[#2d7a2d]">
                    <IconCheck className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">¡Mensaje enviado!</h4>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                    Te contactaremos a la brevedad. También puedes escribirnos directamente por WhatsApp.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-6 text-[#2d7a2d] font-semibold text-sm hover:underline"
                  >
                    Enviar otra consulta
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={form.nombre}
                        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                        className={inputCls}
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                      <input
                        type="tel"
                        value={form.telefono}
                        onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                        className={inputCls}
                        placeholder="+56 9 XXXX XXXX"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className={inputCls}
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehículo <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input
                      type="text"
                      value={form.vehiculo}
                      onChange={(e) => setForm((f) => ({ ...f, vehiculo: e.target.value }))}
                      className={inputCls}
                      placeholder="Ej: Toyota Hilux 2020 · PATENTE"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensaje *</label>
                    <textarea
                      required
                      rows={4}
                      value={form.mensaje}
                      onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
                      className={`${inputCls} resize-none`}
                      placeholder="¿En qué podemos ayudarte?"
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      Error al enviar. Por favor inténtalo de nuevo o contáctanos por{" "}
                      <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium">WhatsApp</a>.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full py-3.5 bg-[#2d7a2d] hover:bg-[#245a24] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    {status === "submitting" ? "Enviando..." : "Enviar consulta"}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-1">
                    O escríbenos directo:{" "}
                    <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="text-[#25D366] font-semibold hover:underline">
                      WhatsApp
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#0d200d] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <Image
                src="/alelogo.png"
                alt="Aledalbertz AE Automotive"
                width={150}
                height={60}
                className="object-contain h-12 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Taller mecánico profesional especializado en inspecciones, reparaciones y mantención vehicular en San Ramón, Santiago.
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-[0.12em] text-gray-400 mb-5">Servicios</h4>
              <ul className="space-y-2.5 text-gray-400 text-sm">
                {["Inspección Mecánica", "Diagnóstico Electrónico", "Mantención Preventiva", "Presupuestos", "Venta de Repuestos", "Reparación General"].map((s) => (
                  <li key={s} className="hover:text-white transition-colors cursor-default">{s}</li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-[0.12em] text-gray-400 mb-5">Contacto</h4>
              <div className="space-y-3.5 text-gray-400 text-sm">
                <div className="flex items-start gap-3">
                  <IconPin className="w-4 h-4 mt-0.5 shrink-0 text-[#52c752]" />
                  <span>{ADDRESS}</span>
                </div>
                <div className="flex items-center gap-3">
                  <IconPhone className="w-4 h-4 shrink-0 text-[#52c752]" />
                  <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="hover:text-white transition-colors">{PHONE}</a>
                </div>
                <div className="flex items-center gap-3">
                  <IconMail className="w-4 h-4 shrink-0 text-[#52c752]" />
                  <a href={`mailto:${EMAIL_DISPLAY}`} className="hover:text-white transition-colors">{EMAIL_DISPLAY}</a>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href={WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20b858] text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <IconWhatsApp className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} Aledalbertz AE Automotive. Todos los derechos reservados.
            </p>
            <Link href="/login" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
              Acceso al Sistema de Inspecciones →
            </Link>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════
          FLOATING WHATSAPP BUTTON
      ═══════════════════════════════════════════════════════════════════════ */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20b858] text-white rounded-full shadow-2xl shadow-[#25D366]/40 hover:shadow-[#25D366]/60 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="Contactar por WhatsApp"
      >
        <IconWhatsApp />
      </a>
    </div>
  )
}
