"use client";



import { useEffect, useState } from "react";

import { fetchList } from "@/lib/fetch-client";

import { useSession } from "@/lib/use-session";

import ExpedienteVacacionesPanel from "@/components/ExpedienteVacacionesPanel";
import { useToast } from "@/components/ToastProvider";
import { MSG } from "@/lib/ui-messages";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

import Avatar from "@/components/Avatar";

import { Eye, X } from "lucide-react";



interface Solicitud {

  id: number;

  empleadoId: number;

  tipo: string;

  fechaInicio: string;

  fechaFin: string;

  diasSolicitados: number;

  motivo: string;

  estado: string;

  respuesta?: string;

  empleado: {

    id: number;

    nombre: string;

    apellidoPaterno: string;

    fotoUrl?: string | null;

    departamento?: { nombre: string } | null;

  };

}



const emptyForm = { tipo: "PERMISO", fechaInicio: "", fechaFin: "", motivo: "" };



export default function SolicitudesPage() {

  const { canManage, isEmpleado, isSupervisor, loading: sessionLoading } = useSession();
  const { showSuccess, showError } = useToast();
  const [solicitudesEquipo, setSolicitudesEquipo] = useState<Solicitud[]>([]);

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

  const [form, setForm] = useState(emptyForm);

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [expedienteModal, setExpedienteModal] = useState<Solicitud | null>(null);

  const [resolverModal, setResolverModal] = useState<{ solicitud: Solicitud; estado: string } | null>(null);

  const [respuestaCustom, setRespuestaCustom] = useState("");

  const [miExpediente, setMiExpediente] = useState<{ diasDisponibles: number; diasTotales: number; diasUsados: number } | null>(null);



  function cargar() {

    fetchList<Solicitud>("/api/solicitudes").then(setSolicitudes);

  }



  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (isSupervisor) {
      fetchList<Solicitud>("/api/solicitudes?vista=equipo").then(setSolicitudesEquipo);
    }
  }, [isSupervisor]);

  async function resolverSupervisor(id: number, estado: string) {
    const res = await fetch("/api/solicitudes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado, accion: "supervisor" }),
    });
    if (res.ok) showSuccess(MSG.solicitudActualizada);
    else showError(MSG.errorPermiso);
    fetchList<Solicitud>("/api/solicitudes?vista=equipo").then(setSolicitudesEquipo);
    cargar();
  }



  useEffect(() => {

    if (isEmpleado) {

      fetch("/api/auth/me")

        .then((r) => r.json())

        .then((me) => {

          if (me.empleado?.id) {

            fetch(`/api/vacaciones/expediente/${me.empleado.id}`)

              .then((r) => r.json())

              .then((exp) => setMiExpediente(exp));

          }

        });

    }

  }, [isEmpleado]);



  async function enviarSolicitud(e: React.FormEvent) {

    e.preventDefault();

    setError("");



    if (!form.fechaInicio || !form.fechaFin || form.motivo.length < 10) {
      setError("Complete fechas y motivo (mínimo 10 caracteres).");
      return;
    }



    setSubmitting(true);

    const res = await fetch("/api/solicitudes", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(form),

    });

    const data = await res.json();

    setSubmitting(false);



    if (!res.ok) {
      showError(data.error || MSG.errorGenerico);
      return;
    }

    showSuccess(MSG.solicitudEnviada);

    setForm(emptyForm);

    cargar();

  }



  async function resolver() {

    if (!resolverModal) return;

    const res = await fetch("/api/solicitudes", {

      method: "PATCH",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        id: resolverModal.solicitud.id,

        estado: resolverModal.estado,

        respuesta: respuestaCustom || undefined,

      }),

    });

    if (res.ok) {
      showSuccess(
        resolverModal.estado === "APROBADA"
          ? MSG.solicitudAprobada
          : resolverModal.estado === "RECHAZADA"
            ? MSG.solicitudRechazada
            : MSG.solicitudActualizada
      );
    } else {
      showError(MSG.errorPermiso);
    }

    setResolverModal(null);

    setRespuestaCustom("");

    setExpedienteModal(null);

    cargar();

  }



  if (sessionLoading) return <LoadingState />;



  return (

    <div>

      <PageHeader
        title="Permisos y Vacaciones"
        subtitle="Gestión de permisos, vacaciones y aprobaciones del personal"
      />



      {isEmpleado && miExpediente && (

        <div className="card mb-6 grid grid-cols-3 gap-4 text-center">

          <div>

            <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{miExpediente.diasTotales}</p>

            <p className="text-xs text-muted">Días anuales</p>

          </div>

          <div>

            <p className="text-2xl font-bold text-success">{miExpediente.diasDisponibles}</p>

            <p className="text-xs text-muted">Disponibles</p>

          </div>

          <div>

            <p className="text-2xl font-bold text-warning">{miExpediente.diasUsados}</p>

            <p className="text-xs text-muted">Usados</p>

          </div>

        </div>

      )}



      {isEmpleado && (

        <form onSubmit={enviarSolicitud} className="card mb-6 space-y-4">

          <h2 className="font-semibold" style={{ color: "var(--color-primary)" }}>Nueva solicitud</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>

              <label className="label-field">Tipo</label>

              <select

                className="input-field"

                value={form.tipo}

                onChange={(e) => setForm({ ...form, tipo: e.target.value })}

              >

                <option value="PERMISO">Permiso</option>

                <option value="VACACION">Vacación</option>

              </select>

            </div>

            <div>

              <label className="label-field">Fecha inicio</label>

              <input

                type="date"

                className="input-field"

                value={form.fechaInicio}

                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}

                required

              />

            </div>

            <div>

              <label className="label-field">Fecha fin</label>

              <input

                type="date"

                className="input-field"

                value={form.fechaFin}

                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}

                required

              />

            </div>

          </div>

          <div>

            <label className="label-field">Motivo</label>

            <textarea

              className="input-field min-h-[80px]"

              value={form.motivo}

              onChange={(e) => setForm({ ...form, motivo: e.target.value })}

              placeholder="Indique el motivo de la solicitud"

              required

              minLength={10}

            />

          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>

            {submitting ? "Enviando..." : "Enviar solicitud"}

          </button>

        </form>

      )}



      {isSupervisor && solicitudesEquipo.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4" style={{ color: "var(--color-primary)" }}>Solicitudes de mi equipo (aprobación nivel 1)</h2>
          <div className="space-y-3">
            {solicitudesEquipo.map((s) => (
              <div key={s.id} className="flex justify-between items-center p-3 bg-[var(--color-surface-2)] rounded-lg">
                <div>
                  <p className="font-medium">{s.empleado.nombre} {s.empleado.apellidoPaterno} · {s.tipo}</p>
                  <p className="text-xs text-muted">{s.diasSolicitados} días · {s.motivo.slice(0, 50)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resolverSupervisor(s.id, "APROBADA")} className="btn-secondary text-sm py-1">Aprobar</button>
                  <button onClick={() => resolverSupervisor(s.id, "RECHAZADA")} className="btn-outline text-sm py-1 text-danger">Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-semibold mb-4">
        {isEmpleado ? "Mis solicitudes" : isSupervisor ? "Solicitudes de mi equipo" : "Solicitudes del personal"}
      </h2>



      <div className="space-y-4">

        {solicitudes.length === 0 ? (

          <div className="card text-center text-muted">No hay solicitudes registradas</div>

        ) : (

          solicitudes.map((s) => (

            <div key={s.id} className="card">

              <div className="flex flex-wrap justify-between items-start gap-4">

                <div className="flex gap-3 items-start">

                  {!isEmpleado && (

                    <Avatar nombre={s.empleado.nombre} apellido={s.empleado.apellidoPaterno} fotoUrl={s.empleado.fotoUrl} size="sm" />

                  )}

                  <div>

                    {!isEmpleado && (

                      <p className="font-medium">

                        {s.empleado.nombre} {s.empleado.apellidoPaterno}

                        {s.empleado.departamento && (

                          <span className="text-xs text-muted ml-2">· {s.empleado.departamento.nombre}</span>

                        )}

                      </p>

                    )}

                    <p className="text-sm">

                      <span className={`font-medium ${s.tipo === "VACACION" ? "text-success" : "link-action"}`}>

                        {s.tipo}

                      </span>

                      {" · "}{s.motivo}

                    </p>

                    <p className="text-xs text-muted">

                      {new Date(s.fechaInicio).toLocaleDateString("es-MX")} – {new Date(s.fechaFin).toLocaleDateString("es-MX")}

                      {" · "}{s.diasSolicitados} día(s) hábil(es)

                    </p>

                    {s.respuesta && s.estado !== "PENDIENTE" && (

                      <p className="text-xs text-muted italic mt-1">Respuesta: {s.respuesta}</p>

                    )}

                  </div>

                </div>

                <div className="flex items-center gap-2 flex-wrap">

                  <StatusBadge estado={s.estado} />

                  {canManage && (

                    <button

                      onClick={() => setExpedienteModal(s)}

                      className="btn-outline text-sm py-1 flex items-center gap-1"

                    >

                      <Eye size={14} /> Ver expediente

                    </button>

                  )}

                  {canManage && s.estado === "PENDIENTE" && (

                    <>

                      <button

                        onClick={() => { setExpedienteModal(s); setResolverModal({ solicitud: s, estado: "APROBADA" }); }}

                        className="btn-secondary text-sm py-1"

                      >

                        Aprobar

                      </button>

                      <button

                        onClick={() => setResolverModal({ solicitud: s, estado: "RECHAZADA" })}

                        className="btn-outline text-sm py-1 text-danger"

                      >

                        Rechazar

                      </button>

                    </>

                  )}

                </div>

              </div>

            </div>

          ))

        )}

      </div>



      {expedienteModal && (

        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">

            <div className="flex justify-between items-center mb-4">

              <h2 className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>

                Expediente de vacaciones

              </h2>

              <button onClick={() => setExpedienteModal(null)} className="p-1 hover:bg-gray-100 rounded">

                <X size={20} />

              </button>

            </div>

            <ExpedienteVacacionesPanel

              empleadoId={expedienteModal.empleadoId}

              solicitudId={expedienteModal.estado === "PENDIENTE" ? expedienteModal.id : undefined}

            />

            {canManage && expedienteModal.estado === "PENDIENTE" && (

              <div className="flex gap-2 mt-4 pt-4 border-t">

                <button

                  onClick={() => setResolverModal({ solicitud: expedienteModal, estado: "APROBADA" })}

                  className="btn-secondary flex-1"

                >

                  Aprobar solicitud

                </button>

                <button

                  onClick={() => setResolverModal({ solicitud: expedienteModal, estado: "RECHAZADA" })}

                  className="btn-outline flex-1 text-danger"

                >

                  Rechazar

                </button>

              </div>

            )}

          </div>

        </div>

      )}



      {resolverModal && (

        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">

          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">

            <h3 className="font-bold mb-4" style={{ color: "var(--color-primary)" }}>

              {resolverModal.estado === "APROBADA" ? "Aprobar solicitud" : "Rechazar solicitud"}

            </h3>

            <p className="text-sm text-muted mb-4">

              {resolverModal.solicitud.empleado.nombre} · {resolverModal.solicitud.tipo} · {resolverModal.solicitud.diasSolicitados} días

            </p>

            <label className="label-field">Comentario para el empleado (opcional)</label>

            <textarea

              className="input-field min-h-[80px] mb-4"

              value={respuestaCustom}

              onChange={(e) => setRespuestaCustom(e.target.value)}

              placeholder={resolverModal.estado === "APROBADA" ? "Ej.: Aprobado conforme a la política de vacaciones" : "Ej.: Saldo insuficiente; favor de reprogramar fechas"}

            />

            <div className="flex gap-2">

              <button onClick={() => { setResolverModal(null); setRespuestaCustom(""); }} className="btn-outline flex-1">

                Cancelar

              </button>

              <button

                onClick={resolver}

                className={`flex-1 ${resolverModal.estado === "APROBADA" ? "btn-secondary" : "btn-primary bg-red-600 hover:bg-red-700"}`}

              >

                Confirmar {resolverModal.estado === "APROBADA" ? "aprobación" : "rechazo"}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}


