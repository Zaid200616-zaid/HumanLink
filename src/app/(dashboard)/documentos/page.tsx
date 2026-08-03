"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TIPOS_DOCUMENTO } from "@/lib/documentos";
import { fetchList } from "@/lib/fetch-client";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FileText, Upload, Search, Eye, Download, Pencil, Trash2 } from "lucide-react";

type Doc = {
  id: number;
  tipo: string;
  nombre: string;
  rutaArchivo: string;
  observaciones: string | null;
  activo: boolean;
  createdAt: string;
  empleado: { id: number; nombre: string; apellidoPaterno: string; numeroEmpleado: string };
};

type EmpleadoOpt = { id: number; nombre: string; apellidoPaterno: string; numeroEmpleado: string };

const formVacío = {
  empleadoId: "",
  tipo: TIPOS_DOCUMENTO[0] as string,
  nombre: "",
  observaciones: "",
  activo: true,
};

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoOpt[]>([]);
  const [form, setForm] = useState(formVacío);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const docsFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return docs.filter((d) => {
      if (filtroTipo && d.tipo !== filtroTipo) return false;
      if (!q) return true;
      const blob = `${d.nombre} ${d.tipo} ${d.empleado.nombre} ${d.empleado.apellidoPaterno} ${d.empleado.numeroEmpleado}`.toLowerCase();
      return blob.includes(q);
    });
  }, [docs, buscar, filtroTipo]);

  const cargar = useCallback(() => {
    fetch("/api/documentos")
      .then((r) => r.json())
      .then((data) => {
        setDocs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    cargar();
    fetchList<EmpleadoOpt>("/api/empleados?activo=true&limit=500").then(setEmpleados);
  }, [cargar]);

  function asignarArchivo(file: File | null) {
    if (!file) return;
    const ok = [".pdf", ".jpg", ".jpeg", ".png"].some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!ok) {
      setMsg("Error: solo PDF, JPG o PNG");
      return;
    }
    setArchivo(file);
    if (!form.nombre) setForm((f) => ({ ...f, nombre: file.name.replace(/\.[^.]+$/, "") }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!editId && !archivo) {
      setMsg("Error: seleccione un archivo");
      return;
    }
    setSubiendo(true);
    setUploadProgress(10);
    const fd = new FormData();
    fd.set("empleadoId", form.empleadoId);
    fd.set("tipo", form.tipo);
    fd.set("nombre", form.nombre);
    fd.set("observaciones", form.observaciones);
    fd.set("activo", form.activo ? "true" : "false");
    if (archivo) fd.set("archivo", archivo);

    const tick = setInterval(() => setUploadProgress((p) => (p !== null && p < 90 ? p + 15 : p)), 200);

    const res = await fetch(editId ? `/api/documentos/${editId}` : "/api/documentos", {
      method: editId ? "PUT" : "POST",
      body: fd,
    });
    clearInterval(tick);
    setUploadProgress(100);
    const d = await res.json();
    setSubiendo(false);
    setTimeout(() => setUploadProgress(null), 800);
    if (!res.ok) {
      setMsg(d.error || "Error al guardar");
      return;
    }
    setMsg(editId ? "Documento actualizado" : "Documento registrado");
    setForm(formVacío);
    setArchivo(null);
    setEditId(null);
    cargar();
  }

  function editar(doc: Doc) {
    setEditId(doc.id);
    setForm({
      empleadoId: String(doc.empleado.id),
      tipo: doc.tipo,
      nombre: doc.nombre,
      observaciones: doc.observaciones || "",
      activo: doc.activo,
    });
    setArchivo(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminar(id: number) {
    const res = await fetch(`/api/documentos/${id}`, { method: "DELETE" });
    if (res.ok) cargar();
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">
          Gestión de Documentos
        </h1>
        <p className="text-sm text-[#7F8C8D] mt-1">RF-H18 · RNF17 Usabilidad — búsqueda, vista previa y carga drag &amp; drop</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        <form
          onSubmit={enviar}
          className="rounded-xl p-5 space-y-3 h-fit"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <h2 className="font-semibold">{editId ? "Editar documento" : "Registrar documento"}</h2>

          <div>
            <label className="label-field">Empleado</label>
            <select
              className="input-field w-full"
              value={form.empleadoId}
              onChange={(e) => setForm({ ...form, empleadoId: e.target.value })}
              required
              disabled={!!editId}
            >
              <option value="">Seleccione…</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} {emp.apellidoPaterno} ({emp.numeroEmpleado})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field">Tipo de documento</label>
            <select
              className="input-field w-full"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              required
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field">Nombre del documento</label>
            <input
              className="input-field w-full"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label-field flex items-center gap-1"><Upload size={14} /> Archivo (PDF, JPG, PNG)</label>
            <div
              className={`rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${dragOver ? "border-[#2874A6] bg-[#2874A6]/5" : "border-[#D5DBDB]"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                asignarArchivo(e.dataTransfer.files?.[0] || null);
              }}
            >
              Arrastre el archivo aquí o
              <label className="text-[#2874A6] cursor-pointer hover:underline ml-1">
                selecciónelo
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => asignarArchivo(e.target.files?.[0] || null)} />
              </label>
              {archivo && <p className="mt-2 text-xs text-[#7F8C8D]">Seleccionado: {archivo.name}</p>}
            </div>
            {uploadProgress !== null && (
              <div className="mt-2">
                <div className="h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                  <div className="h-full bg-[#2874A6] transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-[#7F8C8D] mt-1">{subiendo ? "Subiendo documento…" : "Completado"}</p>
              </div>
            )}
            {editId && <p className="text-xs text-[#7F8C8D] mt-1">Opcional: deje vacío para conservar el archivo actual.</p>}
          </div>

          <div>
            <label className="label-field">Observaciones</label>
            <textarea
              className="input-field w-full"
              rows={2}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Estado activo
          </label>

          {msg && <p className="text-sm" style={{ color: msg.includes("Error") ? "var(--color-danger)" : "var(--color-secondary)" }}>{msg}</p>}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm flex-1 flex items-center justify-center gap-2" disabled={subiendo}>
              <FileText size={16} /> {editId ? "Guardar cambios" : "Guardar documento"}
            </button>
            {editId && (
              <button
                type="button"
                className="btn-outline text-sm"
                onClick={() => { setEditId(null); setForm(formVacío); setArchivo(null); }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="hl-table-shell flex flex-col">
          <div className="hl-table-toolbar">
            <div className="flex-1 min-w-[200px]">
              <label className="label-field flex items-center gap-1"><Search size={14} /> Buscar documentos</label>
              <input className="input-field w-full" placeholder="Nombre, empleado, número…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            </div>
            <div className="min-w-[160px]">
              <label className="label-field">Tipo</label>
              <select className="input-field w-full" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">Todos</option>
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <p className="p-5 text-[#7F8C8D]">Cargando…</p>
          ) : (
            <div className="hl-table-wrap">
              <table className="hl-table min-w-[720px]">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Tipo</th>
                    <th>Nombre</th>
                    <th>Fecha de carga</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {docsFiltrados.map((d) => (
                    <tr key={d.id}>
                      <td>
                        {d.empleado.nombre} {d.empleado.apellidoPaterno}
                      </td>
                      <td className="px-4 py-3">{d.tipo}</td>
                      <td className="px-4 py-3">{d.nombre}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleDateString("es-MX")}
                      </td>
                      <td>
                        <span className={d.activo ? "hl-badge hl-badge-success" : "hl-badge hl-badge-neutral"}>
                          {d.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2 text-xs items-center">
                          <button type="button" onClick={() => setPreview(d)} className="text-[#2874A6] hover:underline inline-flex items-center gap-0.5">
                            <Eye size={12} /> Vista previa
                          </button>
                          <a href={d.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-[#2874A6] hover:underline inline-flex items-center gap-0.5">
                            <Eye size={12} /> Abrir
                          </a>
                          <a href={d.rutaArchivo} download className="text-[#2874A6] hover:underline inline-flex items-center gap-0.5">
                            <Download size={12} /> Descargar
                          </a>
                          <button type="button" onClick={() => editar(d)} className="text-[#2874A6] hover:underline inline-flex items-center gap-0.5">
                            <Pencil size={12} /> Editar
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(d.id)} className="text-red-600 hover:underline inline-flex items-center gap-0.5">
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {docsFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#7F8C8D]">
                        No hay documentos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreview(null)}>
          <div className="card max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold mb-2 flex items-center gap-2"><FileText size={18} /> {preview.nombre}</h2>
            <p className="text-sm text-[#7F8C8D] mb-3">{preview.tipo} · {preview.empleado.nombre} {preview.empleado.apellidoPaterno}</p>
            <div className="flex-1 min-h-[320px] rounded-lg overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
              {preview.rutaArchivo.match(/\.pdf(\?|$)/i) ? (
                <iframe title="Vista previa" src={preview.rutaArchivo} className="w-full h-[60vh]" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.rutaArchivo} alt={preview.nombre} className="max-h-[60vh] mx-auto object-contain" />
              )}
            </div>
            <button type="button" className="btn-outline text-sm mt-4" onClick={() => setPreview(null)}>Cerrar vista previa</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar documento"
        message="¿Confirma eliminar este archivo del expediente? Esta acción no se puede deshacer."
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId !== null && eliminar(confirmDeleteId)}
      />
    </div>
  );
}
