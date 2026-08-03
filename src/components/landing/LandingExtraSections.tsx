"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Target,
  Eye,
  Heart,
  Users,
  Briefcase,
  ClipboardList,
  UserCheck,
  FileSearch,
  Handshake,
  GraduationCap,
  Building2,
} from "lucide-react";
import { LANDING_IMAGES, LANDING_IMAGE_PLACEHOLDER, TRUST_LOGOS } from "./landing-images";

function SectionImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <div className={`hl-media-frame ${className}`}>
      <Image
        src={imgSrc}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="hl-media-img"
        priority={priority}
        onError={() => setImgSrc(LANDING_IMAGE_PLACEHOLDER)}
      />
    </div>
  );
}

export function LandingGalleryStrip() {
  const imgs = [
    LANDING_IMAGES.rhTeam,
    LANDING_IMAGES.officeModern,
    LANDING_IMAGES.teamwork,
    LANDING_IMAGES.meeting,
  ];
  return (
    <section className="hl-section hl-section-alt hl-gallery-strip" aria-label="Galería corporativa">
      <div className="hl-container hl-gallery-grid">
        {imgs.map((src, i) => (
          <SectionImage key={src} src={src} alt={`Ambiente corporativo ${i + 1}`} />
        ))}
      </div>
    </section>
  );
}

export function LandingMissionVision() {
  return (
    <>
      <section id="mision" className="hl-section">
        <div className="hl-container hl-split">
          <SectionImage src={LANDING_IMAGES.corporate} alt="Oficinas corporativas HumanLink" />
          <div>
            <h2 className="hl-split-title">Nuestra misión</h2>
            <p className="hl-split-text">
              Acompañar a las organizaciones en la gestión integral del talento humano, con procesos transparentes,
              tecnología confiable y un trato cercano a cada colaborador y candidato.
            </p>
          </div>
        </div>
      </section>
      <section id="vision" className="hl-section hl-section-alt">
        <div className="hl-container hl-split hl-split--reverse">
          <SectionImage src={LANDING_IMAGES.techOffice} alt="Tecnología empresarial" />
          <div>
            <h2 className="hl-split-title">Nuestra visión</h2>
            <p className="hl-split-text">
              Ser el aliado preferido en Recursos Humanos para empresas que buscan crecer con equipos motivados,
              capacitados y alineados a su cultura organizacional.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

const VALORES = [
  { icon: Heart, title: "Respeto", text: "Trato digno en cada etapa del ciclo laboral." },
  { icon: Target, title: "Excelencia", text: "Mejora continua en procesos y servicios." },
  { icon: Eye, title: "Transparencia", text: "Comunicación clara con candidatos y colaboradores." },
  { icon: Users, title: "Colaboración", text: "Trabajo en equipo entre áreas y líderes." },
];

export function LandingValoresSection() {
  return (
    <section id="valores" className="hl-section">
      <div className="hl-container">
        <div className="hl-section-head">
          <h2>Valores</h2>
          <p>Principios que guían nuestra cultura y nuestra relación contigo.</p>
        </div>
        <div className="hl-cards-grid">
          {VALORES.map(({ icon: Icon, title, text }) => (
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
  );
}

const PROCESO = [
  { icon: FileSearch, title: "Explora vacantes", text: "Consulta filtros y encuentra el puesto ideal." },
  { icon: ClipboardList, title: "Postúlate", text: "Envía tu información y currículum en línea." },
  { icon: UserCheck, title: "Entrevista", text: "Conoce al equipo de selección y la vacante." },
  { icon: Handshake, title: "Integración", text: "Recibe indicaciones para tu ingreso y capacitación inicial." },
];

export function LandingProcesoContratacion() {
  return (
    <section id="proceso" className="hl-section hl-section-alt">
      <div className="hl-container">
        <div className="hl-section-head">
          <h2>Nuestro proceso de contratación</h2>
          <p>Un recorrido claro, humano y eficiente de principio a fin.</p>
        </div>
        <div className="hl-container hl-split mb-8">
          <SectionImage src={LANDING_IMAGES.interview} alt="Entrevista de trabajo" />
          <SectionImage src={LANDING_IMAGES.handshake} alt="Cierre de contratación" />
        </div>
        <div className="hl-cards-grid">
          {PROCESO.map(({ icon: Icon, title, text }) => (
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
  );
}

const RH_SERVICES = [
  { icon: Briefcase, title: "Reclutamiento y selección", text: "Atracción de talento alineado a cada vacante." },
  { icon: Users, title: "Administración de personal", text: "Expedientes, altas, movimientos y documentación." },
  { icon: GraduationCap, title: "Capacitación", text: "Programas de formación y desarrollo continuo." },
  { icon: Building2, title: "Cultura organizacional", text: "Eventos, comunicación interna y clima laboral." },
];

export function LandingRhServices() {
  return (
    <section id="rh-servicios" className="hl-section">
      <div className="hl-container hl-split">
        <div>
          <div className="hl-section-head" style={{ textAlign: "left", margin: "0 0 1.5rem" }}>
            <h2>Servicios del departamento de Recursos Humanos</h2>
            <p>Soporte especializado para líderes, colaboradores y candidatos.</p>
          </div>
          <div className="hl-cards-grid hl-cards-grid--stack">
            {RH_SERVICES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="hl-card hl-card--horizontal">
                <div className="hl-card-icon">
                  <Icon size={22} />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <SectionImage src={LANDING_IMAGES.adminDesk} alt="Personal administrativo" />
      </div>
    </section>
  );
}

export function LandingTrustSection() {
  return (
    <section id="confian" className="hl-section hl-section-alt">
      <div className="hl-container">
        <div className="hl-section-head">
          <h2>Empresas que confían en nosotros</h2>
          <p>Organizaciones de distintos sectores colaboran con nuestro modelo de gestión de talento.</p>
        </div>
        <div className="hl-trust-grid">
          {TRUST_LOGOS.map((c) => (
            <div key={c.name} className="hl-trust-logo" title={c.name}>
              <span>{c.initial}</span>
              <small>{c.name}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingCultureImages() {
  return (
    <section className="hl-section">
      <div className="hl-container hl-culture-grid">
        <SectionImage src={LANDING_IMAGES.training} alt="Capacitación laboral" />
        <SectionImage src={LANDING_IMAGES.laptopWork} alt="Personas trabajando en computadoras" />
        <SectionImage src={LANDING_IMAGES.diversity} alt="Trabajo en equipo diverso" />
      </div>
    </section>
  );
}

export type LandingLiveStats = {
  vacantes: number;
  empleados: number;
  contrataciones: number;
  capacitaciones: number;
};

export function LandingLiveStatsSection({ stats }: { stats: LandingLiveStats }) {
  const cards = [
    { label: "Empleados activos", value: stats.empleados, icon: Users },
    { label: "Vacantes disponibles", value: stats.vacantes, icon: Briefcase },
    { label: "Contrataciones realizadas", value: stats.contrataciones, icon: UserCheck },
    { label: "Capacitaciones impartidas", value: stats.capacitaciones, icon: GraduationCap },
  ];
  return (
    <section id="estadisticas" className="hl-section hl-section-alt">
      <div className="hl-container">
        <div className="hl-section-head">
          <h2>Nuestros números</h2>
          <p>Indicadores que reflejan nuestro compromiso con el talento.</p>
        </div>
        <div className="hl-stats-cards">
          {cards.map(({ label, value, icon: Icon }) => (
            <article key={label} className="hl-card hl-stat-card">
              <div className="hl-card-icon">
                <Icon size={22} />
              </div>
              <div className="hl-stat-card-value">{value}+</div>
              <p>{label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
