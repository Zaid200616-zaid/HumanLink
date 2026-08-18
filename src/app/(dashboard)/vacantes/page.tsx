"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchList } from "@/lib/fetch-client";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface Vacante {
  id: number;
  titulo: string;
  descripcion: string;
  requisitos: string | null;
  cupoTotal: number;
  cupoDisponible: number;
  estado: string;
  departamentoId: number;
  modalidad?: string | null;
  tipoEmpleo?: string | null;
  ubicacion?: string | null;
  salario?: string | null;
  departamento: { id: number; nombre: string; organizacion: { nombre: string } };
  _count: { candidatos: number };
}

type Depto = { id: number; nombre: string; organizacion: { nombre: string } };

const formVacío = {
  titulo: "",
  descripcion: "",
  requisitos: "",
  departamentoId: "",
  cupoTotal: "1",
  estado: "ABIERTA",
  modalidad: "",
  tipoEmpleo: "",
  ubicacion: "",
  salario: "",
};

export default function VacantesPage() {
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [deptos, setDeptos] = useState<Depto[]>([]);
  const [form, setForm] = useState(formVacío);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  const cargar = useCallback(() => {
    fetch("/api/vacantes").then((r) => r.json()).then(setVacantes);
  }, []);

  useEffect(() => {
    cargar();
    fetchList<Depto>("/api/departamentos").then(setDeptos);
  }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      requisitos: form.requisitos.trim() || undefined,
      departamentoId: Number(form.departamentoId),
      cupoTotal: Number(form.cupoTotal) || 1,
      modalidad: form.modalidad.trim() || undefined,
      tipoEmpleo: form.tipoEmpleo.trim() || undefined,
      ubicacion: form.ubicacion.trim() || undefined,
      salario: form.salario.trim() || undefined,
      ...(editId ? { estado: form.estado as "ABIERTA" | "CERRADA" | "PAUSADA" } : {}),
    };
    const res = await fetch(editId ? `/api/vacantes/${editId}` : "/api/vacantes", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Error al guardar");
      return;
    }
    setMsg(editId ? "Vacante actualizada" : "Vacante creada");
    setForm(formVacío);
    setEditId(null);
    cargar();
  }

  function editar(v: Vacante) {
    setEditId(v.id);
    setForm({
      titulo: v.titulo,
      descripcion: v.descripcion,
      requisitos: v.requisitos || "",
      departamentoId: String(v.departamentoId),
      cupoTotal: String(v.cupoTotal),
      estado: v.estado,
      modalidad: v.modalidad || "",
      tipoEmpleo: v.tipoEmpleo || "",
      ubicacion: v.ubicacion || "",
      salario: v.salario || "",
    });
  }

  async function eliminar(v: Vacante) {
    const cerrar = v._count.candidatos > 0;
    const ok = await confirm(
      cerrar ? "Cerrar vacante" : "Eliminar vacante",
      cerrar ? "¿Cerrar/desactivar esta vacante?" : "¿Eliminar vacante?"
    );
    if (!ok) return;
    const res = await fetch(`/api/vacantes/${v.id}`, { method: "DELETE" });
    if (res.ok) cargar();
  }

  const vacantesFiltradas = vacantes.filter((v) => {
    if (filtroEstado && v.estado !== filtroEstado) return false;
    if (filtroTexto.trim()) {
      const q = filtroTexto.trim().toLowerCase();
      const texto = [v.titulo, v.departamento.nombre, v.estado].join(" ").toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Vacantes"
        subtitle="Gestión de puestos y oportunidades laborales"
        actions={
          <Link href="/#vacantes" className="btn-secondary text-sm" target="_blank">
            Ver vacantes en el sitio web
          </Link>
        }
      />

      <form onSubmit={guardar} className="card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <h2 className="font-semibold md:col-span-2">{editId ? "Editar vacante" : "Crear vacante"}</h2>
        <div>
          <label className="label-field">Título</label>
          <input className="input-field w-full" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
        </div>
        <div>
          <label className="label-field">Departamento</label>
          <select className="input-field w-full" value={form.departamentoId} onChange={(e) => setForm({ ...form, departamentoId: e.target.value })} required>
            <option value="">Seleccione…</option>
            {deptos.map((d) => (
              <option key={d.id} value={d.id}>{d.nombre} · {d.organizacion.nombre}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label-field">Descripción</label>
          <textarea className="input-field w-full min-h-[80px]" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required minLength={10} />
        </div>
        <div className="md:col-span-2">
          <label className="label-field">Requisitos</label>
          <input className="input-field w-full" value={form.requisitos} onChange={(e) => setForm({ ...form, requisitos: e.target.value })} />
        </div>
        <div>
          <label className="label-field">Modalidad (visible en vacantes)</label>
          <select className="input-field w-full" value={form.modalidad} onChange={(e) => setForm({ ...form, modalidad: e.target.value })}>
            <option value="">Por defecto: Presencial</option>
            <option value="Presencial">Presencial</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Remoto">Remoto</option>
          </select>
        </div>
        <div>
          <label className="label-field">Tipo de empleo</label>
          <select className="input-field w-full" value={form.tipoEmpleo} onChange={(e) => setForm({ ...form, tipoEmpleo: e.target.value })}>
            <option value="">Por defecto: Tiempo completo</option>
            <option value="Tiempo completo">Tiempo completo</option>
            <option value="Medio tiempo">Medio tiempo</option>
            <option value="Temporal">Temporal</option>
          </select>
        </div>
        <div>
          <label className="label-field">Ubicación</label>
          <input className="input-field w-full" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Ciudad o sede" />
        </div>
        <div>
          <label className="label-field">Salario (texto público)</label>
          <input className="input-field w-full" value={form.salario} onChange={(e) => setForm({ ...form, salario: e.target.value })} placeholder="Ej. $15,000 - $18,000 MXN" />
        </div>
        <div>
          <label className="label-field">Cupo total</label>
          <input type="number" min={1} className="input-field w-full" value={form.cupoTotal} onChange={(e) => setForm({ ...form, cupoTotal: e.target.value })} />
        </div>
        {editId && (
          <div>
            <label className="label-field">Estado</label>
            <select className="input-field w-full" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="ABIERTA">Abierta</option>
              <option value="PAUSADA">Pausada</option>
              <option value="CERRADA">Cerrada</option>
            </select>
          </div>
        )}
        <div className="md:col-span-2 flex gap-2 items-center">
          <button type="submit" className="btn-primary text-sm">{editId ? "Guardar" : "Crear"}</button>
          {editId && (
            <button type="button" className="btn-outline text-sm" onClick={() => { setEditId(null); setForm(formVacío); }}>Cancelar</button>
          )}
          {msg && <span className="text-sm text-muted">{msg}</span>}
        </div>
      </form>

      <div className="card mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label-field">Buscar</label>
          <input
            className="input-field w-full"
            placeholder="Título o departamento…"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
        </div>
        <div>
          <label className="label-field">Estado</label>
          <select className="input-field w-full" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="ABIERTA">Abierta</option>
            <option value="PAUSADA">Pausada</option>
            <option value="CERRADA">Cerrada</option>
          </select>
        </div>
      </div>

      <div className="hl-table-shell">
        <div className="hl-table-wrap">
        <table className="hl-table min-w-[720px]">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3">Vacante</th>
              <th className="pb-3">Departamento</th>
              <th className="pb-3">Cupo</th>
              <th className="pb-3">Estado</th>
              <th className="pb-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vacantesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  {vacantes.length === 0 ? "No hay vacantes registradas" : "Ninguna vacante coincide con los filtros"}
                </td>
              </tr>
            ) : (
            vacantesFiltradas.map((v) => (
              <tr key={v.id} className="border-b hover:bg-[var(--color-surface-2)]">
                <td className="py-3 font-medium">{v.titulo}</td>
                <td className="py-3">{v.departamento.nombre}</td>
                <td className="py-3">{v.cupoDisponible}/{v.cupoTotal} · {v._count.candidatos} cand.</td>
                <td className="py-3"><StatusBadge estado={v.estado} /></td>
                <td className="py-3">
                  <button type="button" className="link-action mr-3" onClick={() => editar(v)}>Editar</button>
                  <button type="button" className="link-danger" onClick={() => eliminar(v)}>Eliminar</button>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      {ConfirmDialogHost}
    </div>
  );
}
