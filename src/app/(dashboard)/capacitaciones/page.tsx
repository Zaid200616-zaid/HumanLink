"use client";

import { useEffect, useState } from "react";
import { fetchList } from "@/lib/fetch-client";
import { useSession } from "@/lib/use-session";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { MSG } from "@/lib/ui-messages";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";

interface Capacitacion {
  id: number;
  nombre: string;
  instructor: string | null;
  fechaInicio: string;
  cupoMaximo: number;
  cupoOcupado: number;
  cupoDisponible: number;
  porcentajeOcupacion: number;
  estado: string;
  inscrito: boolean;
}

const emptyCap = {
  nombre: "", descripcion: "", instructor: "", fechaInicio: "", fechaFin: "", cupoMaximo: "30", estado: "PROGRAMADA",
};

export default function CapacitacionesPage() {
  const { isEmpleado, canManage, loading: sessionLoading } = useSession();
  const { showSuccess, showError } = useToast();
  const [caps, setCaps] = useState<Capacitacion[]>([]);
  const [form, setForm] = useState(emptyCap);
  const [editId, setEditId] = useState<number | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  function cargar() {
    fetchList<Capacitacion>("/api/capacitaciones").then(setCaps);
  }

  useEffect(() => { cargar(); }, []);

  async function guardarCap(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      instructor: form.instructor || undefined,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin || undefined,
      cupoMaximo: Number(form.cupoMaximo) || 30,
      ...(editId ? { estado: form.estado } : {}),
    };
    const res = await fetch(editId ? `/api/capacitaciones/${editId}` : "/api/capacitaciones", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setForm(emptyCap);
      setEditId(null);
      showSuccess(MSG.capacitacionGuardada);
      cargar();
    } else {
      const d = await res.json();
      showError(d.error || MSG.errorGenerico);
    }
  }

  async function eliminarCap(id: number) {
    const res = await fetch(`/api/capacitaciones/${id}`, { method: "DELETE" });
    if (res.ok) {
      showSuccess(MSG.capacitacionCancelada);
      cargar();
    } else {
      showError(MSG.errorGenerico);
    }
    setConfirmEliminar(null);
  }

  async function inscribirse(id: number) {
    const res = await fetch(`/api/capacitaciones/${id}/inscribir`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showSuccess(MSG.inscripcionExitosa);
      cargar();
    } else {
      showError(data.error || MSG.errorGenerico);
    }
  }

  if (sessionLoading) return <LoadingState />;

  const capsFiltradas = caps.filter((c) => {
    if (filtroEstado && c.estado !== filtroEstado) return false;
    if (filtroTexto.trim()) {
      const q = filtroTexto.trim().toLowerCase();
      const texto = [c.nombre, c.instructor, c.estado].filter(Boolean).join(" ").toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Capacitaciones"
        subtitle={isEmpleado ? "Consulta e inscríbete en cursos disponibles" : "Planificación y seguimiento de cursos corporativos"}
      />

      {canManage && (
        <form onSubmit={guardarCap} className="card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="font-semibold md:col-span-2">{editId ? "Editar capacitación" : "Crear capacitación"}</h2>
          <input className="input-field" placeholder="Nombre del curso" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input className="input-field" placeholder="Nombre del instructor" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
          <input type="datetime-local" className="input-field" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} required />
          <input type="datetime-local" className="input-field" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
          <input type="number" className="input-field" placeholder="Cupo máximo" value={form.cupoMaximo} onChange={(e) => setForm({ ...form, cupoMaximo: e.target.value })} />
          <textarea className="input-field md:col-span-2" placeholder="Objetivos, contenido y duración del curso" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <button type="submit" className="btn-primary text-sm md:col-span-2 w-fit">{editId ? "Guardar" : "Crear"}</button>
        </form>
      )}

      <div className="card mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label-field">Buscar</label>
          <input
            className="input-field w-full"
            placeholder="Nombre del curso o instructor…"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
        </div>
        <div>
          <label className="label-field">Estado</label>
          <select className="input-field w-full" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="PROGRAMADA">Programada</option>
            <option value="EN_CURSO">En curso</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6">
        {caps.length === 0 ? (
          <div className="card text-center text-muted">No hay capacitaciones programadas</div>
        ) : capsFiltradas.length === 0 ? (
          <div className="card text-center text-muted">No hay capacitaciones que coincidan con los filtros</div>
        ) : (
          capsFiltradas.map((c) => (
            <div key={c.id} className="card">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{c.nombre}</h2>
                  {c.instructor && <p className="text-sm text-muted">Instructor: {c.instructor}</p>}
                  <p className="text-sm text-muted">
                    Inicio: {new Date(c.fechaInicio).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge estado={c.estado} />
                  {c.inscrito && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: "var(--color-primary)" }}>
                      Inscrito
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex gap-2">
                  <button type="button" className="text-sm link-action hover:underline" onClick={() => {
                    setEditId(c.id);
                    setForm({
                      nombre: c.nombre,
                      descripcion: "",
                      instructor: c.instructor || "",
                      fechaInicio: c.fechaInicio.slice(0, 16),
                      fechaFin: "",
                      cupoMaximo: String(c.cupoMaximo),
                      estado: c.estado,
                    });
                  }}>Editar</button>
                  <button type="button" className="text-sm link-danger hover:underline" onClick={() => setConfirmEliminar(c.id)}>Eliminar</button>
                </div>
              )}

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-[#2C3E50]">
                    {c.cupoOcupado} de {c.cupoMaximo} lugares ocupados
                  </span>
                  <span className="text-muted">{c.porcentajeOcupacion}%</span>
                </div>
                <div className="w-full h-4 bg-[#ECF0F1] rounded-full overflow-hidden">
                  <div
                    className="h-full hl-progress-fill rounded-full"
                    style={{ width: `${c.porcentajeOcupacion}%` }}
                  />
                </div>
              </div>

              {isEmpleado && !c.inscrito && (
                <button onClick={() => inscribirse(c.id)} className="btn-secondary mt-4">
                  Inscribirme en este curso
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={confirmEliminar !== null}
        title="Cancelar capacitación"
        message="¿Está seguro de cancelar esta capacitación? Esta acción puede afectar a los empleados inscritos."
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={() => confirmEliminar !== null && eliminarCap(confirmEliminar)}
      />
    </div>
  );
}
