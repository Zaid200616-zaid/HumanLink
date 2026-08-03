"use client";

import "@/app/landing.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Target,
  Eye,
  Heart,
  Award,
  Briefcase,
  FileText,
  GraduationCap,
  ClipboardCheck,
  Clock,
  BarChart3,
  FolderOpen,
  UserPlus,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Facebook,
  Instagram,
} from "lucide-react";
import PostularModal, { type VacantePublica } from "./PostularModal";
import {
  LandingCultureImages,
  LandingGalleryStrip,
  LandingLiveStatsSection,
  LandingMissionVision,
  LandingProcesoContratacion,
  LandingRhServices,
  LandingTrustSection,
  LandingValoresSection,
  type LandingLiveStats,
} from "./LandingExtraSections";
import HumanLinkLogo from "./HumanLinkLogo";
import { LANDING_IMAGES, LANDING_IMAGE_PLACEHOLDER, TESTIMONIAL_AVATARS } from "./landing-images";
import Image from "next/image";
import { useCountUp } from "./useCountUp";

const NAV = [
  { href: "#inicio", label: "Inicio" },
  { href: "#nosotros", label: "Nosotros" },
  { href: "#servicios", label: "Servicios" },
  { href: "#vacantes", label: "Vacantes" },
  { href: "#beneficios", label: "Beneficios" },
  { href: "#contacto", label: "Contacto" },
];

const ABOUT = [
  { icon: Target, title: "Misión", text: "Impulsar la gestión del talento con tecnología segura que conecta personas, procesos y decisiones en un solo ecosistema." },
  { icon: Eye, title: "Visión", text: "Ser la plataforma de referencia en administración de capital humano para organizaciones que buscan excelencia operativa." },
  { icon: Heart, title: "Valores", text: "Integridad, confidencialidad, innovación y un trato humano en cada interacción con nuestro equipo y candidatos." },
  { icon: Award, title: "Compromiso", text: "Acompañamos a Recursos Humanos con herramientas alineadas a normativa, trazabilidad y mejora continua." },
  { icon: Users, title: "Experiencia", text: "Diseñado por especialistas en procesos de contratación, capacitación, asistencia y cultura organizacional." },
];

const SERVICES = [
  { icon: Users, title: "Administración de empleados", text: "Expedientes centralizados, datos actualizados y control por departamento." },
  { icon: Briefcase, title: "Gestión de vacantes", text: "Publicación clara de oportunidades laborales y seguimiento oportuno de cada proceso de selección." },
  { icon: UserPlus, title: "Reclutamiento", text: "Acompañamiento del candidato desde la postulación hasta la integración a la empresa." },
  { icon: FolderOpen, title: "Expedientes digitales", text: "Documentación organizada, segura y accesible para el equipo autorizado." },
  { icon: GraduationCap, title: "Capacitaciones", text: "Programación, confirmación y seguimiento de formación del personal." },
  { icon: ClipboardCheck, title: "Evaluaciones", text: "Ciclos de desempeño estructurados y reportables." },
  { icon: Clock, title: "Asistencias", text: "Registro y consulta de asistencia con visibilidad para supervisión." },
  { icon: Clock, title: "Turnos", text: "Planeación de horarios y cobertura operativa." },
  { icon: BarChart3, title: "Reportes", text: "Indicadores exportables para decisiones basadas en datos." },
  { icon: FileText, title: "Documentación", text: "Políticas, formatos y comunicados institucionales." },
];

const BENEFITS = [
  { title: "Crecimiento profesional", text: "Rutas de desarrollo claras dentro de la organización." },
  { title: "Capacitación constante", text: "Programas de formación alineados a tu rol." },
  { title: "Buen ambiente laboral", text: "Cultura de respeto, colaboración y reconocimiento." },
  { title: "Prestaciones", text: "Paquete competitivo acorde a la política de la empresa." },
  { title: "Desarrollo profesional", text: "Mentoría y evaluaciones periódicas de desempeño." },
  { title: "Trabajo en equipo", text: "Proyectos multidisciplinarios con impacto real." },
];

