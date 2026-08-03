"use client";

import { useSession } from "@/lib/use-session";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MSG_DEPT_SIN_AUTORIZACION } from "@/lib/departamentos-auth";

type Depto = {
  id: number;
  nombre: string;
  descripcion: string | null;
  ubicacion: string | null;
  cantidadVacantes: number;
  activo: boolean;
  supervisor: { id: number; nombre: string; apellidoPaterno: string } | null;
  organizacion: { id: number; nombre: string };
  _count: { empleados: number; vacantes: number };
};

type Meta = {
  organizaciones: { id: number; nombre: string }[];
  empleados: { id: number; nombre: string; apellidoPaterno: string }[];
};

const formVacío = {
  nombre: "",
  descripcion: "",
  organizacionId: "",
  supervisorId: "",
  ubicacion: "",
  cantidadVacantes: "0",
  activo: true,
};

export default function DepartamentosPage() {
  const { user } = useSession();
  const puedeEscribir = user?.rol === "Administrador" || user?.rol === "Supervisor";
  const [depts, setDepts] = useState<Depto[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [form, setForm] = useState(formVacío);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [bitacora, setBitacora] = useState<Array<{ usuario: string; fecha: string; hora: string; accion: string; departamento: string }>>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    fetch("/api/departamentos")
      .then((r) => r.json())
      .then((data) => {
        setDepts(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    cargar();
    fetch("/api/departamentos?meta=1")
      .then((r) => r.json())
      .then(setMeta);
    if (user?.rol === "Administrador" || user?.rol === "Supervisor") {
      fetch("/api/departamentos/auditoria").then((r) => r.json()).then((d) => setBitacora(Array.isArray(d) ? d : []));
    }
  }, [cargar, user?.rol]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEscribir) {
      setAuthMsg(MSG_DEPT_SIN_AUTORIZACION);
      return;
    }
    setAuthMsg("");
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      organizacionId: Number(form.organizacionId),
      supervisorId: form.supervisorId ? Number(form.supervisorId) : null,
      ubicacion: form.ubicacion.trim() || null,
      cantidadVacantes: Number(form.cantidadVacantes) || 0,
      activo: form.activo,
    };
    const res = await fetch(editId ? `/api/departamentos/${editId}` : "/api/departamentos", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Error al guardar");
      if (res.status === 403) setAuthMsg(d.error || MSG_DEPT_SIN_AUTORIZACION);
      return;
    }
    setMsg(editId ? "Departamento actualizado" : "Departamento registrado");
    setForm(formVacío);
    setEditId(null);
    cargar();
    if (puedeEscribir) {
      fetch("/api/departamentos/auditoria").then((r) => r.json()).then((d) => setBitacora(Array.isArray(d) ? d : []));
    }
  }

  function editar(d: Depto) {
    if (!puedeEscribir) {
      setAuthMsg(MSG_DEPT_SIN_AUTORIZACION);
      return;
    }
    setEditId(d.id);
    setForm({
      nombre: d.nombre,
      descripcion: d.descripcion || "",
      organizacionId: String(d.organizacion.id),
      supervisorId: d.supervisor ? String(d.supervisor.id) : "",
      ubicacion: d.ubicacion || "",
      cantidadVacantes: String(d.cantidadVacantes ?? 0),
      activo: d.activo,
    });
  }

  async function eliminar(d: Depto) {
    if (!puedeEscribir) {
      setAuthMsg(MSG_DEPT_SIN_AUTORIZACION);
      return;
    }
    if (!confirm(d._count.empleados || d._count.vacantes ? "¿Desactivar o eliminar según reglas del sistema?" : "¿Eliminar departamento?")) return;
    const res = await fetch(`/api/departamentos/${d.id}`, { method: "DELETE" });
    if (res.ok) cargar();
  }

  return (
    <div className="space-y-6">
      {authMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{authMsg}</div>
      )}
      <div>
        <h1 className="page-title">
          Gestión de Departamentos
        </h1>
        <p className="text-sm text-[#7F8C8D] mt-1">RF-H19 · RNF-08 Seguridad · Solo Admin/Supervisor pueden modificar</p>
      </div>

      {!puedeEscribir && user && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
          Su rol ({user.rol}) tiene acceso de solo lectura en departamentos. Para crear, editar o eliminar contacte a un Administrador o Supervisor.
        </div>
      )}

      <form
        onSubmit={guardar}
        className="rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", display: puedeEscribir ? undefined : "none" }}
      >
        <h2 className="font-semibold md:col-span-2 lg:col-span-3">{editId ? "Editar departamento" : "Registrar departamento"}</h2>

        <div>
          <label className="label-field">Nombre</label>
          <input className="input-field w-full" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        </div>
        <div>
          <label className="label-field">Organización</label>
          <select className="input-field w-full" value={form.organizacionId} onChange={(e) => setForm({ ...form, organizacionId: e.target.value })} required>
            <option value="">Seleccione…</option>
            {meta?.organizaciones.map((o) => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Supervisor</label>
          <select className="input-field w-full" value={form.supervisorId} onChange={(e) => setForm({ ...form, supervisorId: e.target.value })}>
            <option value="">Sin supervisor</option>
            {meta?.empleados.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre} {e.apellidoPaterno}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label-field">Descripción</label>
          <input className="input-field w-full" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Cantidad de vacantes (máx.)</label>
          <input type="number" min={0} className="input-field w-full" value={form.cantidadVacantes} onChange={(e) => setForm({ ...form, cantidadVacantes: e.target.value })} />
          <p className="text-xs text-[#7F8C8D] mt-1">0 = sin límite</p>
        </div>
        <div>
          <label className="label-field">Ubicación (opcional)</label>
          <input className="input-field w-full" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm self-end pb-2">
          <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
          Activo
        </label>

        <div className="md:col-span-2 lg:col-span-3 flex gap-2 items-center">
          <button type="submit" className="btn-primary text-sm">{editId ? "Guardar" : "Registrar"}</button>
          {editId && (
            <button type="button" className="btn-outline text-sm" onClick={() => { setEditId(null); setForm(formVacío); }}>
              Cancelar
            </button>
          )}
          {msg && <span className="text-sm text-[#7F8C8D]">{msg}</span>}
        </div>
      </form>

      <div className="hl-table-shell">
        {loading ? (
          <p className="p-5 text-[#7F8C8D]">Cargando…</p>
        ) : (
          <div className="hl-table-wrap">
            <table className="hl-table min-w-[800px]">
              <thead>
                <tr>
                  <th>Departamento</th>
                  <th className="px-4 py-3 font-semibold">Supervisor</th>
                  <th className="px-4 py-3 font-semibold text-center">Empleados</th>
                  <th className="px-4 py-3 font-semibold text-center">Vacantes</th>
                  <th className="px-4 py-3 font-semibold text-center">Máx. vac.</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {depts.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.nombre}</td>
                    <td>
                      {d.supervisor ? `${d.supervisor.nombre} ${d.supervisor.apellidoPaterno}` : "—"}
                    </td>
                    <td className="text-center">{d._count.empleados}</td>
                    <td className="text-center">{d._count.vacantes}</td>
                    <td className="text-center">{d.cantidadVacantes > 0 ? d.cantidadVacantes : "—"}</td>
                    <td>
                      <span className="hl-badge hl-badge-success">{d.activo ? "Activo" : "Inactivo"}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link href={`/departamentos/${d.id}`} className="text-[#2874A6] hover:underline">Ver detalle</Link>
                        {puedeEscribir && (
                          <>
                            <button type="button" onClick={() => editar(d)} className="text-[#2874A6] hover:underline">Editar</button>
                            <button type="button" onClick={() => eliminar(d)} className="text-red-600 hover:underline">Eliminar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {puedeEscribir && bitacora.length > 0 && (
        <section className="hl-table-shell">
          <h2 className="font-semibold px-4 py-3 border-b text-sm" style={{ borderColor: "var(--color-border)" }}>
            Bitácora de auditoría (altas, ediciones, eliminaciones)
          </h2>
          <div className="hl-table-wrap">
            <table className="hl-table">
              <thead>
                <tr className="text-left border-b">
                  <th className="px-4 py-2">Usuario</th>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Hora</th>
                  <th className="px-4 py-2">Acción</th>
                  <th className="px-4 py-2">Departamento</th>
                </tr>
              </thead>
              <tbody>
                {bitacora.map((b) => (
                  <tr key={`${b.usuario}-${b.fecha}-${b.hora}-${b.accion}`} className="border-t">
                    <td className="px-4 py-2">{b.usuario}</td>
                    <td className="px-4 py-2">{b.fecha}</td>
                    <td className="px-4 py-2">{b.hora}</td>
                    <td className="px-4 py-2">{b.accion}</td>
                    <td className="px-4 py-2">{b.departamento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
