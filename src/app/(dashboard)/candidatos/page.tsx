"use client";

import { useEffect, useState } from "react";
import { FileText, ExternalLink, Download } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const ETAPAS = [
  "RECEPCION", "REVISION_CV", "ENTREVISTA", "EVALUACION",
  "OFERTA", "CONTRATADO", "RECHAZADO",
];

const etapaLabels: Record<string, string> = {
  RECEPCION: "Postulación Recibida",
  REVISION_CV: "Revisión CV",
  ENTREVISTA: "Entrevista",
  EVALUACION: "Evaluación",
  OFERTA: "Oferta",
  CONTRATADO: "Contratado",
  RECHAZADO: "Rechazado",
};

interface Candidato {
  id: number;
  nombre: string;
  apellidoPaterno: string;
  email: string;
  etapa: string;
  curriculum: string | null;
  cartaPresentacion: string | null;
  vacante: { titulo: string; departamento: { nombre: string } };
}

type TurnoOpt = { id: number; nombre: string; horaInicio: string; horaFin: string };

export default function CandidatosPage() {
  const { showSuccess, showError } = useToast();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [turnos, setTurnos] = useState<TurnoOpt[]>([]);
  const [contratarModal, setContratarModal] = useState<Candidato | null>(null);
  const [turnoId, setTurnoId] = useState("");
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    fetch("/api/candidatos").then((r) => r.json()).then(setCandidatos);
  }

  useEffect(() => {
    cargar();
    fetch("/api/turnos?soloActivos=1&pageSize=50")
      .then((r) => r.json())
      .then((d) => setTurnos(Array.isArray(d.items) ? d.items : []));
  }, []);

  async function aplicarEtapa(id: number, etapa: string, turnoSeleccionado?: number) {
    setGuardando(true);
    const res = await fetch(`/api/candidatos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        etapa,
        ...(turnoSeleccionado ? { turnoId: turnoSeleccionado } : {}),
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      showError(data.error || "No se pudo actualizar la etapa del candidato.");
      return;
    }
    if (data.acceso?.email) {
      showSuccess(
        `Contratación exitosa. Correo: ${data.acceso.email} · Contraseña temporal: HumanLink2026!`
      );
    } else if (etapa !== "CONTRATADO") {
      showSuccess("Etapa actualizada correctamente.");
    }
    setContratarModal(null);
    setTurnoId("");
    cargar();
  }

  function onEtapaChange(c: Candidato, etapa: string) {
    if (etapa === "CONTRATADO" && c.etapa !== "CONTRATADO") {
      setContratarModal(c);
      setTurnoId(turnos[0] ? String(turnos[0].id) : "");
      return;
    }
    aplicarEtapa(c.id, etapa);
  }

  async function confirmarContratacion() {
    if (!contratarModal) return;
    if (turnos.length > 1 && !turnoId) {
      showError("Debe seleccionar un turno laboral.");
      return;
    }
    await aplicarEtapa(
      contratarModal.id,
      "CONTRATADO",
      turnoId ? Number(turnoId) : turnos[0]?.id
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Proceso de Contratación</h1>
        <p className="page-subtitle">Pipeline de candidatos y etapas del proceso de selección</p>
      </div>

      {candidatos.length === 0 ? (
        <div className="card text-center text-muted">No hay candidatos pendientes</div>
      ) : (
        <div className="hl-table-shell">
          <div className="hl-table-wrap">
            <table className="hl-table">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Email</th>
                  <th>Vacante</th>
                  <th>Departamento</th>
                  <th>CV</th>
                  <th>Etapa</th>
                </tr>
              </thead>
              <tbody>
                {candidatos.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">
                      {c.nombre} {c.apellidoPaterno}
                    </td>
                    <td>{c.email}</td>
                    <td>{c.vacante.titulo}</td>
                    <td>{c.vacante.departamento.nombre}</td>
                    <td>
                      {c.curriculum ? (
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={c.curriculum}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline text-xs inline-flex items-center gap-1 py-1 px-2"
                          >
                            <ExternalLink size={14} /> Ver
                          </a>
                          <a
                            href={c.curriculum}
                            download
                            className="btn-outline text-xs inline-flex items-center gap-1 py-1 px-2"
                          >
                            <Download size={14} /> Descargar
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted text-sm">Sin CV</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="input-field text-xs py-1"
                        value={c.etapa}
                        disabled={guardando}
                        onChange={(e) => onEtapaChange(c, e.target.value)}
                      >
                        {ETAPAS.map((et) => (
                          <option key={et} value={et}>
                            {etapaLabels[et]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {contratarModal && (
        <div className="hl-modal-backdrop" role="dialog" aria-modal="true">
          <div className="hl-modal card max-w-md w-full mx-4">
            <h2 className="hl-modal-title flex items-center gap-2">
              <FileText size={20} /> Confirmar contratación
            </h2>
            <p className="text-muted text-sm mb-4">
              {contratarModal.nombre} {contratarModal.apellidoPaterno} · {contratarModal.email}
            </p>
            {turnos.length === 0 ? (
              <p className="field-error mb-4">
                No hay turnos laborales activos. Configure un turno antes de contratar.
              </p>
            ) : (
              <div className="mb-4">
                <label className="label-field" htmlFor="turno-contrato">
                  Turno laboral
                </label>
                <select
                  id="turno-contrato"
                  className="input-field w-full"
                  value={turnoId}
                  onChange={(e) => setTurnoId(e.target.value)}
                >
                  {turnos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.horaInicio} – {t.horaFin})
                    </option>
                  ))}
                </select>
                <p className="field-hint mt-1">
                  El turno es obligatorio para el control de asistencias (RF-H06).
                </p>
              </div>
            )}
            <div className="hl-modal-footer">
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setContratarModal(null);
                  cargar();
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={guardando || turnos.length === 0}
                onClick={confirmarContratacion}
              >
                {guardando ? "Contratando…" : "Contratar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
