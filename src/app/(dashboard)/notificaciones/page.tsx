"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useSession } from "@/lib/use-session";
import { formatDateTime } from "@/lib/format-date";

const TIPO_NOTIFICACION: Record<string, string> = {
  SISTEMA: "Sistema",
  CAPACITACION: "Capacitación",
  SOLICITUD: "Solicitud",
  CONTRATACION: "Contratación",
  EVALUACION: "Evaluación",
  QUEJA: "Queja laboral",
  EVENTO: "Evento",
};

function labelTipoNotificacion(tipo: string): string {
  return TIPO_NOTIFICACION[tipo] ?? tipo;
}
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  createdAt: string;
  usuarioId?: number;
  usuario?: { email: string };
}

type UsuarioOpt = { id: number; email: string };

export default function NotificacionesPage() {
  const { canManage } = useSession();
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [form, setForm] = useState({ usuarioId: "", titulo: "", mensaje: "", tipo: "SISTEMA" });
  const [editId, setEditId] = useState<number | null>(null);
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  function cargar() {
    const url = canManage ? "/api/notificaciones?gestion=1" : "/api/notificaciones";
    fetch(url).then((r) => r.json()).then(setNotifs);
  }

  useEffect(() => {
    cargar();
    if (canManage) {
      fetch("/api/usuarios/roles").then((r) => r.json()).then(setUsuarios);
    }
  }, [canManage]);

  async function marcarLeida(id: number) {
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, leida: true }),
    });
    cargar();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    const res = await fetch("/api/notificaciones", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editId
          ? { id: editId, titulo: form.titulo, mensaje: form.mensaje, tipo: form.tipo }
          : { ...form, usuarioId: Number(form.usuarioId) }
      ),
    });
    if (res.ok) {
      setForm({ usuarioId: "", titulo: "", mensaje: "", tipo: "SISTEMA" });
      setEditId(null);
      cargar();
    }
  }

  async function eliminar(id: number) {
    const ok = await confirm("Eliminar notificación", "¿Eliminar notificación?");
    if (!ok) return;
    await fetch(`/api/notificaciones?id=${id}`, { method: "DELETE" });
    cargar();
  }

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        subtitle={canManage ? "Administración de alertas del personal" : "Tus alertas y avisos recientes"}
      />

      {canManage && (
        <form onSubmit={guardar} className="card mb-6 space-y-3">
          <h2 className="font-semibold">{editId ? "Editar notificación" : "Crear notificación"}</h2>
          {!editId && (
            <select className="input-field w-full" value={form.usuarioId} onChange={(e) => setForm({ ...form, usuarioId: e.target.value })} required>
              <option value="">Usuario destino…</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
          )}
          <input className="input-field w-full" placeholder="Asunto del aviso" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
          <textarea className="input-field w-full min-h-[80px]" placeholder="Mensaje para el destinatario" value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} required />
          <input className="input-field w-full" placeholder="Categoría: Sistema, Capacitación, Solicitud…" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
          <button type="submit" className="btn-primary text-sm">{editId ? "Guardar" : "Crear"}</button>
        </form>
      )}

      <div className="space-y-3">
        {notifs.map((n) => (
          <div key={n.id} className="card flex gap-4" style={!n.leida ? { borderLeft: "4px solid var(--color-primary)" } : undefined}>
            <Bell size={20} className={n.leida ? "text-muted" : "text-[var(--color-primary)]"} />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{n.titulo}</p>
                {!n.leida && <Badge variant="primary">Nueva</Badge>}
              </div>
              <p className="text-sm text-muted">{n.mensaje}</p>
              <p className="text-xs text-muted mt-1">
                {formatDateTime(n.createdAt)} · {labelTipoNotificacion(n.tipo)}
                {n.usuario && ` · ${n.usuario.email}`}
              </p>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              {!n.leida && (
                <button type="button" onClick={() => marcarLeida(n.id)} className="text-[var(--color-primary)] hover:underline">Marcar leída</button>
              )}
              {canManage && (
                <>
                  <button type="button" className="text-[var(--color-primary)] hover:underline" onClick={() => { setEditId(n.id); setForm({ usuarioId: "", titulo: n.titulo, mensaje: n.mensaje, tipo: n.tipo }); }}>Editar</button>
                  <button type="button" className="link-danger" onClick={() => eliminar(n.id)}>Eliminar</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {ConfirmDialogHost}
    </div>
  );
}
