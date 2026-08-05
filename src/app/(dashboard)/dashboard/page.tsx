"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Briefcase, Network, Clock, AlertCircle, FileText,
  Bell, Shield, ArrowUpRight,
} from "lucide-react";
import { fetchJson, fetchList } from "@/lib/fetch-client";
import PageHeader from "@/components/ui/PageHeader";

type Resumen = Record<string, number | string | null>;
type DeptoRow = { departamento: string; organizacion: string; empleados: number };
type Notif = { id: number; titulo: string; mensaje: string; leida: boolean; createdAt: string };

const ICONS: Record<string, React.ElementType> = {
  empleadosActivos: Users,
  solicitudesPendientes: AlertCircle,
  quejasAbiertas: Shield,
  vacantesAbiertas: Briefcase,
  notificacionesNoLeidas: Bell,
  equipoPendientes: AlertCircle,
  asistenciasHoy: Clock,
  evaluacionesPendientes: FileText,
  tamanoEquipo: Users,
  proximoEvento: Network,
};

const HREFS: Record<string, string> = {
  empleadosActivos: "/empleados",
  solicitudesPendientes: "/solicitudes",
  quejasAbiertas: "/quejas",
  vacantesAbiertas: "/vacantes",
  notificacionesNoLeidas: "/notificaciones",
  equipoPendientes: "/solicitudes",
  asistenciasHoy: "/asistencias",
  evaluacionesPendientes: "/evaluaciones",
  tamanoEquipo: "/empleados",
  proximoEvento: "/eventos",
};

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"];

const LABELS: Record<string, string> = {
  empleadosActivos: "Empleados activos",
  solicitudesPendientes: "Solicitudes pendientes",
  quejasAbiertas: "Quejas abiertas",
  vacantesAbiertas: "Vacantes abiertas",
  notificacionesNoLeidas: "Notificaciones",
  equipoPendientes: "Aprobaciones pendientes",
  asistenciasHoy: "Asistencias hoy",
  evaluacionesPendientes: "Evaluaciones del equipo",
  tamanoEquipo: "Tamaño del equipo",
  proximoEvento: "Próximo evento",
};

