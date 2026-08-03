"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/use-session";

type Resultados = {
  empleados: Array<{ id: number; nombre: string; apellidoPaterno: string; puesto: string; numeroEmpleado: string }>;
  vacantes: Array<{ id: number; titulo: string; estado: string }>;
  candidatos: Array<{ id: number; nombre: string; apellidoPaterno: string; etapa: string }>;
  departamentos: Array<{ id: number; nombre: string; organizacion: { nombre: string } }>;
  documentos: Array<{ id: number; nombre: string; tipo: string; empleado: { nombre: string; apellidoPaterno: string } }>;
};

const vacío: Resultados = {
  empleados: [],
  vacantes: [],
  candidatos: [],
  departamentos: [],
  documentos: [],
};

export default function BuscarPage() {
  const { loading: sessionLoading } = useSession();
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Resultados>(vacío);
  const [error, setError] = useState("");
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResultados(vacío);
      setError("");
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      setError("");
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setBuscando(false);
      if (!res.ok) {
        setError(data.error || "No se pudo completar la búsqueda.");
        setResultados(vacío);
        return;
      }
      setResultados(data);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  if (sessionLoading) return <p className="text-muted">Cargando…</p>;

  const total =
    resultados.empleados.length +
    resultados.vacantes.length +
    resultados.candidatos.length +
    resultados.departamentos.length +
    resultados.documentos.length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Búsqueda de personal</h1>
        <p className="page-subtitle">Empleados, departamentos, vacantes, candidatos y documentos</p>
      </div>

      <div className="card mb-6">
        <label className="label-field" htmlFor="buscar-q">
          Término de búsqueda
        </label>
        <input
          id="buscar-q"
          className="input-field w-full"
          placeholder="Nombre, correo, número de empleado, vacante…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        {error && <p className="field-error mt-2">{error}</p>}
        {q.trim().length > 0 && q.trim().length < 2 && (
          <p className="field-hint mt-2">Ingrese al menos 2 caracteres para buscar.</p>
        )}
        {buscando && <p className="field-hint mt-2">Buscando…</p>}
      </div>

      {q.trim().length >= 2 && !buscando && !error && total === 0 && (
        <div className="card text-center text-muted">No se encontraron resultados.</div>
      )}

      {resultados.empleados.length > 0 && (
        <section className="card mb-4">
          <h2 className="font-semibold mb-3">Empleados</h2>
          <ul className="space-y-2">
            {resultados.empleados.map((e) => (
              <li key={e.id}>
                <Link href={`/empleados/${e.id}`} className="text-primary-light hover:underline">
                  {e.nombre} {e.apellidoPaterno} · {e.numeroEmpleado} · {e.puesto}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resultados.departamentos.length > 0 && (
        <section className="card mb-4">
          <h2 className="font-semibold mb-3">Departamentos</h2>
          <ul className="space-y-2">
            {resultados.departamentos.map((d) => (
              <li key={d.id}>
                <Link href={`/departamentos/${d.id}`} className="text-primary-light hover:underline">
                  {d.nombre} · {d.organizacion.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resultados.vacantes.length > 0 && (
        <section className="card mb-4">
          <h2 className="font-semibold mb-3">Vacantes</h2>
          <ul className="space-y-2">
            {resultados.vacantes.map((v) => (
              <li key={v.id}>
                <Link href="/vacantes" className="text-primary-light hover:underline">
                  {v.titulo} · {v.estado}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resultados.candidatos.length > 0 && (
        <section className="card mb-4">
          <h2 className="font-semibold mb-3">Candidatos</h2>
          <ul className="space-y-2">
            {resultados.candidatos.map((c) => (
              <li key={c.id}>
                <Link href="/candidatos" className="text-primary-light hover:underline">
                  {c.nombre} {c.apellidoPaterno} · {c.etapa}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resultados.documentos.length > 0 && (
        <section className="card mb-4">
          <h2 className="font-semibold mb-3">Documentos</h2>
          <ul className="space-y-2">
            {resultados.documentos.map((d) => (
              <li key={d.id}>
                <Link href="/documentos" className="text-primary-light hover:underline">
                  {d.nombre} ({d.tipo}) · {d.empleado.nombre} {d.empleado.apellidoPaterno}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