const TESTIMONIALS = [
  { name: "María González", role: "Analista de RH", quote: "HumanLink nos ayudó a centralizar vacantes y candidatos. Hoy respondemos más rápido y con mejor orden.", photo: TESTIMONIAL_AVATARS.maria },
  { name: "Carlos Ruiz", role: "Supervisor de Operaciones", quote: "La visibilidad de asistencias y turnos mejoró la coordinación del equipo sin hojas de cálculo.", photo: TESTIMONIAL_AVATARS.carlos },
  { name: "Laura Méndez", role: "Candidata", quote: "Postulé en minutos sin crear cuenta. El proceso fue claro y recibí respuesta del equipo de RH.", photo: TESTIMONIAL_AVATARS.laura },
];

const FAQ = [
  { q: "¿Cómo puedo postularme?", a: "En la sección Bolsa de Trabajo elija una vacante, revise los detalles y pulse Postularme. Complete el formulario y adjunte su CV en PDF." },
  { q: "¿Cuánto tarda el proceso?", a: "Depende de la vacante; en promedio Recursos Humanos contacta a candidatos preseleccionados en 5 a 15 días hábiles." },
  { q: "¿Necesito crear una cuenta?", a: "No. La postulación pública no requiere registro. Solo el personal interno utiliza inicio de sesión." },
  { q: "¿Cómo sé si fui seleccionado?", a: "Recibirá comunicación por correo o teléfono desde el equipo de contratación. También puede consultar el estado si RH lo indica." },
];