function KpiCard({ k, value, i }: { k: string; value: number | string | null; i: number }) {
  const Icon = ICONS[k] || Network;
  const color = COLORS[i % COLORS.length];
  return (
    <Link
      href={HREFS[k] || "/dashboard"}
      className="group rounded-xl p-4 min-h-[7.5rem] flex flex-col transition-colors"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}1f` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <ArrowUpRight size={16} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-auto">
        <p className="text-2xl font-bold leading-none">{value ?? "—"}</p>
        <p className="text-xs text-muted mt-1.5">{LABELS[k] || k}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [rol, setRol] = useState("");
  const [nombre, setNombre] = useState("");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [deptos, setDeptos] = useState<DeptoRow[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const isAdmin = rol === "Administrador" || rol === "Recursos Humanos";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        setRol(me.rol || "");
        if (me.empleado) setNombre(`${me.empleado.nombre} ${me.empleado.apellidoPaterno}`);
        const puedeReportes =
          me.rol === "Administrador" ||
          me.rol === "Recursos Humanos" ||
          me.rol === "Supervisor";
        if (puedeReportes) {
          fetchJson<{ empleadosPorDepto: DeptoRow[] }>("/api/reportes").then(({ data }) => {
            if (data?.empleadosPorDepto) setDeptos(data.empleadosPorDepto);
          });
        }
      });
    fetchJson<{ resumen: Resumen }>("/api/dashboard").then(({ data }) => {
      if (data?.resumen) setResumen(data.resumen);
    });
    fetchList<Notif>("/api/notificaciones").then((n) => setNotifs(n.slice(0, 6)));
  }, []);

  const isEmpleado = rol === "Empleado";
  const hoy = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const kpis = resumen ? Object.entries(resumen) : [];
  const maxDepto = Math.max(...deptos.map((d) => d.empleados), 1);

  const accesos = isEmpleado
    ? [
        ["/solicitudes", "Pedir permiso"],
        ["/vacaciones", "Mis vacaciones"],
        ["/capacitaciones", "Capacitaciones"],
        ["/eventos", "Eventos"],
        ["/quejas", "Quejas"],
        ["/perfil", "Mi perfil"],
      ]
    : rol === "Supervisor"
      ? [
          ["/solicitudes", "Aprobar"],
          ["/asistencias", "Asistencias"],
          ["/evaluaciones", "Evaluar"],
          ["/reportes", "Reportes"],
        ]
      : [
          ["/empleados", "Empleados"],
          ["/reportes", "Reportes"],
          ["/vacantes", "Vacantes"],
          ["/turnos", "Turnos"],
        ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted capitalize mb-1">{hoy}</p>
        <PageHeader
          title={nombre ? `Bienvenido, ${nombre.split(" ")[0]}` : "Inicio"}
          subtitle={
            isEmpleado
              ? "Consulta tu información, solicitudes y actividades del día"
              : rol === "Supervisor"
                ? "Supervisión de equipo, aprobaciones y evaluaciones"
                : "Resumen operativo de recursos humanos"
          }
          actions={
            <Link href={isEmpleado ? "/perfil" : "/reportes"} className="btn-primary text-sm">
              {isEmpleado ? "Ver mi perfil" : "Ver reportes"}
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpis.map(([k, v], i) => (
          <KpiCard key={k} k={k} value={v} i={i} />
        ))}
        {kpis.length === 0 && <p className="text-muted text-sm col-span-full">Cargando indicadores...</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{deptos.length ? "Empleados por departamento" : "Resumen"}</h2>
            {isAdmin && deptos.length > 0 && (
              <Link href="/reportes" className="text-xs hover:underline" style={{ color: "var(--color-primary-light)" }}>
                Ir a reportes →
              </Link>
            )}
          </div>
          {deptos.length > 0 ? (
            <div className="space-y-2.5">
              {deptos.slice(0, 9).map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-36 text-sm truncate text-muted" title={`${d.organizacion} · ${d.departamento}`}>
                    {d.departamento}
                  </div>
                  <div className="flex-1 rounded-full h-6 overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                    <div
                      className="h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                      style={{
                        width: `${Math.max((d.empleados / maxDepto) * 100, 10)}%`,
                        background: COLORS[i % COLORS.length],
                      }}
                    >
                      {d.empleados}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {accesos.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.16)" }}>
                    <ArrowUpRight size={16} style={{ color: "var(--color-primary-light)" }} />
                  </div>
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {isAdmin && (
            <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <h2 className="font-semibold mb-3">Reportes administrativos</h2>
              <p className="text-sm text-muted mb-3">Exporta indicadores y listados del personal.</p>
              <Link href="/reportes" className="btn-primary text-sm inline-block w-full text-center">
                Abrir reportes
              </Link>
            </div>
          )}

          <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h2 className="font-semibold mb-3">Accesos rápidos</h2>
            <div className="flex flex-wrap gap-2">
              {accesos.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: "rgba(59,130,246,0.14)", color: "var(--color-primary-light)" }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Actividad reciente</h2>
              <Link href="/notificaciones" className="text-xs hover:underline" style={{ color: "var(--color-primary-light)" }}>
                Ver todo
              </Link>
            </div>
            <div className="space-y-3">
              {notifs.map((n) => (
                <div key={n.id} className="flex gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: n.leida ? "var(--color-border)" : "var(--color-primary)" }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{n.titulo}</p>
                    <p className="text-xs text-muted truncate">{n.mensaje}</p>
                  </div>
                </div>
              ))}
              {notifs.length === 0 && <p className="text-sm text-muted">Sin actividad reciente</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
