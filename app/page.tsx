'use client'

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useRef, FormEvent } from "react"

const PHONE = "+56 9 9083 0968"
const WA_RAW = "56990830968"
const WA_MSG = encodeURIComponent("Hola! Me gustaría consultar sobre sus servicios automotrices.")
const WA_URL = `https://wa.me/${WA_RAW}?text=${WA_MSG}`
const ADDRESS = "Sargento Candelaria 1451, San Ramón, Santiago"
const EMAIL_DISPLAY = "aledalbert@gmail.com"

type FormData = { nombre: string; telefono: string; email: string; vehiculo: string; mensaje: string }
type FormStatus = "idle" | "submitting" | "success" | "error"

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const IcoWA = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)
const IcoCheck = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IcoArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
)
const IcoPhone = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.4a16 16 0 0 0 6.29 6.29l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)
const IcoPin = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)
const IcoClock = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const IcoMenu = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
  </svg>
)
const IcoClose = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IcoGear = () => (
  <svg className="gear-spin" width="148" height="148" viewBox="0 0 24 24" fill="none" stroke="rgba(82,199,82,0.28)" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.778-1.081 2.648L2 11v2l2.401.63 1.106 2.72L4 18l2 2 1.726-1.5 2.704 1.11.629 2.39h1.954l.595-2.4 2.659-1.1L18 20l2-2-1.453-1.778 1.106-2.704L22 13v-2l-2.378-.605z" />
  </svg>
)

