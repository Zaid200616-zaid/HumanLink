"use client";

import { useEffect, useState } from "react";
import { fetchList } from "@/lib/fetch-client";

interface Evaluacion {
  id: number;
  tipo: string;
  periodo: string;
  comentarios: string;
  puntaje: number | null;
  fecha: string;
  empleado: { nombre: string; apellidoPaterno: string };
  evaluador: { nombre: string; apellidoPaterno: string };
}

interface EmpleadoOpt {
  id: number;
  nombre: string;
  apellidoPaterno: string;
}

const TIPOS: { value: string; label: string }[] = [
  { value: "DESEMPENO", label: "Desempeño" },
  { value: "ANUAL", label: "Anual" },
  { value: "SEMESTRAL", label: "Semestral" },
  { value: "PERIODO_PRUEBA", label: "Periodo de prueba" },
  { value: "PROYECTO", label: "Proyecto" },
  { value: "360", label: "360°" },
];

const tipoLabel = (t: string) => TIPOS.find((x) => x.value === t)?.label ?? t;

const hoyISO = () => new Date().toISOString().split("T")[0];

export default function EvaluacionesPage() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [puedeEvaluar, setPuedeEvaluar] = useState(false);

  const [empleadoId, setEmpleadoId] = useState("");
  const [tipo, setTipo] = useState("DESEMPENO");
  const [puntaje, setPuntaje] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [comentarios, setComentarios] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = () => {
    fetchList<Evaluacion>("/api/evaluaciones").then((data) => {
      setEvaluaciones(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    cargar();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        const rol = me?.rol || "";
        setPuedeEvaluar(rol === "Supervisor");
        if (rol === "Supervisor") {
          fetchList<EmpleadoOpt>("/api/empleados").then(setEmpleados);
        }
      });
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (!empleadoId) {
      setError("Selecciona un empleado");
      return;
    }
    if (comentarios.trim().length < 5) {
      setError("Las observaciones son muy cortas");
      return;
    }
    setEnviando(true);
    const res = await fetch("/api/evaluaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empleadoId: Number(empleadoId),
        tipo,
        comentarios,
        fecha,
        ...(puntaje !== "" ? { puntaje: Number(puntaje) } : {}),
      }),
    });
    setEnviando(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || "No se pudo guardar la evaluación");
      return;
    }
    setOk("Evaluación registrada");
    setEmpleadoId("");
    setTipo("DESEMPENO");
    setPuntaje("");
    setFecha(hoyISO());
    setComentarios("");
    cargar();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">
          Evaluación de Desempeño
        </h1>
        <p className="text-[#7F8C8D]">Registro manual de evaluaciones · RF-H11</p>
      </div>

      <div className={`grid gap-5 ${puedeEvaluar ? "lg:grid-cols-[380px_1fr]" : "grid-cols-1"}`}>
        {puedeEvaluar && (
          <form onSubmit={enviar} className="card h-fit space-y-4">
            <h2 className="font-semibold">Nueva evaluación</h2>

            <div>
              <label className="block text-sm mb-1 text-[#7F8C8D]">Empleado</label>
              <select
                value={empleadoId}
                onChange={(e) => setEmpleadoId(e.target.value)}
                className="input w-full"
                required
              >
                <option value="">Selecciona…</option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} {emp.apellidoPaterno}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1 text-[#7F8C8D]">Tipo de evaluación</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input w-full">
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 text-[#7F8C8D]">Calificación (0-100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={puntaje}
                  onChange={(e) => setPuntaje(e.target.value)}
                  className="input w-full"
                  placeholder="Ej. 85"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-[#7F8C8D]">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-[#7F8C8D]">Observaciones</label>
              <textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                className="input w-full"
                rows={4}
                placeholder="Fortalezas, áreas de mejora, acuerdos…"
                required
              />
            </div>

            {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
            {ok && <p className="text-sm" style={{ color: "var(--color-secondary)" }}>{ok}</p>}

            <button type="submit" disabled={enviando} className="btn-primary w-full">
              {enviando ? "Guardando…" : "Registrar evaluación"}
            </button>
          </form>
        )}

        <div className="space-y-4">
          {loading ? (
            <p className="text-[#7F8C8D]">Cargando evaluaciones…</p>
          ) : evaluaciones.length === 0 ? (
            <div className="card text-center text-[#7F8C8D]">
              Aún no hay evaluaciones registradas.
            </div>
          ) : (
            evaluaciones.map((ev) => (
              <div key={ev.id} className="card">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">
                        {ev.empleado.nombre} {ev.empleado.apellidoPaterno}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(59,130,246,0.14)", color: "var(--color-primary-light)" }}
                      >
                        {tipoLabel(ev.tipo)}
                      </span>
                    </div>
                    <p className="text-sm text-[#7F8C8D] mt-0.5">
                      Evaluador: {ev.evaluador.nombre} {ev.evaluador.apellidoPaterno} ·{" "}
                      {new Date(ev.fecha).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  {ev.puntaje !== null && (
                    <span className="text-2xl font-bold shrink-0" style={{ color: "var(--color-secondary)" }}>
                      {ev.puntaje}/100
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm whitespace-pre-line">{ev.comentarios}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
