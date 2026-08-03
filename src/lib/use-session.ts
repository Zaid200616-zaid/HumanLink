"use client";

import { useEffect, useState, useCallback } from "react";

export interface SessionUser {
  id: number;
  email: string;
  rol: string;
  empleadoId?: number;
  empleado?: { id: number; nombre: string; apellidoPaterno: string };
}

const SESSION_REFRESH_EVENT = "humanlink:session-refresh";

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.id) {
          setUser(null);
          return;
        }
        setUser({
          id: data.id,
          email: data.email,
          rol: data.rol,
          empleadoId: data.empleado?.id,
          empleado: data.empleado,
        });
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
    const onRefresh = () => cargar();
    window.addEventListener(SESSION_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(SESSION_REFRESH_EVENT, onRefresh);
  }, [cargar]);

  const isAdmin = user?.rol === "Administrador";
  const isRH = user?.rol === "Recursos Humanos";
  const isEmpleado = user?.rol === "Empleado";
  const isSupervisor = user?.rol === "Supervisor";
  const canManage = isAdmin || isRH;

  return { user, loading, isAdmin, isRH, isEmpleado, isSupervisor, canManage };
}
