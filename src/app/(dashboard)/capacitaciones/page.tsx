"use client";

import { useEffect, useState } from "react";
import { fetchList } from "@/lib/fetch-client";
import { useSession } from "@/lib/use-session";
import ConfirmDialog from "@/components/ConfirmDialog";

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
  const [caps, setCaps] = useState<Capacitacion[]>([]);
  const [form, setForm] = useState(emptyCap);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);

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
      setMsg("Capacitación guardada");
      cargar();
    }
  }

  async function eliminarCap(id: number) {
    const res = await fetch(`/api/capacitaciones/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsg("Capacitación cancelada");
      cargar();
    }
    setConfirmEliminar(null);
  }

  async function inscribirse(id: number) {
    const res = await fetch(`/api/capacitaciones/${id}/inscribir`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setMsg("¡Inscripción exitosa!");
      cargar();
    } else {
      setMsg(data.error || "No se pudo inscribir");
    }
  }

  if (sessionLoading) return <p>Cargando...</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Capacitaciones</h1>
        <p className="text-[#7F8C8D]">
          RF-H05 · {isEmpleado ? "Consulta e inscríbete en cursos disponibles" : "Administración de cursos"}
        </p>
      </div>

      {msg && <p className="mb-4 text-sm text-[#17A589]">{msg}</p>}

      {canManage && (
        <form onSubmit={guardarCap} className="card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="font-semibold md:col-span-2">{editId ? "Editar capacitación" : "Crear capacitación"}</h2>
          <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input className="input-field" placeholder="Instructor" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
          <input type="datetime-local" className="input-field" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} required />
          <input type="datetime-local" className="input-field" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
          <input type="number" className="input-field" placeholder="Cupo" value={form.cupoMaximo} onChange={(e) => setForm({ ...form, cupoMaximo: e.target.value })} />
          <textarea className="input-field md:col-span-2" placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <button type="submit" className="btn-primary text-sm md:col-span-2 w-fit">{editId ? "Guardar" : "Crear"}</button>
        </form>
      )}

      <div className="grid gap-6">
        {caps.length === 0 ? (
          <div className="card text-center text-[#7F8C8D]">No hay capacitaciones programadas</div>
        ) : (
          caps.map((c) => (
            <div key={c.id} className="card">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{c.nombre}</h2>
                  {c.instructor && <p className="text-sm text-[#7F8C8D]">Instructor: {c.instructor}</p>}
                  <p className="text-sm text-[#7F8C8D]">
                    Inicio: {new Date(c.fechaInicio).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#D5F5E3] text-[#17A589] rounded-full text-xs font-medium">
                    {c.estado}
                  </span>
                  {c.inscrito && (
                    <span className="px-3 py-1 bg-[#1B4F72] text-white rounded-full text-xs font-medium">
                      Inscrito
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex gap-2">
                  <button type="button" className="text-sm text-[#2874A6] hover:underline" onClick={() => {
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
                  <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => setConfirmEliminar(c.id)}>Eliminar</button>
                </div>
              )}

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-[#2C3E50]">
                    {c.cupoOcupado} de {c.cupoMaximo} lugares ocupados
                  </span>
                  <span className="text-[#7F8C8D]">{c.porcentajeOcupacion}%</span>
                </div>
                <div className="w-full h-4 bg-[#ECF0F1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#17A589] rounded-full transition-all duration-500"
                    style={{ width: `${c.porcentajeOcupacion}%` }}
                  />
                </div>
              </div>

              {isEmpleado && !c.inscrito && c.cupoDisponible > 0 && (
                <button onClick={() => inscribirse(c.id)} className="btn-secondary mt-4">
                  Inscribirme en este curso
                </button>
              )}
              {isEmpleado && !c.inscrito && c.cupoDisponible <= 0 && (
                <p className="mt-4 text-sm" style={{ color: "var(--color-warning)" }}>Cupo lleno</p>
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
