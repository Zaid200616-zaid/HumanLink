"use client";

import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react";

interface ExpedienteData {
  empleado: {
    id: number;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno?: string | null;
    numeroEmpleado: string;
    puesto: string;
    fechaIngreso: string;
    fotoUrl?: string | null;
    departamento?: string | null;
    organizacion?: string | null;
  };
  antiguedad: { años: number; meses: number };
  diasAnuales: number;
  diasExtra: number;
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  diasDisponibles: number;
  puedeAutorizar: boolean;
  diasSolicitudActual?: number;
  historialVacaciones: Array<{
    id: number;
    fechaInicio: string;
    fechaFin: string;
    diasSolicitados: number;
    motivo: string;
    estado: string;
    respuesta?: string | null;
  }>;
  historialPermisos: Array<{
    id: number;
    fechaInicio: string;
    fechaFin: string;
    diasSolicitados: number;
    motivo: string;
    estado: string;
  }>;
  resumenAnual: {
    vacacionesAprobadas: number;
    permisosAprobados: number;
    solicitudesPendientes: number;
  };
}

interface Props {
  empleadoId: number;
  solicitudId?: number;
  compact?: boolean;
}

import { resolveEstadoBadge } from "@/lib/estado-badge";

function EstadoBadge({ estado }: { estado: string }) {
  const { label, variant } = resolveEstadoBadge(estado);
  const styles: Record<string, string> = {
    neutral: "bg-[var(--color-surface-3)] text-muted",
    primary: "bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] text-[var(--color-primary-light)]",
    success: "bg-[color-mix(in_srgb,var(--color-secondary)_18%,transparent)] text-[var(--color-secondary)]",
    danger: "bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)] text-[var(--color-danger)]",
    warning: "bg-[color-mix(in_srgb,var(--color-warning)_18%,transparent)] text-[var(--color-warning)]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant] || styles.neutral}`}>
      {label}
    </span>
  );
}

export default function ExpedienteVacacionesPanel({ empleadoId, solicitudId, compact }: Props) {
  const [data, setData] = useState<ExpedienteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = solicitudId ? `?solicitudId=${solicitudId}` : "";
    fetch(`/api/vacaciones/expediente/${empleadoId}${q}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [empleadoId, solicitudId]);

  if (loading) return <p className="text-sm text-[#7F8C8D]">Cargando expediente de vacaciones...</p>;
  if (!data) return <p className="text-sm text-red-600">No se pudo cargar el expediente</p>;

  const { empleado } = data;
  const pctUsado = data.diasTotales > 0 ? Math.round((data.diasUsados / data.diasTotales) * 100) : 0;

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center gap-4 pb-4 border-b">
          <Avatar nombre={empleado.nombre} apellido={empleado.apellidoPaterno} fotoUrl={empleado.fotoUrl} size="lg" />
          <div>
            <h3 className="font-semibold text-lg">
              {empleado.nombre} {empleado.apellidoPaterno} {empleado.apellidoMaterno || ""}
            </h3>
            <p className="text-sm text-[#7F8C8D]">{empleado.puesto} · #{empleado.numeroEmpleado}</p>
            <p className="text-xs text-[#7F8C8D]">
              {empleado.organizacion} · {empleado.departamento}
            </p>
            <p className="text-xs mt-1">
              Antigüedad: {data.antiguedad.años} años, {data.antiguedad.meses} meses
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-[#EBF5FB] text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{data.diasTotales}</p>
          <p className="text-xs text-[#7F8C8D]">Días anuales</p>
          {data.diasExtra > 0 && <p className="text-xs text-[#17A589]">+{data.diasExtra} extra</p>}
        </div>
        <div className="p-3 rounded-lg bg-[#D5F5E3] text-center">
          <p className="text-2xl font-bold text-[#27AE60]">{data.diasDisponibles}</p>
          <p className="text-xs text-[#7F8C8D]">Disponibles</p>
        </div>
        <div className="p-3 rounded-lg bg-[#FDEBD0] text-center">
          <p className="text-2xl font-bold text-[#E67E22]">{data.diasUsados}</p>
          <p className="text-xs text-[#7F8C8D]">Usados ({pctUsado}%)</p>
        </div>
        <div className="p-3 rounded-lg bg-[#FCF3CF] text-center">
          <p className="text-2xl font-bold text-[#F39C12]">{data.diasPendientes}</p>
          <p className="text-xs text-[#7F8C8D]">Pendientes</p>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${Math.min(pctUsado, 100)}%`,
            background: pctUsado > 80 ? "#E74C3C" : "var(--color-secondary, #17A589)",
          }}
        />
      </div>

      {solicitudId && data.diasSolicitudActual != null && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
            data.puedeAutorizar ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {data.puedeAutorizar ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {data.puedeAutorizar
            ? `Puede autorizarse: solicita ${data.diasSolicitudActual} días y quedan ${data.diasDisponibles} disponibles.`
            : `No autorizable: solicita ${data.diasSolicitudActual} días pero solo quedan ${data.diasDisponibles} disponibles.`}
        </div>
      )}

      <div>
        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
          <Calendar size={16} /> Historial de vacaciones
        </h4>
        {data.historialVacaciones.length === 0 ? (
          <p className="text-xs text-[#7F8C8D]">Sin vacaciones registradas</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.historialVacaciones.map((v) => (
              <div key={v.id} className="flex justify-between items-start p-2 rounded text-xs gap-2" style={{ background: "var(--color-surface-2)" }}>
                <div>
                  <p>
                    {new Date(v.fechaInicio).toLocaleDateString("es-MX")} – {new Date(v.fechaFin).toLocaleDateString("es-MX")}
                    <span className="ml-2 text-[#7F8C8D]">({v.diasSolicitados} días)</span>
                  </p>
                  <p className="text-[#7F8C8D]">{v.motivo}</p>
                  {v.respuesta && <p className="text-[#7F8C8D] italic">Respuesta: {v.respuesta}</p>}
                </div>
                <EstadoBadge estado={v.estado} />
              </div>
            ))}
          </div>
        )}
      </div>

      {!compact && data.historialPermisos.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Clock size={16} /> Permisos recientes
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {data.historialPermisos.slice(0, 5).map((p) => (
              <div key={p.id} className="flex justify-between p-2 rounded text-xs" style={{ background: "var(--color-surface-2)" }}>
                <span>{new Date(p.fechaInicio).toLocaleDateString("es-MX")} · {p.motivo.slice(0, 40)}...</span>
                <EstadoBadge estado={p.estado} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