function StatItem({ target, label, suffix = "" }: { target: number; label: string; suffix?: string }) {
  const { ref, display } = useCountUp(target, 1800, suffix);
  return (
    <div className="hl-stat" ref={ref}>
      <div className="hl-stat-value">{display}</div>
      <div className="hl-stat-label">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const [navSolid, setNavSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [vacantes, setVacantes] = useState<VacantePublica[]>([]);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [tipo, setTipo] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [salario, setSalario] = useState("");
  const [detail, setDetail] = useState<VacantePublica | null>(null);
  const [postular, setPostular] = useState<VacantePublica | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [heroSrc, setHeroSrc] = useState<string>(LANDING_IMAGES.heroCorporate);
  const [testimonialPhoto, setTestimonialPhoto] = useState<string>(TESTIMONIALS[0].photo);
  const [contact, setContact] = useState({ nombre: "", email: "", asunto: "", mensaje: "" });
  const [contactMsg, setContactMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [liveStats, setLiveStats] = useState<LandingLiveStats>({
    empleados: 120,
    vacantes: 8,
    contrataciones: 45,
    capacitaciones: 30,
  });

  useEffect(() => {
    fetch("/api/public/estadisticas")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.empleados === "number") {
          setLiveStats({
            empleados: data.empleados,
            vacantes: data.vacantes,
            contrataciones: data.contrataciones,
            capacitaciones: data.capacitaciones,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTestimonialPhoto(TESTIMONIALS[testimonialIdx].photo);
  }, [testimonialIdx]);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/public/vacantes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setVacantes(data);
      })
      .catch(() => setVacantes([]));
  }, []);

  const departamentos = useMemo(
    () => [...new Set(vacantes.map((v) => v.departamento))].sort(),
    [vacantes]
  );
  const tipos = useMemo(() => [...new Set(vacantes.map((v) => v.tipoEmpleo))].sort(), [vacantes]);
  const modalidades = useMemo(() => [...new Set(vacantes.map((v) => v.modalidad))].sort(), [vacantes]);
  const ubicaciones = useMemo(() => [...new Set(vacantes.map((v) => v.ubicacion))].sort(), [vacantes]);
  const salarios = useMemo(() => [...new Set(vacantes.map((v) => v.salario))].sort(), [vacantes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vacantes.filter((v) => {
      if (dept && v.departamento !== dept) return false;
      if (tipo && v.tipoEmpleo !== tipo) return false;
      if (modalidad && v.modalidad !== modalidad) return false;
      if (ubicacion && v.ubicacion !== ubicacion) return false;
      if (salario && v.salario !== salario) return false;
      if (!q) return true;
      return (
        v.titulo.toLowerCase().includes(q) ||
        v.descripcion.toLowerCase().includes(q) ||
        v.departamento.toLowerCase().includes(q)
      );
    });
  }, [vacantes, search, dept, tipo, modalidad, ubicacion, salario]);

  const navClick = useCallback(() => setMenuOpen(false), []);

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    setContactMsg(null);
    const res = await fetch("/api/public/contacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    const data = await res.json();
    if (!res.ok) {
      setContactMsg({ type: "err", text: data.error || "Error al enviar" });
      return;
    }
    setContactMsg({ type: "ok", text: "Mensaje recibido. Nos comunicaremos pronto." });
    setContact({ nombre: "", email: "", asunto: "", mensaje: "" });
  }

  return (
    <div className="landing-root">
      <header className={`hl-nav ${navSolid ? "hl-nav--solid" : ""}`}>
        <div className="hl-container hl-nav-inner">
          <Link href="#inicio" className="hl-nav-logo" onClick={navClick}>
            <HumanLinkLogo />
          </Link>
          <ul className="hl-nav-links">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href}>{n.label}</a>
              </li>
            ))}
            <li>
              <Link href="/login" className="hl-btn hl-btn-primary">
                Iniciar Sesión
              </Link>
            </li>
          </ul>
          <button type="button" className="hl-nav-toggle" onClick={() => setMenuOpen((o) => !o)} aria-label="Menú">
            <Menu size={26} />
          </button>
        </div>
        <div className={`hl-container hl-nav-mobile ${menuOpen ? "open" : ""}`}>
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={navClick}>
              {n.label}
            </a>
          ))}
          <Link href="/login" className="hl-btn hl-btn-primary" onClick={navClick}>
            Iniciar Sesión
          </Link>
        </div>
      </header>

      <section id="inicio" className="hl-hero">
        <div className="hl-container hl-hero-grid">
          <div>
            <HumanLinkLogo />
            <p className="hl-hero-sub">
              Plataforma Web Orientada a Servicios para la Gestión Inteligente del Talento Humano.
            </p>
            <p>
              Conectamos talento y oportunidades con procesos claros, seguros y cercanos. Explora nuestras vacantes,
              postúlate en minutos y forma parte de un equipo que apuesta por las personas.
            </p>
            <div className="hl-hero-actions">
              <a href="#vacantes" className="hl-btn hl-btn-primary">
                Ver Vacantes
              </a>
              <Link href="/login" className="hl-btn hl-btn-outline">
                Iniciar Sesión
              </Link>
            </div>
          </div>
          <div className="hl-hero-visual">
            <Image
              src={heroSrc}
              alt="Equipo profesional colaborando en entorno corporativo"
              fill
              sizes="(max-width: 900px) 100vw, 45vw"
              className="hl-hero-photo"
              priority
              onError={() => setHeroSrc(LANDING_IMAGE_PLACEHOLDER)}
            />
          </div>
        </div>
      </section>

      <LandingGalleryStrip />

      <section id="nosotros" className="hl-section">
        <div className="hl-container">
          <div className="hl-section-head">
            <h2>¿Quiénes somos?</h2>
            <p>HumanLink integra reclutamiento, desarrollo y cultura organizacional en una experiencia clara para candidatos y colaboradores.</p>
          </div>
          <div className="hl-cards-grid">
            {ABOUT.map(({ icon: Icon, title, text }) => (
              <article key={title} className="hl-card">
                <div className="hl-card-icon">
                  <Icon size={24} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LandingMissionVision />
      <LandingValoresSection />

      <section id="servicios" className="hl-section hl-section-alt">
        <div className="hl-container">
          <div className="hl-section-head">
            <h2>Servicios</h2>
            <p>Soluciones integrales para atraer, desarrollar y retener talento en cada etapa del ciclo laboral.</p>
          </div>
          <div className="hl-cards-grid">
            {SERVICES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="hl-card">
                <div className="hl-card-icon">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LandingRhServices />
      <LandingProcesoContratacion />
      <LandingLiveStatsSection stats={liveStats} />

      <section id="por-que" className="hl-stats">
        <div className="hl-container">
          <div className="hl-section-head" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ color: "#fff" }}>¿Por qué HumanLink?</h2>
            <p style={{ color: "rgba(255,255,255,0.65)" }}>Indicadores que reflejan confianza en operación y seguridad.</p>
          </div>
          <div className="hl-stats-grid">
            <StatItem target={500} label="Empleados administrados" />
            <StatItem target={120} label="Vacantes gestionadas" />
            <StatItem target={99} label="Disponibilidad" suffix="%" />
            <StatItem target={100} label="Seguridad" suffix="%" />
          </div>
        </div>
      </section>

      <section id="vacantes" className="hl-section">
        <div className="hl-container">
          <div className="hl-section-head">
            <h2>Bolsa de trabajo</h2>
            <p>
              Encuentra la oportunidad ideal para formar parte de nuestro equipo. Explora nuestras vacantes disponibles
              y postúlate de manera rápida y sencilla.
            </p>
          </div>
          <div className="hl-jobs-filters">
            <input
              className="hl-jobs-search"
              placeholder="Buscar por puesto o palabra clave…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">Departamento</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Tipo de empleo</option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
              <option value="">Modalidad</option>
              {modalidades.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select value={ubicacion} onChange={(e) => setUbicacion(e.target.value)}>
              <option value="">Ubicación</option>
              {ubicaciones.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select value={salario} onChange={(e) => setSalario(e.target.value)}>
              <option value="">Salario</option>
              {salarios.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {filtered.length === 0 ? (
            <p style={{ color: "var(--hl-muted)", textAlign: "center" }}>
              No hay vacantes que coincidan con los filtros actuales.
            </p>
          ) : (
            filtered.map((v) => (
              <article key={v.id} className="hl-job-card">
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{v.titulo}</h3>
                <div className="hl-job-meta">
                  <span className="hl-tag">{v.departamento}</span>
                  <span className="hl-tag">{v.modalidad}</span>
                  <span className="hl-tag">{v.tipoEmpleo}</span>
                  <span className="hl-tag">{v.salario}</span>
                </div>
                <p style={{ color: "var(--hl-muted)", margin: 0, fontSize: "0.95rem" }}>
                  {v.descripcion.length > 180 ? `${v.descripcion.slice(0, 180)}…` : v.descripcion}
                </p>
                {v.requisitos && (
                  <p style={{ fontSize: "0.85rem", marginTop: "0.75rem", color: "var(--hl-muted)" }}>
                    <strong>Requisitos:</strong>{" "}
                    {v.requisitos.length > 120 ? `${v.requisitos.slice(0, 120)}…` : v.requisitos}
                  </p>
                )}
                <div className="hl-job-actions">
                  <button type="button" className="hl-btn hl-btn-outline-dark" onClick={() => setDetail(v)}>
                    Ver detalles
                  </button>
                  <button type="button" className="hl-btn hl-btn-primary" onClick={() => setPostular(v)}>
                    Postularme
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {detail && (
        <div className="hl-modal-backdrop" onClick={() => setDetail(null)} role="presentation">
          <div className="hl-modal hl-modal-wrap" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="hl-modal-close" onClick={() => setDetail(null)} aria-label="Cerrar">
              ×
            </button>
            <h3>{detail.titulo}</h3>
            <div className="hl-job-meta">
              <span className="hl-tag">{detail.departamento}</span>
              <span className="hl-tag">{detail.modalidad}</span>
              <span className="hl-tag">{detail.ubicacion}</span>
              <span className="hl-tag">{detail.salario}</span>
            </div>
            <div className="hl-detail-panel">
              <p style={{ margin: "0 0 0.75rem" }}>{detail.descripcion}</p>
              {detail.requisitos && (
                <>
                  <strong>Requisitos</strong>
                  <p style={{ margin: "0.35rem 0 0" }}>{detail.requisitos}</p>
                </>
              )}
            </div>
            <button type="button" className="hl-btn hl-btn-primary" onClick={() => { setPostular(detail); setDetail(null); }}>
              Postularme
            </button>
          </div>
        </div>
      )}

      {postular && <PostularModal vacante={postular} onClose={() => setPostular(null)} />}

      <LandingCultureImages />
      <LandingTrustSection />

      <section id="beneficios" className="hl-section hl-section-alt">
        <div className="hl-container">
          <div className="hl-section-head">
            <h2>Beneficios</h2>
            <p>Lo que ofrecemos a quienes forman parte de nuestro equipo.</p>
          </div>
          <div className="hl-cards-grid">
            {BENEFITS.map((b) => (
              <article key={b.title} className="hl-card">
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonios" className="hl-section">
        <div className="hl-container">
          <div className="hl-section-head">
            <h2>Testimonios</h2>
          </div>
          <div className="hl-testimonial">
            <Image
              src={testimonialPhoto}
              alt={TESTIMONIALS[testimonialIdx].name}
              width={72}
              height={72}
              className="hl-testimonial-avatar"
              onError={() => setTestimonialPhoto(LANDING_IMAGE_PLACEHOLDER)}
            />
            <p style={{ fontSize: "1.05rem", lineHeight: 1.65, margin: "0 0 1rem" }}>
              &ldquo;{TESTIMONIALS[testimonialIdx].quote}&rdquo;
            </p>
            <strong>{TESTIMONIALS[testimonialIdx].name}</strong>
            <div style={{ color: "var(--hl-muted)", fontSize: "0.9rem" }}>{TESTIMONIALS[testimonialIdx].role}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.25rem" }}>
              <button type="button" className="hl-btn hl-btn-outline-dark" onClick={() => setTestimonialIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} aria-label="Anterior">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="hl-btn hl-btn-outline-dark" onClick={() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length)} aria-label="Siguiente">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="hl-section hl-section-alt">
        <div className="hl-container" style={{ maxWidth: 720 }}>
          <div className="hl-section-head">
            <h2>Preguntas frecuentes</h2>
          </div>
          {FAQ.map((item, i) => (
            <div key={item.q} className="hl-faq-item">
              <button type="button" className="hl-faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                {item.q}
                <ChevronDown size={20} style={{ transform: faqOpen === i ? "rotate(180deg)" : undefined, transition: "0.2s" }} />
              </button>
              {faqOpen === i && <div className="hl-faq-a">{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      <section id="contacto" className="hl-section">
        <div className="hl-container">
          <div className="hl-section-head">
            <h2>Contacto</h2>
            <p>Escríbenos o visita nuestras oficinas.</p>
          </div>
          <div className="hl-contact-grid">
            <form onSubmit={submitContact}>
              {contactMsg && (
                <div className={`hl-alert ${contactMsg.type === "ok" ? "hl-alert-success" : "hl-alert-error"}`}>
                  {contactMsg.text}
                </div>
              )}
              <div className="hl-form-field">
                <label>Nombre</label>
                <input value={contact.nombre} onChange={(e) => setContact({ ...contact, nombre: e.target.value })} required />
              </div>
              <div className="hl-form-field">
                <label>Correo</label>
                <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} required />
              </div>
              <div className="hl-form-field">
                <label>Asunto</label>
                <input value={contact.asunto} onChange={(e) => setContact({ ...contact, asunto: e.target.value })} required />
              </div>
              <div className="hl-form-field">
                <label>Mensaje</label>
                <textarea rows={4} value={contact.mensaje} onChange={(e) => setContact({ ...contact, mensaje: e.target.value })} required />
              </div>
              <button type="submit" className="hl-btn hl-btn-primary">
                Enviar mensaje
              </button>
            </form>
            <div>
              <p style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Phone size={18} color="var(--hl-cyan-dim)" /> +52 (55) 1234 5678
              </p>
              <p style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Mail size={18} color="var(--hl-cyan-dim)" /> contacto@humanlink.mx
              </p>
              <p style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                <MapPin size={18} color="var(--hl-cyan-dim)" style={{ flexShrink: 0, marginTop: 2 }} />
                Av. Insurgentes Sur 1234, Col. Del Valle, CDMX
              </p>
              <div className="hl-map-placeholder" style={{ marginTop: "1.5rem" }}>
                <MapPin size={32} /> Mapa simulado · Ciudad de México
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="hl-footer">
        <div className="hl-container">
          <div className="hl-footer-grid">
            <div>
              <HumanLinkLogo />
              <p style={{ fontSize: "0.9rem", margin: 0 }}>Gestión inteligente del talento humano.</p>
            </div>
            <div>
              <strong style={{ color: "#fff", display: "block", marginBottom: "0.5rem" }}>Enlaces</strong>
              {NAV.map((n) => (
                <a key={n.href} href={n.href}>
                  {n.label}
                </a>
              ))}
            </div>
            <div>
              <strong style={{ color: "#fff", display: "block", marginBottom: "0.5rem" }}>Legal</strong>
              <a href="#inicio">Privacidad</a>
              <a href="#inicio">Términos de uso</a>
            </div>
            <div>
              <strong style={{ color: "#fff", display: "block", marginBottom: "0.5rem" }}>Redes</strong>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <a href="#inicio" aria-label="LinkedIn">
                  <Linkedin size={20} />
                </a>
                <a href="#inicio" aria-label="Facebook">
                  <Facebook size={20} />
                </a>
                <a href="#inicio" aria-label="Instagram">
                  <Instagram size={20} />
                </a>
              </div>
            </div>
          </div>
          <div className="hl-footer-bottom">
            <span>© {new Date().getFullYear()} HumanLink. Todos los derechos reservados.</span>
            <Link href="/login" style={{ color: "var(--hl-cyan)" }}>
              Acceso administrativo
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
