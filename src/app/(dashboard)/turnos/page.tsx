"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchList } from "@/lib/fetch-client";
import { useSession } from "@/lib/use-session";
import { useToast } from "@/components/ToastProvider";
import { MSG } from "@/lib/ui-messages";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

type EmpleadoAsignado = {
  id: number;
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  turnoId: number | null;
};

type Turno = {
  id: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  descripcion: string | null;
  activo: boolean;
  _count: { empleados: number };
  empleados?: EmpleadoAsignado[];
};

type EmpleadoOpt = {
  id: number;
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  turnoId: number | null;
  activo: boolean;
};

const formVacío = {
  nombre: "",
  horaInicio: "08:00",
  horaFin: "17:00",
  descripcion: "",
  activo: true,
};

export default function TurnosPage() {
  const { isAdmin, isRH } = useSession();
  const { showError } = useToast();
  const { confirm, ConfirmDialogHost } = useConfirmDialog();
  const puedeEscribir = isAdmin || isRH;
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [todosEmpleados, setTodosEmpleados] = useState<EmpleadoOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(formVacío);
  const [msg, setMsg] = useState("");
  const [modalTurno, setModalTurno] = useState<Turno | null>(null);
  const [buscarModal, setBuscarModal] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);
  const [buscarQ, setBuscarQ] = useState("");
  const [filtroHorario, setFiltroHorario] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [soloActivos, setSoloActivos] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "15",
    });
    if (soloActivos) params.set("soloActivos", "1");
    if (buscarQ.trim()) params.set("q", buscarQ.trim());
    if (filtroHorario.trim()) params.set("horario", filtroHorario.trim());
    const res = await fetch(`/api/turnos?${params}`);
    const data = await res.json();
    setTurnos(Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [page, buscarQ, filtroHorario, soloActivos]);

  useEffect(() => {
    const t = setTimeout(() => cargar(), buscarQ || filtroHorario ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, buscarQ, filtroHorario, page, soloActivos]);

  const turnosActivos = useMemo(() => turnos.filter((t) => t.activo), [turnos]);

  function resetForm() {
    setEditId(null);
    setForm(formVacío);
  }

  async function guardarTurno(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const payload = {
      nombre: form.nombre.trim(),
      horaInicio: form.horaInicio,
      horaFin: form.horaFin,
      descripcion: form.descripcion.trim() || undefined,
      activo: form.activo,
    };
    const res = await fetch(editId ? `/api/turnos/${editId}` : "/api/turnos", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "No se pudo guardar el turno");
      return;
    }
    setMsg(editId ? "Turno actualizado" : "Turno creado");
    resetForm();
    cargar();
  }

  function iniciarEdicion(t: Turno) {
    setEditId(t.id);
    setForm({
      nombre: t.nombre,
      horaInicio: t.horaInicio,
      horaFin: t.horaFin,
      descripcion: t.descripcion || "",
      activo: t.activo,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarODesactivar(t: Turno) {
    const desactivar = t._count.empleados > 0;
    const ok = await confirm(
      desactivar ? "Desactivar turno" : "Eliminar turno",
      desactivar ? "¿Desactivar este turno?" : "¿Eliminar este turno?"
    );
    if (!ok) return;
    const res = await fetch(`/api/turnos/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      showError(d.error || MSG.errorGenerico);
      return;
    }
    cargar();
  }

  async function toggleActivo(t: Turno) {
    const res = await fetch(`/api/turnos/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !t.activo }),
    });
    if (res.ok) cargar();
  }

  useEffect(() => {
    fetchList<EmpleadoOpt>("/api/empleados?activo=true&limit=500").then(setTodosEmpleados);
  }, []);

  function abrirAsignacion(t: Turno) {
    fetch(`/api/turnos/${t.id}`)
      .then((r) => r.json())
      .then((full) => {
        setModalTurno(full);
        setBuscarModal("");
        setSeleccionados(new Set((full.empleados || []).map((e: EmpleadoAsignado) => e.id)));
      });
  }

  function cerrarModal() {
    setModalTurno(null);
    setBuscarModal("");
    setSeleccionados(new Set());
  }

  const empleadosFiltradosModal = useMemo(() => {
    const q = buscarModal.trim().toLowerCase();
    return todosEmpleados.filter((e) => {
      if (!q) return true;
      const texto = `${e.nombre} ${e.apellidoPaterno} ${e.numeroEmpleado}`.toLowerCase();
      return texto.includes(q);
    });
  }, [todosEmpleados, buscarModal]);

  async function guardarAsignacion() {
    if (!modalTurno) return;
    setGuardandoAsignacion(true);
    const res = await fetch(`/api/turnos/${modalTurno.id}/asignar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empleadoIds: [...seleccionados] }),
    });
    setGuardandoAsignacion(false);
    const actualizado = await res.json();
    if (!res.ok) {
      showError(actualizado.error || MSG.errorGenerico);
      return;
    }
    setTurnos((prev) =>
      prev.map((t) => (t.id === actualizado.id ? { ...actualizado, empleados: actualizado.empleados } : t))
    );
    cerrarModal();
    cargar();
  }

  async function cambiarTurnoEmpleado(empleadoId: number, turnoId: string) {
    const res = await fetch(`/api/empleados/${empleadoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turnoId: turnoId ? Number(turnoId) : null }),
    });
    if (res.ok) cargar();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turnos Laborales"
        subtitle="Horarios laborales y asignación de personal por turno"
      />

      <div className="card grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <div>
          <label className="label-field">Buscar por nombre o descripción</label>
          <input className="input-field w-full" value={buscarQ} onChange={(e) => { setPage(1); setBuscarQ(e.target.value); }} placeholder="Matutino, operaciones…" />
        </div>
        <div>
          <label className="label-field">Buscar por horario</label>
          <input className="input-field w-full" value={filtroHorario} onChange={(e) => { setPage(1); setFiltroHorario(e.target.value); }} placeholder="08:00, 22:00…" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm pb-2">
            <input type="checkbox" checked={soloActivos} onChange={(e) => { setPage(1); setSoloActivos(e.target.checked); }} />
            Solo turnos activos
          </label>
        </div>
      </div>

      {puedeEscribir && (
      <form
        onSubmit={guardarTurno}
        className="rounded-xl p-5 space-y-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <h2 className="font-semibold">{editId ? "Editar turno" : "Crear turno"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label-field">Nombre</label>
            <input
              className="input-field w-full"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label-field">Hora de entrada</label>
            <input
              type="time"
              className="input-field w-full"
              value={form.horaInicio}
              onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label-field">Hora de salida</label>
            <input
              type="time"
              className="input-field w-full"
              value={form.horaFin}
              onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label-field">Descripción (opcional)</label>
            <input
              className="input-field w-full"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
        </div>
        {editId && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Turno activo
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary text-sm">
            {editId ? "Guardar cambios" : "Crear turno"}
          </button>
          {editId && (
            <button type="button" className="btn-outline text-sm" onClick={resetForm}>
              Cancelar edición
            </button>
          )}
        </div>
        {msg && <p className="text-sm" style={{ color: "var(--color-secondary)" }}>{msg}</p>}
      </form>
      )}

      {loading ? (
        <LoadingState label="Cargando turnos…" />
      ) : turnos.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center text-muted"
          style={{ border: "1px solid var(--color-border)" }}
        >
          No hay turnos registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {turnos.map((t) => (
            <article
              key={t.id}
              className="rounded-xl p-5 flex flex-col gap-4"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{t.nombre}</h3>
                  <p className="font-mono text-sm mt-1" style={{ color: "var(--color-primary-light)" }}>
                    Entrada {t.horaInicio} · Salida {t.horaFin}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-md"
                  style={{
                    background: t.activo ? "rgba(34,197,94,0.14)" : "rgba(107,114,128,0.14)",
                    color: t.activo ? "#166534" : "#4B5563",
                  }}
                >
                  {t.activo ? "Activo" : "Inactivo"}
                </span>
              </div>

              {t.descripcion && <p className="text-sm text-muted">{t.descripcion}</p>}

              <p className="text-sm font-medium">
                {t._count.empleados}{" "}
                {t._count.empleados === 1 ? "empleado asignado" : "empleados asignados"}
              </p>

              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  Empleados asignados
                </p>
                {(t.empleados?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted">Sin asignaciones</p>
                ) : (
                  <ul className="space-y-2 max-h-40 overflow-y-auto text-sm">
                    {t.empleados!.map((e) => (
                      <li
                        key={e.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-1 border-b"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <span>
                          {e.nombre} {e.apellidoPaterno}{" "}
                          <span className="text-muted font-mono text-xs">({e.numeroEmpleado})</span>
                        </span>
                        {puedeEscribir ? (
                        <select
                          className="input-field text-xs py-1 max-w-[160px]"
                          value={e.turnoId ?? ""}
                          onChange={(ev) => cambiarTurnoEmpleado(e.id, ev.target.value)}
                          aria-label={`Cambiar turno de ${e.nombre}`}
                        >
                          <option value="">Sin turno</option>
                          {turnosActivos.map((ot) => (
                            <option key={ot.id} value={ot.id}>
                              {ot.nombre}
                            </option>
                          ))}
                        </select>
                        ) : (
                          <span className="text-muted text-xs">
                            {turnos.find((t) => t.id === e.turnoId)?.nombre ?? "Sin turno"}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {puedeEscribir && (
              <div className="flex flex-wrap gap-2 pt-1 mt-auto">
                <button type="button" className="btn-primary text-sm" onClick={() => abrirAsignacion(t)}>
                  Asignar empleados
                </button>
                <button type="button" className="btn-outline text-sm" onClick={() => iniciarEdicion(t)}>
                  Editar
                </button>
                <button type="button" className="btn-outline text-sm" onClick={() => toggleActivo(t)}>
                  {t.activo ? "Desactivar" : "Activar"}
                </button>
                {t._count.empleados === 0 && (
                  <button type="button" className="btn-outline text-sm" onClick={() => eliminarODesactivar(t)}>
                    Eliminar
                  </button>
                )}
              </div>
              )}
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm mt-4">
          <span className="text-muted">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} className="btn-outline text-sm" onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button type="button" disabled={page >= totalPages} className="btn-outline text-sm" onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}

      {modalTurno && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-asignar-titulo"
        >
          <div
            className="w-full max-w-lg rounded-xl p-5 max-h-[85vh] flex flex-col"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <h2 id="modal-asignar-titulo" className="font-semibold text-lg mb-1">
              Asignar empleados — {modalTurno.nombre}
            </h2>
            <p className="text-sm text-muted mb-4">
              Horario {modalTurno.horaInicio} – {modalTurno.horaFin}
            </p>

            <input
              type="search"
              className="input-field w-full mb-3"
              placeholder="Buscar empleado…"
              value={buscarModal}
              onChange={(e) => setBuscarModal(e.target.value)}
            />

            <ul className="flex-1 overflow-y-auto space-y-1 border rounded-lg p-2 mb-4" style={{ borderColor: "var(--color-border)" }}>
              {empleadosFiltradosModal.map((e) => {
                const checked = seleccionados.has(e.id);
                return (
                  <li key={e.id}>
                    <label className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#F9FAFB] cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSeleccionados((prev) => {
                            const next = new Set(prev);
                            if (next.has(e.id)) next.delete(e.id);
                            else next.add(e.id);
                            return next;
                          });
                        }}
                      />
                      <span>
                        {e.nombre} {e.apellidoPaterno}{" "}
                        <span className="text-muted font-mono text-xs">{e.numeroEmpleado}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
              {empleadosFiltradosModal.length === 0 && (
                <li className="text-sm text-muted px-2 py-4 text-center">Sin resultados</li>
              )}
            </ul>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-outline text-sm" onClick={cerrarModal}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={guardandoAsignacion}
                onClick={guardarAsignacion}
              >
                {guardandoAsignacion ? "Guardando…" : "Guardar asignación"}
              </button>
            </div>
          </div>
        </div>
      )}
      {ConfirmDialogHost}
    </div>
  );
}
