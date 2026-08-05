"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/use-session";
import { ASISTENCIA_BADGES } from "@/lib/asistencia-registro";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

type AsistenciaRow = {
  id: number;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  estado: string;
  turnoNombre: string | null;
  notas: string | null;
  empleado: {
    id: number;
    nombre: string;
    apellidoPaterno: string;
    departamento: { nombre: string } | null;
    turno?: { nombre: string } | null;
  };
};

type EmpleadoOpt = { id: number; nombre: string; apellidoPaterno: string };

type StatsDia = {
  puntuales: number;
  retardos: number;
  faltas: number;
  pendientes: number;
  porcentajeAsistencia: number;
};

const ESTADOS = ["PUNTUAL", "RETARDO", "FALTA", "PERMISO", "VACACION"] as const;

const formVacío = {
  empleadoId: "",
  fecha: new Date().toISOString().slice(0, 10),
  horaEntrada: "",
  horaSalida: "",
  estado: "PUNTUAL" as string,
  notas: "",
};

export default function AsistenciasPage() {
  const { isAdmin, canManage, isSupervisor, loading: sessionLoading } = useSession();
  const esConsultor = canManage || isAdmin || isSupervisor;
  const puedeRegistrar = canManage || isAdmin;
  const puedeEditarEliminar = isAdmin;
  const [registros, setRegistros] = useState<AsistenciaRow[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoOpt[]>([]);
  const [form, setForm] = useState(formVacío);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsDia | null>(null);
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  const cargar = useCallback(() => {
    fetch("/api/asistencias")
      .then((r) => r.json())
      .then((data) => {
        setRegistros(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const cargarStats = useCallback(() => {
    if (!esConsultor) return;
    fetch("/api/asistencias/estadisticas")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.puntuales === "number") setStats(data);
      })
      .catch(() => setStats(null));
  }, [esConsultor]);

  useEffect(() => {
    if (sessionLoading) return;
    cargar();
    cargarStats();
    if (puedeRegistrar) {
      fetch("/api/empleados?pageSize=500&activo=true")
        .then((r) => r.json())
        .then((d) => setEmpleados(d.items || []));
    }
  }, [cargar, cargarStats, puedeRegistrar, sessionLoading]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (editId && !puedeEditarEliminar) return;
    if (!editId && !puedeRegistrar) return;

    if (editId) {
      const res = await fetch(`/api/asistencias/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horaEntrada: form.horaEntrada || null,
          horaSalida: form.horaSalida || null,
          estado: form.estado,
          notas: form.notas || null,
          fecha: form.fecha,
        }),
      });
      if (res.ok) {
        setEditId(null);
        setForm(formVacío);
        cargar();
        cargarStats();
      }
      return;
    }

    const res = await fetch("/api/asistencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empleadoId: Number(form.empleadoId),
        fecha: form.fecha,
        horaEntrada: form.horaEntrada || null,
        horaSalida: form.horaSalida || null,
        estado: form.estado,
        notas: form.notas || null,
      }),
    });
    if (res.ok) {
      setForm(formVacío);
      cargar();
      cargarStats();
    }
  }

  function editar(r: AsistenciaRow) {
    setEditId(r.id);
    setForm({
      empleadoId: String(r.empleado.id),
      fecha: r.fecha.slice(0, 10),
      horaEntrada: r.horaEntrada || "",
      horaSalida: r.horaSalida || "",
      estado: r.estado,
      notas: r.notas || "",
    });
  }

  async function eliminar(id: number) {
    const ok = await confirm("Eliminar asistencia", "¿Eliminar registro de asistencia?");
    if (!ok) return;
    const res = await fetch(`/api/asistencias/${id}`, { method: "DELETE" });
    if (res.ok) {
      cargar();
      cargarStats();
    }
  }

  return (
    <div>
      <PageHeader
        title="Control de Asistencias"
        subtitle={esConsultor ? "Administración de registros y estadísticas del día" : "Consulta de registros de entrada y salida"}
      />

      {esConsultor && stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-success">{stats.puntuales}</p>
            <p className="text-xs text-muted">Puntuales</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-warning">{stats.retardos}</p>
            <p className="text-xs text-muted">Retardos</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-danger">{stats.faltas}</p>
            <p className="text-xs text-muted">Faltas</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-primary">{stats.pendientes}</p>
            <p className="text-xs text-muted">Pendientes por registrar</p>
          </div>
          <div className="card text-center py-4 col-span-2 md:col-span-1">
            <p className="text-2xl font-bold text-primary">{stats.porcentajeAsistencia}%</p>
            <p className="text-xs text-muted">Asistencia del día</p>
          </div>
        </div>
      )}

      {puedeRegistrar && (
        <form onSubmit={guardar} className="card mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <h2 className="font-semibold md:col-span-3">{editId ? "Corregir asistencia" : "Registrar asistencia"}</h2>
          {!editId && (
            <div>
              <label className="label-field">Empleado</label>
              <select className="input-field w-full" value={form.empleadoId} onChange={(e) => setForm({ ...form, empleadoId: e.target.value })} required>
                <option value="">Seleccione…</option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellidoPaterno}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label-field">Fecha</label>
            <input type="date" className="input-field w-full" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
          </div>
          <div>
            <label className="label-field">Estado</label>
            <select className="input-field w-full" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>{ASISTENCIA_BADGES[s]?.label || s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Entrada</label>
            <input className="input-field w-full" placeholder="08:00" value={form.horaEntrada} onChange={(e) => setForm({ ...form, horaEntrada: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Salida</label>
            <input className="input-field w-full" placeholder="17:00" value={form.horaSalida} onChange={(e) => setForm({ ...form, horaSalida: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Notas</label>
            <input className="input-field w-full" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button type="submit" className="btn-primary text-sm">{editId ? "Guardar corrección" : "Registrar"}</button>
            {editId && (
              <button type="button" className="btn-outline text-sm" onClick={() => { setEditId(null); setForm(formVacío); }}>Cancelar</button>
            )}
          </div>
        </form>
      )}

      <div className="hl-table-shell">
        {loading ? (
          <LoadingState label="Cargando asistencias…" compact />
        ) : (
          <div className="hl-table-wrap">
          <table className="hl-table min-w-[720px]">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Departamento</th>
                <th>Fecha</th>
                <th>Turno</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Estado</th>
                {esConsultor && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {registros.map((fila) => {
                const turno = fila.turnoNombre || fila.empleado.turno?.nombre || "—";
                return (
                  <tr key={fila.id}>
                    <td className="font-medium">{fila.empleado.nombre} {fila.empleado.apellidoPaterno}</td>
                    <td>{fila.empleado.departamento?.nombre || "—"}</td>
                    <td>{new Date(fila.fecha).toLocaleDateString("es-MX")}</td>
                    <td>{turno}</td>
                    <td className="font-mono text-xs">{fila.horaEntrada || "—"}</td>
                    <td className="font-mono text-xs">{fila.horaSalida || "—"}</td>
                    <td>
                      <StatusBadge estado={fila.estado} />
                    </td>
                    {puedeEditarEliminar && (
                      <td>
                        <button type="button" className="link-action mr-2 text-xs" onClick={() => editar(fila)}>Editar</button>
                        <button type="button" className="link-danger text-xs" onClick={() => eliminar(fila.id)}>Eliminar</button>
                      </td>
                    )}
                    {esConsultor && !puedeEditarEliminar && <td className="text-muted text-xs">Solo lectura</td>}
                  </tr>
                );
              })}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={esConsultor ? 8 : 7} className="hl-table-empty">No hay registros de asistencia.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
      {ConfirmDialogHost}
    </div>
  );
}
