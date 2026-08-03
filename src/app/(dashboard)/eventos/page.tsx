"use client";

import { useEffect, useState } from "react";
import { fetchList } from "@/lib/fetch-client";
import { useSession } from "@/lib/use-session";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

interface Evento {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  ubicacion: string | null;
  inscripcionAbierta: boolean;
  resumen: {
    totalConvocados: number;
    confirmados: number;
    rechazados: number;
    pendientes: number;
  };
  miRespuesta: { id: number; respuesta: string } | null;
}

const emptyEvento = {
  titulo: "", descripcion: "", fecha: "", ubicacion: "", inscripcionAbierta: true,
};

export default function EventosPage() {
  const { canManage, isAdmin, isEmpleado, loading: sessionLoading } = useSession();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [form, setForm] = useState(emptyEvento);
  const [msg, setMsg] = useState("");

  function cargar() {
    fetchList<Evento>("/api/eventos").then(setEventos);
  }

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    const id = setInterval(() => cargar(), 20000);
    return () => clearInterval(id);
  }, []);

  async function responder(eventoId: number, respuesta: "CONFIRMADO" | "RECHAZADO" | "PENDIENTE") {
    const res = await fetch(`/api/eventos/${eventoId}/respuesta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respuesta }),
    });
    if (res.ok) cargar();
  }

  async function darDeBaja(eventoId: number) {
    if (!confirm("¿Dar de baja este evento? Quedará inactivo sin eliminar el registro.")) return;
    const res = await fetch(`/api/eventos/${eventoId}`, { method: "PATCH" });
    if (res.ok) cargar();
  }

  async function crearEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo || !form.fecha) return;

    const res = await fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMsg("Evento creado. Los empleados podrán inscribirse si está abierto.");
      setForm(emptyEvento);
      cargar();
    }
  }

  if (sessionLoading) return <p>Cargando...</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Eventos Organizacionales</h1>
        <p className="text-[#7F8C8D]">RF-H17 · RNF-PE01 Resumen numérico de asistencia</p>
      </div>

      {canManage && (
        <form onSubmit={crearEvento} className="card mb-6 space-y-4">
          <h2 className="font-semibold text-[#1B4F72]">Crear evento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Título</label>
              <input className="input-field" value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Fecha y hora</label>
              <input type="datetime-local" className="input-field" value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label-field">Ubicación</label>
            <input className="input-field" value={form.ubicacion}
              onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <textarea className="input-field" value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.inscripcionAbierta}
              onChange={(e) => setForm({ ...form, inscripcionAbierta: e.target.checked })} />
            Permitir que empleados se inscriban libremente
          </label>
          {msg && <p className="text-[#17A589] text-sm">{msg}</p>}
          <button type="submit" className="btn-primary">Publicar evento</button>
        </form>
      )}

      {eventos.length === 0 ? (
        <div className="card text-center text-[#7F8C8D]">No hay eventos programados</div>
      ) : (
        eventos.map((e) => (
          <div key={e.id} className="card mb-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1B4F72]">{e.titulo}</h2>
                {e.descripcion && <p className="text-sm text-[#7F8C8D] mt-1">{e.descripcion}</p>}
                <p className="text-sm mt-2">
                  {new Date(e.fecha).toLocaleString("es-MX")}
                  {e.ubicacion && ` · ${e.ubicacion}`}
                </p>
                {e.inscripcionAbierta && (
                  <span className="inline-block mt-2 text-xs bg-[#D5F5E3] text-[#17A589] px-2 py-1 rounded-full">
                    Inscripción abierta
                  </span>
                )}
              </div>

              {isEmpleado && (
                <div className="flex flex-col gap-2 items-end">
                  {e.miRespuesta ? (
                    <>
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                        e.miRespuesta.respuesta === "CONFIRMADO" ? "bg-green-100 text-green-700" :
                        e.miRespuesta.respuesta === "RECHAZADO" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        Tu respuesta: {e.miRespuesta.respuesta}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => responder(e.id, "CONFIRMADO")} className="btn-secondary text-sm py-1">
                          Confirmar
                        </button>
                        <button onClick={() => responder(e.id, "RECHAZADO")} className="btn-outline text-sm py-1">
                          No asistiré
                        </button>
                      </div>
                    </>
                  ) : e.inscripcionAbierta ? (
                    <div className="flex gap-2">
                      <button onClick={() => responder(e.id, "CONFIRMADO")} className="btn-secondary text-sm py-1">
                        Inscribirme / Confirmar
                      </button>
                      <button onClick={() => responder(e.id, "RECHAZADO")} className="btn-outline text-sm py-1">
                        No asistiré
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#7F8C8D]">Solo por invitación</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)" }}>
                <Users className="shrink-0" size={28} style={{ color: "var(--color-primary)" }} />
                <div>
                  <p className="text-3xl font-bold leading-none" style={{ color: "var(--color-primary)" }}>{e.resumen.totalConvocados}</p>
                  <p className="text-xs text-[#7F8C8D] mt-1">Empleados convocados</p>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)" }}>
                <UserCheck className="shrink-0 text-green-600" size={28} />
                <div>
                  <p className="text-3xl font-bold leading-none text-green-700">{e.resumen.confirmados}</p>
                  <p className="text-xs text-[#7F8C8D] mt-1">Confirmados</p>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" }}>
                <UserX className="shrink-0 text-red-600" size={28} />
                <div>
                  <p className="text-3xl font-bold leading-none text-red-700">{e.resumen.rechazados}</p>
                  <p className="text-xs text-[#7F8C8D] mt-1">Rechazados</p>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)" }}>
                <Clock className="shrink-0 text-amber-600" size={28} />
                <div>
                  <p className="text-3xl font-bold leading-none text-amber-700">{e.resumen.pendientes}</p>
                  <p className="text-xs text-[#7F8C8D] mt-1">Pendientes</p>
                </div>
              </div>
            </div>

            {canManage && (
              <p className="text-xs text-[#7F8C8D] mt-2">Los contadores se actualizan al confirmar o rechazar asistencia.</p>
            )}
            {isAdmin && (
              <div className="flex justify-end mt-3">
                <button type="button" className="text-red-600 text-sm hover:underline" onClick={() => darDeBaja(e.id)}>
                  Dar de baja evento
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
