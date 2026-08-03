"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, LogIn } from "lucide-react";
import { useSession } from "@/lib/use-session";
import { ASISTENCIA_BADGES } from "@/lib/asistencia-registro";

type Registro = {
  id: number;
  fecha: string;
  horaEntrada: string | null;
  estado: string;
  turnoNombre: string | null;
  empleado: { turno?: { nombre: string; horaInicio: string; horaFin: string } | null };
};

export default function RegistroEntradaPage() {
  const { user, loading: sessionLoading, isEmpleado } = useSession();
  const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("semana");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    setLoading(true);
    fetch(`/api/asistencias?periodo=${periodo}`)
      .then((r) => r.json())
      .then((data) => {
        setRegistros(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [periodo]);

  useEffect(() => {
    if (!sessionLoading) cargar();
  }, [cargar, sessionLoading]);

  async function registrarEntrada() {
    setError("");
    setMsg("");
    setRegistrando(true);
    const res = await fetch("/api/asistencias/registrar-entrada", { method: "POST" });
    const data = await res.json();
    setRegistrando(false);
    if (!res.ok) {
      setError(data.error || "No se pudo registrar la entrada.");
      return;
    }
    setMsg(
      `Entrada registrada a las ${data.horaEntrada}. Estado: ${ASISTENCIA_BADGES[data.estado]?.label || data.estado}.`
    );
    cargar();
  }

  const hoyRegistrado = registros.some(
    (r) => new Date(r.fecha).toDateString() === new Date().toDateString()
  );

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Registro de entrada</h1>
        <p className="page-subtitle">
          {isEmpleado
            ? "Registra tu llegada y consulta tu historial de asistencia."
            : "Vista de registro de entrada (empleados)."}
        </p>
      </header>

      {user?.empleadoId ? (
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium text-[#1B4F72]">
                {user.empleado?.nombre} {user.empleado?.apellidoPaterno}
              </p>
              <p className="text-sm text-[#7F8C8D] flex items-center gap-1 mt-1">
                <Clock size={16} /> {new Date().toLocaleString("es-MX")}
              </p>
            </div>
            <button
              type="button"
              className="btn-primary inline-flex items-center justify-center gap-2"
              onClick={registrarEntrada}
              disabled={registrando || hoyRegistrado}
            >
              <LogIn size={18} />
              {hoyRegistrado ? "Entrada registrada hoy" : registrando ? "Registrando…" : "Registrar Entrada"}
            </button>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">{error}</div>}
          {msg && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm mt-4">{msg}</div>}
        </div>
      ) : (
        <div className="card mb-6 text-sm text-[#7F8C8D]">
          Tu cuenta no está vinculada a un empleado. Contacta a Recursos Humanos.
        </div>
      )}

      <div className="card mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-[#1B4F72]">Filtrar historial:</span>
        {(["dia", "semana", "mes"] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={periodo === p ? "btn-primary text-sm py-1.5 px-3" : "btn-outline text-sm py-1.5 px-3"}
            onClick={() => setPeriodo(p)}
          >
            {p === "dia" ? "Día" : p === "semana" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>

      <div className="hl-table-shell">
        {loading ? (
          <p className="p-5 text-[var(--color-muted)]">Cargando…</p>
        ) : (
          <div className="hl-table-wrap">
            <table className="hl-table min-w-[520px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora de entrada</th>
                  <th>Turno</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => {
                  const badge = ASISTENCIA_BADGES[r.estado] || {
                    className: "hl-badge hl-badge-neutral",
                    label: r.estado,
                  };
                  const turno =
                    r.turnoNombre || r.empleado.turno?.nombre || "—";
                  return (
                    <tr key={r.id}>
                      <td>{new Date(r.fecha).toLocaleDateString("es-MX")}</td>
                      <td className="font-mono text-xs">{r.horaEntrada || "—"}</td>
                      <td>{turno}</td>
                      <td>
                        <span className={badge.className}>{badge.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={4} className="hl-table-empty">
                      No hay registros en el periodo seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
