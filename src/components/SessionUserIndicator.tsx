"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";

export const SESSION_REFRESH_EVENT = "humanlink:session-refresh";

export type SessionProfile = {
  id: number;
  email: string;
  rol: string;
  nombreCompleto: string;
  numeroEmpleado: string | null;
  fotoUrl: string | null;
  empleado: {
    id: number;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno?: string | null;
    numeroEmpleado: string;
    fotoUrl?: string | null;
  } | null;
};

function parseProfile(data: Record<string, unknown>): SessionProfile | null {
  if (!data?.id || !data?.email) return null;
  const emp = data.empleado as SessionProfile["empleado"];
  const nombreCompleto =
    (data.nombreCompleto as string) ||
    (emp ? `${emp.nombre} ${emp.apellidoPaterno}${emp.apellidoMaterno ? ` ${emp.apellidoMaterno}` : ""}`.trim() : "") ||
    (data.email as string).split("@")[0];

  return {
    id: data.id as number,
    email: data.email as string,
    rol: (data.rol as string) || "Usuario",
    nombreCompleto,
    numeroEmpleado: emp?.numeroEmpleado || (data.numeroEmpleado as string) || null,
    fotoUrl: emp?.fotoUrl ?? (data.fotoUrl as string) ?? null,
    empleado: emp,
  };
}

type Props = {
  compact?: boolean;
};

/** Indicador permanente de sesión (encabezado superior derecho). */
export default function SessionUserIndicator({ compact = false }: Props) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) {
          setProfile(null);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setProfile(parseProfile(data));
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    cargar();
  }, [cargar, pathname]);

  useEffect(() => {
    const onRefresh = () => cargar();
    window.addEventListener(SESSION_REFRESH_EVENT, onRefresh);
    window.addEventListener("focus", onRefresh);
    return () => {
      window.removeEventListener(SESSION_REFRESH_EVENT, onRefresh);
      window.removeEventListener("focus", onRefresh);
    };
  }, [cargar]);

  if (loading) {
    return (
      <div
        className="session-indicator session-indicator--loading"
        aria-label="Cargando sesión"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="w-9 h-9 rounded-full animate-pulse" style={{ background: "var(--color-surface-3)" }} />
        {!compact && (
          <div className="hidden sm:block space-y-1">
            <div className="h-3 w-24 rounded animate-pulse" style={{ background: "var(--color-surface-3)" }} />
            <div className="h-2 w-16 rounded animate-pulse" style={{ background: "var(--color-surface-3)" }} />
          </div>
        )}
      </div>
    );
  }

  if (!profile) return null;

  const [nombre, ...restAp] = profile.nombreCompleto.split(" ");
  const apellido = restAp.join(" ") || undefined;

  if (compact) {
    return (
      <div
        className="session-indicator session-indicator--compact"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        title={`${profile.nombreCompleto} · ${profile.rol}`}
      >
        <Avatar nombre={nombre} apellido={apellido} fotoUrl={profile.fotoUrl} size="sm" />
        <div className="session-indicator-text min-w-0">
          <p className="session-indicator-name truncate">{profile.nombreCompleto}</p>
          <p className="session-indicator-status">
            <span className="session-indicator-dot" aria-hidden /> En línea
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="session-indicator"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      aria-label={`Sesión activa: ${profile.nombreCompleto}, ${profile.rol}`}
    >
      <Avatar nombre={nombre} apellido={apellido} fotoUrl={profile.fotoUrl} size="sm" />
      <div className="session-indicator-text">
        <p className="session-indicator-status">
          <span className="session-indicator-dot" aria-hidden /> Sesión activa
        </p>
        <p className="session-indicator-name">{profile.nombreCompleto}</p>
        <p className="session-indicator-role">{profile.rol}</p>
        {profile.numeroEmpleado && (
          <p className="session-indicator-emp">Empleado #{profile.numeroEmpleado}</p>
        )}
      </div>
    </div>
  );
}

export function notifySessionRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_REFRESH_EVENT));
  }
}