// ── Scroll animation hook ──────────────────────────────────────────────────────
function useScrollAnim() {
  useEffect(() => {
    const els = document.querySelectorAll('.anim-up')
    if (!els.length) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

// ── Counter animation hook ─────────────────────────────────────────────────────
function useCounters(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ref.current) return
    let ran = false
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || ran) return
      ran = true
      document.querySelectorAll<HTMLElement>('[data-count]').forEach(el => {
        const target = parseFloat(el.dataset.count || '0')
        const prefix = el.dataset.prefix || ''
        const suffix = el.dataset.suffix || ''
        const dur = 1800
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min((now - start) / dur, 1)
          const ease = 1 - Math.pow(1 - t, 3)
          el.textContent = prefix + Math.round(ease * target) + suffix
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    }, { threshold: 0.4 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
}

// ── Progress bar hook ──────────────────────────────────────────────────────────
function useProgressBar() {
  useEffect(() => {
    const bar = document.getElementById('pgbar')
    if (!bar) return
    const update = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight
      bar.style.width = (docH > 0 ? (window.scrollY / docH) * 100 : 0) + '%'
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [form, setForm] = useState<FormData>({ nombre: "", telefono: "", email: "", vehiculo: "", mensaje: "" })
  const [status, setStatus] = useState<FormStatus>("idle")
  const statsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useScrollAnim()
  useCounters(statsRef)
  useProgressBar()

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 68
    window.scrollTo({ top, behavior: 'smooth' })
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

  const inp = "w-full px-3.5 py-3 border border-[#e0e0db] rounded-[9px] bg-white text-[#0d1a0d] landing-input"

  return (
    <div style={{ fontFamily: "var(--font-barlow), -apple-system, sans-serif", WebkitFontSmoothing: "antialiased", background: "#fff" }}>

      {/* Progress bar */}
      <div id="pgbar" />

      {/* ═══════ NAVBAR ═══════ */}
      <header
        id="site-nav"
        className={scrolled ? "scrolled" : ""}
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => scrollTo("inicio")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}>
            <Image
              id="logo-main"
              src="/alelogo.png"
              alt="Aledalbertz AE Automotive"
              width={150}
              height={60}
              style={{ height: 58, width: "auto", objectFit: "contain", filter: scrolled ? "none" : "brightness(0) invert(1)", transition: "filter 0.32s" }}
              priority
            />
          </button>

          {/* Desktop nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden md:flex">
            {(["Servicios", "Nosotros", "Contacto"] as const).map((label) => (
              <button
                key={label}
                onClick={() => scrollTo(label.toLowerCase())}
                className="nav-link-item"
              >
                {label}
              </button>
            ))}
            <Link
              href="/login"
              style={{ background: "#2d7a2d", color: "#fff", padding: "11px 24px", borderRadius: 8, fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 700, textDecoration: "none", letterSpacing: "0.05em", textTransform: "uppercase" }}
            >
              ACCESO
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button className="nav-menu-btn md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
            {menuOpen ? <IcoClose /> : <IcoMenu />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: "#fff", borderTop: "1px solid #e8e8e3", padding: "16px 24px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {["Servicios", "Nosotros", "Contacto"].map((label) => (
                <button
                  key={label}
                  onClick={() => scrollTo(label.toLowerCase())}
                  style={{ textAlign: "left", padding: "12px 10px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-barlow), sans-serif", fontSize: 16, fontWeight: 500, color: "#374151", borderRadius: 8 }}
                >
                  {label}
                </button>
              ))}
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                style={{ display: "block", textAlign: "center", background: "#2d7a2d", color: "#fff", borderRadius: 8, padding: 13, marginTop: 8, fontFamily: "var(--font-barlow), sans-serif", fontSize: 15, fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", textTransform: "uppercase" }}
              >
                ACCESO
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ═══════ HERO ═══════ */}
      <section id="inicio" style={{ minHeight: "100vh", background: "#090F09", display: "flex", alignItems: "center", paddingTop: 68, position: "relative", overflow: "hidden" }}>
        {/* Foto de fondo con overlay oscuro */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <img src="/fondoweb.png" alt="" aria-hidden="true" className="hero-bg-img" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          {/* Overlay oscuro para legibilidad del texto */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(5,10,5,0.62) 0%, rgba(9,15,9,0.55) 50%, rgba(5,14,5,0.48) 100%)" }} />
          {/* Degradado inferior para la transición con la wave */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: "linear-gradient(to bottom, transparent 0%, rgba(9,15,9,0.6) 60%, #090F09 100%)" }} />
        </div>
        {/* Destellos de color sobre la foto */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -100, top: "15%", width: 580, height: 580, borderRadius: "50%", background: "radial-gradient(circle,rgba(45,122,45,0.10) 0%,transparent 70%)" }} />
          <div style={{ position: "absolute", left: -60, bottom: "5%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(82,199,82,0.06) 0%,transparent 70%)" }} />
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 28px 108px", width: "100%", position: "relative", zIndex: 1 }}>
          <div className="hero-layout">
            {/* Left */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 100, padding: "7px 18px", marginBottom: 28 }}>
                <span className="dot-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#52c752", flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 500, color: "rgba(163,233,163,0.9)", letterSpacing: "0.04em" }}>San Ramón, Santiago · Atención inmediata</span>
              </div>

              <h1 style={{ fontFamily: "var(--font-barlow-condensed), sans-serif", fontSize: "clamp(52px,7.5vw,90px)", fontWeight: 900, color: "#fff", lineHeight: 0.93, letterSpacing: "-0.01em", marginBottom: 24, textTransform: "uppercase" }}>
                INSPECCIÓN<br />
                Y <span style={{ color: "#52c752" }}>REPARACIÓN</span><br />
                AUTOMOTRIZ<br />
                <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.55)", fontSize: "0.72em" }}>PROFESIONAL</span>
              </h1>

              <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 17, fontWeight: 300, color: "rgba(255,255,255,0.62)", lineHeight: 1.75, marginBottom: 36, maxWidth: 460 }}>
                Diagnóstico preciso, presupuestos transparentes y servicio de calidad. Técnicos con más de 10 años de experiencia en San Ramón.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 44 }}>
                <button onClick={() => scrollTo("contacto")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,0.22)", padding: "14px 28px", borderRadius: 10, fontFamily: "var(--font-barlow), sans-serif", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                  Solicitar Inspección
                  <IcoArrow />
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                {["+10 años de experiencia", "Presupuesto sin costo", "Técnicos certificados"].map(t => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#52c752" }}><IcoCheck size={15} /></span>
                    <span style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, color: "rgba(255,255,255,0.58)" }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — floating decoration */}
            <div className="hero-deco-wrap">
              <div className="float-anim" style={{ position: "relative", width: 420, height: 420 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(45,122,45,0.22)" }} />
                <div style={{ position: "absolute", inset: 44, borderRadius: "50%", border: "1px solid rgba(82,199,82,0.13)" }} />
                <div style={{ position: "absolute", inset: 88, borderRadius: "50%", background: "rgba(45,122,45,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IcoGear />
                </div>
                {/* Floating badges */}
                {[
                  { val: "+500", label: "Inspecciones", style: { top: 22, right: -28 } },
                  { val: "100%", label: "Garantía", style: { bottom: 174, right: -18 } },
                  { val: "+10", label: "Años Exp.", style: { bottom: 76, right: -18 } },
                ].map(({ val, label, style: s }) => (
                  <div key={label} style={{ position: "absolute", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "14px 20px", backdropFilter: "blur(12px)", ...s }}>
                    <div style={{ fontFamily: "var(--font-barlow-condensed), sans-serif", fontSize: 38, fontWeight: 900, color: "#52c752", lineHeight: 1 }}>{val}</div>
                    <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.08em", marginTop: 5, textTransform: "uppercase" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: "100%", height: 72, display: "block" }}>
            <path d="M0,80 C360,18 720,62 1080,18 C1260,0 1380,30 1440,18 L1440,80 Z" fill="#F7F8F5" />
          </svg>
        </div>
      </section>

      {/* ═══════ SERVICIOS ═══════ */}
      <section id="servicios" style={{ padding: "96px 0", background: "#F7F8F5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
          <div className="anim-up" style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionBadge light>NUESTROS SERVICIOS</SectionBadge>
            <h2 className="section-title dark">TODO LO QUE TU VEHÍCULO NECESITA</h2>
            <p className="section-sub">Tecnología de punta y personal certificado para mantener tu inversión en óptimas condiciones.</p>
          </div>
          <div className="svc-grid">
            {SERVICES.map(({ icon, title, desc, num, bg }) => (
              <div key={title} className="svc-card" style={{ borderRadius: 14, border: "1.5px solid #ebebE6", position: "relative", overflow: "hidden", cursor: "default", minHeight: 260 }}>
                {/* Imagen de fondo del servicio */}
                <img src={bg} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", pointerEvents: "none" }} />
                {/* Overlay para que el texto sea legible */}
                {/* Gradiente solo en la parte inferior para que el texto sea legible */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0,0,0,0.72) 100%)", pointerEvents: "none" }} />
                {/* Número en esquina superior izquierda */}
                <div style={{ position: "absolute", top: 14, left: 16, fontFamily: "var(--font-barlow-condensed), sans-serif", fontSize: 15, fontWeight: 800, color: "#52c752", letterSpacing: "0.08em", lineHeight: 1, background: "rgba(10,30,10,0.55)", borderRadius: 6, padding: "4px 8px" }}>{num}</div>
                {/* Contenido anclado al fondo */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 20px 22px" }}>
                  <div className="svc-icon" style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(10,30,10,0.65)", display: "flex", alignItems: "center", justifyContent: "center", color: "#52c752", marginBottom: 10 }}>
                    {icon}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 5 }}>{title}</h3>
                  <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PROCESO ═══════ */}
      <section style={{ padding: "96px 0", background: "#0F220F" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
          <div className="anim-up" style={{ textAlign: "center", marginBottom: 60 }}>
            <SectionBadge dark>¿CÓMO TRABAJAMOS?</SectionBadge>
            <h2 className="section-title light">PROCESO SIMPLE Y TRANSPARENTE</h2>
            <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 16, fontWeight: 300, color: "rgba(255,255,255,0.5)", maxWidth: 460, margin: "0 auto", lineHeight: 1.75 }}>Desde que nos contactas hasta que retiras tu vehículo, todo el proceso es claro y sin sorpresas.</p>
          </div>
          <div className="proc-grid" style={{ position: "relative" }}>
            {PROCESS_STEPS.map(({ icon, step, title, desc }, i) => (
              <div key={step} className={`proc-step anim-up delay-${i + 1}`} style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                <div className="proc-num" style={{ width: 88, height: 88, borderRadius: "50%", border: "2px solid rgba(82,199,82,0.28)", background: "#122212", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  {icon}
                </div>
                <div style={{ fontFamily: "var(--font-barlow-condensed), sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#52c752", marginBottom: 6, textTransform: "uppercase" }}>PASO {step}</div>
                <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{title}</div>
                <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, fontWeight: 300, color: "rgba(255,255,255,0.48)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ STATS ═══════ */}
      <section ref={statsRef} id="stats-section" style={{ padding: "68px 0", background: "#1E4D1E" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
          <div className="stats-grid">
            {[
              { count: 500, prefix: "+", label: "Inspecciones realizadas" },
              { count: 10, prefix: "+", label: "Años de experiencia" },
              { count: 100, suffix: "%", label: "Garantía en trabajos" },
              { count: 3, label: "Opciones de repuesto" },
            ].map(({ count, prefix, suffix, label }, i) => (
              <div key={label} className={`anim-up delay-${i + 1}`} style={{ textAlign: "center" }}>
                <div
                  data-count={count}
                  data-prefix={prefix}
                  data-suffix={suffix}
                  style={{ fontFamily: "var(--font-barlow-condensed), sans-serif", fontSize: "clamp(48px,5vw,68px)", fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: 10 }}
                >
                  {prefix}{count}{suffix}
                </div>
                <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", color: "rgba(163,219,163,0.65)", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ POR QUÉ ELEGIRNOS ═══════ */}
      <section id="nosotros" style={{ padding: "96px 0", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
          <div className="anim-up" style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionBadge light>¿POR QUÉ ELEGIRNOS?</SectionBadge>
            <h2 className="section-title dark">COMPROMETIDOS CON LA EXCELENCIA</h2>
            <p className="section-sub">Más que un taller — somos tu aliado de confianza para mantener tu vehículo en perfectas condiciones.</p>
          </div>
          <div className="why-grid">
            {WHY_CARDS.map(({ icon, title, desc, points }, i) => (
              <div key={title} className={`anim-up delay-${i + 1}`} style={{ background: "#F7F8F5", borderRadius: 14, padding: "32px 28px", border: "1.5px solid #ebebE6" }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(45,122,45,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2d7a2d", marginBottom: 20 }}>{icon}</div>
                <h3 style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 18, fontWeight: 700, color: "#0d1a0d", marginBottom: 10 }}>{title}</h3>
                <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, fontWeight: 300, color: "#6b7280", lineHeight: 1.75, marginBottom: 20 }}>{desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {points.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#2d7a2d" }}><IcoCheck /></span>
                      <span style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, color: "#374151" }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIOS ═══════ */}
      <section style={{ padding: "96px 0", background: "#F7F8F5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
          <div className="anim-up" style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionBadge light>TESTIMONIOS</SectionBadge>
            <h2 className="section-title dark">LO QUE DICEN NUESTROS CLIENTES</h2>
            <p className="section-sub">La confianza de nuestros clientes es el mejor respaldo de nuestro trabajo.</p>
          </div>
          <div className="testi-grid">
            {TESTIMONIALS.map(({ quote, name, vehicle, initials }, i) => (
              <div key={name} className={`testi-card anim-up delay-${i + 1}`} style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1.5px solid #ebebE6" }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                  {"★★★★★".split("").map((s, j) => <span key={j} style={{ color: "#F5A623", fontSize: 17 }}>{s}</span>)}
                </div>
                <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 15, fontWeight: 300, color: "#374151", lineHeight: 1.8, marginBottom: 20, fontStyle: "italic" }}>"{quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #ebebE6", paddingTop: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1E4D1E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-barlow-condensed), sans-serif", fontWeight: 700, fontSize: 16, color: "#52c752", flexShrink: 0 }}>{initials}</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, fontWeight: 700, color: "#0d1a0d" }}>{name}</div>
                    <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{vehicle}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CONTACTO ═══════ */}
      <section id="contacto" style={{ padding: "96px 0", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
          <div className="contact-grid">
            {/* Left — info */}
            <div className="anim-up">
              <SectionBadge light>CONTÁCTANOS</SectionBadge>
              <h2 style={{ fontFamily: "var(--font-barlow-condensed), sans-serif", fontSize: "clamp(32px,4vw,48px)", fontWeight: 900, color: "#0d1a0d", textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 12, marginTop: 8 }}>¿LISTO PARA CUIDAR TU VEHÍCULO?</h2>
              <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 16, fontWeight: 300, color: "#6b7280", lineHeight: 1.75, marginBottom: 28 }}>Escríbenos y te contactaremos a la brevedad. También puedes llamarnos o visitarnos directamente en San Ramón.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="contact-link" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#fff", border: "1.5px solid #ebebE6", borderRadius: 12, textDecoration: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 44, height: 44, background: "rgba(37,211,102,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#25D366", flexShrink: 0 }}><IcoWA size={22} /></div>
                  <div>
                    <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>WhatsApp</div>
                    <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 15, fontWeight: 600, color: "#0d1a0d" }}>{PHONE}</div>
                  </div>
                </a>
                <div className="contact-link" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#fff", border: "1.5px solid #ebebE6", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 44, height: 44, background: "rgba(45,122,45,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#2d7a2d", flexShrink: 0 }}><IcoPin size={20} /></div>
                  <div>
                    <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Dirección</div>
                    <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 15, fontWeight: 600, color: "#0d1a0d" }}>Sargento Candelaria 1451, San Ramón</div>
                  </div>
                </div>
              </div>

              {/* Horarios */}
              <div style={{ background: "#F7F8F5", borderRadius: 12, padding: "20px 24px", border: "1.5px solid #ebebE6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ color: "#2d7a2d" }}><IcoClock /></span>
                  <span style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2d7a2d" }}>Horarios de Atención</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {[
                    { day: "Lunes a Viernes", hours: "08:30 – 18:30", active: true },
                    { day: "Sábados", hours: "09:00 – 13:00", active: true },
                    { day: "Domingos", hours: "Cerrado", active: false },
                  ].map(({ day, hours, active }, idx) => (
                    <div key={day}>
                      {idx > 0 && <div style={{ height: 1, background: "#ebebE6", marginBottom: 9 }} />}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, color: active ? "#374151" : "#9ca3af" }}>{day}</span>
                        <span style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, fontWeight: active ? 600 : 500, color: active ? "#0d1a0d" : "#9ca3af" }}>{hours}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div className="anim-up delay-2" style={{ background: "#F7F8F5", borderRadius: 16, padding: 36, border: "1.5px solid #ebebE6" }}>
              <h3 style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 20, fontWeight: 700, color: "#0d1a0d", marginBottom: 24 }}>Envíanos tu consulta</h3>

              {status === "success" ? (
                <div style={{ textAlign: "center", padding: "48px 16px" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#edf7ed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <span style={{ color: "#2d7a2d" }}><IcoCheck size={32} /></span>
                  </div>
                  <div style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 20, fontWeight: 700, color: "#0d1a0d", marginBottom: 8 }}>¡Mensaje enviado!</div>
                  <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, fontWeight: 300, color: "#6b7280", lineHeight: 1.7 }}>Te contactaremos a la brevedad. También puedes escribirnos directo por WhatsApp.</p>
                  <button onClick={() => setStatus("idle")} style={{ marginTop: 20, fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, fontWeight: 600, color: "#2d7a2d", background: "none", border: "none", cursor: "pointer" }}>Enviar otra consulta</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nombre *</label>
                      <input type="text" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Tu nombre" className={inp} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Teléfono</label>
                      <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+56 9 XXXX XXXX" className={inp} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email *</label>
                    <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="tu@email.com" className={inp} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Vehículo <span style={{ fontWeight: 400, color: "#9ca3af" }}>(opcional)</span></label>
                    <input type="text" value={form.vehiculo} onChange={e => setForm(f => ({ ...f, vehiculo: e.target.value }))} placeholder="Ej: Toyota Hilux 2020 · PATENTE" className={inp} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Mensaje *</label>
                    <textarea required rows={4} value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))} placeholder="¿En qué podemos ayudarte?" className={inp + " resize-none"} style={{ fontFamily: "var(--font-barlow), sans-serif" }} />
                  </div>

                  {status === "error" && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, color: "#dc2626" }}>
                      Error al enviar. Por favor inténtalo de nuevo o escríbenos por WhatsApp.
                    </div>
                  )}

                  <button type="submit" disabled={status === "submitting"} style={{ padding: 14, background: "#2d7a2d", color: "#fff", border: "none", borderRadius: 10, fontFamily: "var(--font-barlow), sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em" }}>
                    {status === "submitting" ? "Enviando..." : "Enviar consulta"}
                  </button>
                  <p style={{ textAlign: "center", fontFamily: "var(--font-barlow), sans-serif", fontSize: 12, color: "#9ca3af", marginTop: -4 }}>
                    O escríbenos directo:{" "}
                    <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#25D366", fontWeight: 600, textDecoration: "none" }}>WhatsApp</a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{ background: "#070E07", padding: "72px 0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
          <div className="footer-grid" style={{ marginBottom: 48 }}>
            <div>
              <Image src="/alelogo.png" alt="Aledalbertz AE Automotive" width={150} height={60} style={{ height: 48, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: 16, display: "block" }} />
              <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, fontWeight: 300, color: "rgba(255,255,255,0.4)", lineHeight: 1.8, maxWidth: 280, marginBottom: 20 }}>
                Taller mecánico profesional especializado en inspecciones, reparaciones y mantención vehicular en San Ramón, Santiago.
              </p>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#25D366", color: "#fff", padding: "10px 18px", borderRadius: 8, fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                <IcoWA size={16} /> WhatsApp
              </a>
            </div>
            <div>
              <h4 style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>Servicios</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Inspección Mecánica", "Diagnóstico Electrónico", "Mantención Preventiva", "Presupuestos", "Venta de Repuestos", "Reparación General"].map(s => (
                  <span key={s} style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>Contacto</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: "#52c752", flexShrink: 0, marginTop: 2 }}><IcoPin /></span>
                  <span style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{ADDRESS}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#52c752" }}><IcoPhone /></span>
                  <a href={`tel:${PHONE.replace(/\s/g, "")}`} style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>{PHONE}</a>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: "#52c752", flexShrink: 0, marginTop: 2 }}><IcoClock /></span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Lun–Vie: 08:30–18:30</span>
                    <span style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Sáb: 09:00–13:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 12, color: "rgba(255,255,255,0.22)" }}>© {new Date().getFullYear()} Aledalbertz AE Automotive. Todos los derechos reservados.</p>
            <Link href="/login" style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: 12, color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>Acceso al Sistema de Inspecciones →</Link>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="wa-pulse" aria-label="WhatsApp" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, width: 58, height: 58, background: "#25D366", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", textDecoration: "none" }}>
        <IcoWA size={28} />
      </a>

      {/* Responsive grid styles */}
      <style>{`
        .hero-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .hero-deco-wrap { display: flex; justify-content: center; align-items: center; }
        .svc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .proc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
        .footer-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 48px; }
        .section-title { font-family: var(--font-barlow-condensed), sans-serif; font-size: clamp(34px,4.5vw,52px); font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; margin-bottom: 12px; }
        .section-title.dark { color: #0d1a0d; }
        .section-title.light { color: #fff; }
        .section-sub { font-family: var(--font-barlow), sans-serif; font-size: 16px; font-weight: 300; color: #6b7280; max-width: 500px; margin: 0 auto; line-height: 1.75; }
        @media (max-width: 960px) {
          .proc-grid { grid-template-columns: repeat(2, 1fr); }
          .why-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .hero-layout { grid-template-columns: 1fr; }
          .hero-deco-wrap { display: none; }
          .svc-grid { grid-template-columns: repeat(2, 1fr); }
          .contact-grid { grid-template-columns: 1fr; }
          .testi-grid { grid-template-columns: 1fr; }
          .md\\:flex { display: none !important; }
          .md\\:hidden { display: flex !important; }
        }
        @media (min-width: 769px) {
          .md\\:flex { display: flex !important; }
          .md\\:hidden { display: none !important; }
        }
        @media (max-width: 520px) {
          .svc-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .proc-grid { grid-template-columns: 1fr; }
          .why-grid { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

// ── Reusable section badge ─────────────────────────────────────────────────────
function SectionBadge({ children, light, dark }: { children: string; light?: boolean; dark?: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      fontFamily: "var(--font-barlow), sans-serif",
      fontSize: 12, fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: light ? "#2d7a2d" : "#52c752",
      background: light ? "rgba(45,122,45,0.1)" : "rgba(82,199,82,0.12)",
      padding: "5px 14px", borderRadius: 100, marginBottom: 14,
    }}>
      {children}
    </span>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────────
const svcIcon = (d: string, extra?: string) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />{extra && <path d={extra} />}
  </svg>
)

const SERVICES = [
  { num: "01", bg: "/inspeccionmecanica.png", title: "Inspección Mecánica", desc: "Revisión integral con más de 90 ítems. Informe técnico con calificación /7.0 y evidencia fotográfica.", icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg> },
  { num: "02", bg: "/presupuestodetallado.png", title: "Presupuestos Detallados", desc: "Cotizaciones con 3 opciones de repuesto: Genuino, Korea y Multi-origen. Sin cargos ocultos.", icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
  { num: "03", bg: "/diagnosticoelectronico.png", title: "Diagnóstico Electrónico", desc: "Lectura OBD2, análisis de sensores y diagnóstico computarizado de sistemas modernos.", icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg> },
  { num: "04", bg: "/mantencionpreventiva.png", title: "Mantención Preventiva", desc: "Cambio de aceite, filtros, frenos, suspensión y todos los servicios del fabricante.", icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
  { num: "05", bg: "/repuestoseinsumos.png", title: "Repuestos e Insumos", desc: "Venta de repuestos y accesorios con asesoría técnica para elegir el componente correcto.", icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg> },
  { num: "06", bg: "/reparaciongeneral.png", title: "Reparación General", desc: "Motor, transmisión, frenos, suspensión y dirección. Trabajos con garantía por escrito.", icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg> },
]

const procIcoStyle = { fill: "none", stroke: "#52c752", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
const PROCESS_STEPS = [
  { step: "01", title: "Agenda tu cita", desc: "Llámanos o escríbenos por WhatsApp. Coordina la hora que mejor te acomode.", icon: <svg width="34" height="34" viewBox="0 0 24 24" {...procIcoStyle}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.4a16 16 0 0 0 6.29 6.29l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg> },
  { step: "02", title: "Trae tu vehículo", desc: "Recepcionamos tu auto y registramos los síntomas o problemas que hayas notado.", icon: <svg width="34" height="34" viewBox="0 0 24 24" {...procIcoStyle}><rect x="1" y="3" width="15" height="13" rx="2" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg> },
  { step: "03", title: "Diagnóstico y presupuesto", desc: "Inspeccionamos en profundidad y te enviamos 3 opciones de presupuesto por WhatsApp.", icon: <svg width="34" height="34" viewBox="0 0 24 24" {...procIcoStyle}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
  { step: "04", title: "Entrega con garantía", desc: "Retira tu vehículo listo. Todos los trabajos incluyen garantía escrita del servicio.", icon: <svg width="34" height="34" viewBox="0 0 24 24" {...procIcoStyle}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg> },
]

const WHY_CARDS = [
  {
    title: "Diagnóstico preciso",
    desc: "Equipos de diagnóstico electrónico de última generación para detectar fallas con exactitud, ahorrándote tiempo y dinero.",
    points: ["Scanner OBD2 profesional", "Análisis de +90 ítems", "Informe fotográfico completo"],
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>,
  },
  {
    title: "Transparencia total",
    desc: "Sin letras chicas. Te explicamos qué necesita tu vehículo y cuánto cuesta antes de comenzar cualquier trabajo.",
    points: ["Presupuesto detallado previo", "3 opciones de repuesto", "Sin cargos ocultos"],
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  },
  {
    title: "Tecnología moderna",
    desc: "Sistema digital de inspecciones con entrega inmediata de informes por WhatsApp. Historial completo en línea.",
    points: ["Informes en tiempo real", "Historial digital del vehículo", "Seguimiento por WhatsApp"],
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>,
  },
]

const TESTIMONIALS = [
  { quote: "Llevé mi Hilux antes de comprarla. El informe con fotos fue clave — me salvó de adquirir un vehículo con fallas serias. Muy profesionales y transparentes.", name: "Carlos M.", vehicle: "Toyota Hilux 2018", initials: "CM" },
  { quote: "Llevo 3 años trayendo mis autos acá. Me explican bien qué tiene el vehículo y dan opciones de presupuesto reales. Sin sorpresas al momento de pagar.", name: "Ana P.", vehicle: "Suzuki Grand Vitara", initials: "AP" },
  { quote: "El sistema digital de inspección es increíble. Recibí el informe con fotos por WhatsApp mientras revisaban el auto. Muy diferente a cualquier taller convencional.", name: "Roberto F.", vehicle: "Honda CR-V 2020", initials: "RF" },
]
