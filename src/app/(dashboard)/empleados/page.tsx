"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import PaginationBar from "@/components/ui/PaginationBar";
import { useSession } from "@/lib/use-session";

interface EmpleadoRow {
  id: number;
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  email: string;
  curp: string | null;
  rfc: string | null;
  puesto: string;
  activo: boolean;
  departamento: { nombre: string; organizacion: { nombre: string } } | null;
}

interface EmpleadosResponse {
  items: EmpleadoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function EmpleadosPage() {
  const { canManage } = useSession();
  const [empleados, setEmpleados] = useState<EmpleadoRow[]>([]);
  const [q, setQ] = useState("");
  const [puesto, setPuesto] = useState("");
  const [activo, setActivo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (busqueda: string, pagina: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pagina), pageSize: "25" });
    if (busqueda) params.set("q", busqueda);
    if (puesto) params.set("puesto", puesto);
    if (activo) params.set("activo", activo);

    const res = await fetch(`/api/empleados?${params.toString()}`);
    const data: EmpleadosResponse = await res.json();
    setEmpleados(data.items || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [puesto, activo]);

  // RNF13 - Búsqueda con debounce; reinicia a página 1 al cambiar filtros
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      cargar(q, 1);
    }, 300);
    return () => clearTimeout(t);
  }, [q, puesto, activo, cargar]);

  const irAPagina = (p: number) => {
    const destino = Math.min(Math.max(1, p), totalPages);
    setPage(destino);
    cargar(q, destino);
  };

  async function darDeBaja(e: EmpleadoRow) {
    if (!e.activo) return;
    const nombre = `${e.nombre} ${e.apellidoPaterno}`;
    if (!confirm(`¿Dar de baja a ${nombre}? El empleado quedará como Inactivo y se conservará su información.`)) return;
    const res = await fetch(`/api/empleados/${e.id}`, { method: "DELETE" });
    if (res.ok) cargar(q, page);
  }

  return (
    <div>
      <PageHeader
        title="Empleados"
        subtitle="RF-H02 · Validación global · Tabla unificada HumanLink"
      />

      <div className="card mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label-field">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-[#7F8C8D]" size={16} />
              <input
                className="input-field pl-9 w-full"
                placeholder="Nombre, email, número, CURP, RFC…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label-field">Puesto</label>
            <input
              className="input-field w-full"
              placeholder="Filtrar por puesto"
              value={puesto}
              onChange={(e) => setPuesto(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Estado</label>
            <select
              className="input-field w-full"
              value={activo}
              onChange={(e) => setActivo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-[#7F8C8D]">Buscando empleados…</p>
      ) : empleados.length === 0 ? (
        <div className="card text-center text-[#7F8C8D]">
          No se encontraron empleados con esos criterios.
        </div>
      ) : (
        <div className="hl-table-shell">
          <div className="hl-table-wrap">
          <table className="hl-table">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3">No. Empleado</th>
                <th className="pb-3">Nombre</th>
                <th className="pb-3">Puesto</th>
                <th className="pb-3 hidden md:table-cell">CURP / RFC</th>
                <th className="pb-3">Departamento</th>
                <th className="pb-3 hidden lg:table-cell">Organización</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-xs">{e.numeroEmpleado}</td>
                  <td className="py-3 font-medium">
                    {e.nombre} {e.apellidoPaterno} {e.apellidoMaterno || ""}
                  </td>
                  <td className="py-3">{e.puesto}</td>
                  <td className="py-3 hidden md:table-cell text-xs text-[#7F8C8D]">
                    {e.curp || e.rfc ? (
                      <>
                        {e.curp && <span className="block">{e.curp}</span>}
                        {e.rfc && <span className="block">{e.rfc}</span>}
                      </>
                    ) : "—"}
                  </td>
                  <td className="py-3">{e.departamento?.nombre || "—"}</td>
                  <td className="py-3 hidden lg:table-cell">{e.departamento?.organizacion.nombre || "—"}</td>
                  <td className="py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: e.activo ? "rgba(34,197,94,0.16)" : "rgba(239,68,68,0.16)",
                        color: e.activo ? "var(--color-secondary)" : "var(--color-danger)",
                      }}
                    >
                      {e.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-1 text-sm">
                      <Link href={`/empleados/${e.id}`} className="text-[#2874A6] hover:underline">
                        Ver expediente
                      </Link>
                      {canManage && e.activo && (
                        <button type="button" onClick={() => darDeBaja(e)} className="text-left text-red-600 hover:underline text-xs">
                          Dar de baja
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={25}
            onPageChange={irAPagina}
          />
        </div>
      )}
    </div>
  );
}
