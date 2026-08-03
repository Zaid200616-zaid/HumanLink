"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type VacantePublica = {
  id: number;
  titulo: string;
  descripcion: string;
  requisitos: string | null;
  departamento: string;
  modalidad: string;
  tipoEmpleo: string;
  ubicacion: string;
  salario: string;
};

type Props = {
  vacante: VacantePublica | null;
  onClose: () => void;
};

export default function PostularModal({ vacante, onClose }: Props) {
  const [form, setForm] = useState({
    nombre: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    email: "",
    telefono: "",
    direccion: "",
    escolaridad: "",
    experiencia: "",
    curp: "",
    rfc: "",
  });
  const [curriculum, setCurriculum] = useState<File | null>(null);
  const [carta, setCarta] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!vacante) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vacante) return;
    setError("");
    if (!form.nombre || !form.apellidoPaterno || !form.email) {
      setError("Complete nombre, apellidos y correo.");
      return;
    }
    if (!curriculum) {
      setError("Adjunte su currículum en PDF.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v) fd.append(k, v);
    });
    fd.append("vacanteId", String(vacante.id));
    fd.append("curriculum", curriculum);
    if (carta) fd.append("cartaPresentacion", carta);

    const res = await fetch("/api/candidatos", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "No se pudo enviar la postulación.");
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="hl-modal-backdrop" role="dialog" aria-modal="true">
      <div className="hl-modal hl-modal-wrap">
        <button type="button" className="hl-modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={22} />
        </button>
        {success ? (
          <>
            <h3>¡Postulación enviada!</h3>
            <p style={{ color: "var(--hl-muted)", lineHeight: 1.6 }}>
              Su solicitud quedó registrada con estado <strong>Postulación Recibida</strong>.
              Recursos Humanos revisará su información y se comunicará con usted.
            </p>
            <button type="button" className="hl-btn hl-btn-primary" style={{ marginTop: "1rem" }} onClick={onClose}>
              Cerrar
            </button>
          </>
        ) : (
          <>
            <h3>Postularme</h3>
            <p style={{ color: "var(--hl-muted)", margin: "0 0 1rem", fontSize: "0.95rem" }}>
              {vacante.titulo} · {vacante.departamento}
            </p>
            {error && <div className="hl-alert hl-alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="hl-form-field">
                <label>Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="hl-form-field">
                <label>Apellido paterno *</label>
                <input
                  value={form.apellidoPaterno}
                  onChange={(e) => setForm({ ...form, apellidoPaterno: e.target.value })}
                  required
                />
              </div>
              <div className="hl-form-field">
                <label>Apellido materno</label>
                <input
                  value={form.apellidoMaterno}
                  onChange={(e) => setForm({ ...form, apellidoMaterno: e.target.value })}
                />
              </div>
              <div className="hl-form-field">
                <label>Correo *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="hl-form-field">
                <label>Teléfono</label>
                <input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </div>
              <div className="hl-form-field">
                <label>Dirección</label>
                <input
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                />
              </div>
              <div className="hl-form-field">
                <label>Escolaridad</label>
                <input
                  value={form.escolaridad}
                  onChange={(e) => setForm({ ...form, escolaridad: e.target.value })}
                />
              </div>
              <div className="hl-form-field">
                <label>Experiencia</label>
                <textarea
                  rows={3}
                  value={form.experiencia}
                  onChange={(e) => setForm({ ...form, experiencia: e.target.value })}
                />
              </div>
              <div className="hl-form-field">
                <label>CURP (opcional)</label>
                <input value={form.curp} onChange={(e) => setForm({ ...form, curp: e.target.value })} />
              </div>
              <div className="hl-form-field">
                <label>RFC (opcional)</label>
                <input value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} />
              </div>
              <div className="hl-form-field">
                <label>Currículum PDF *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCurriculum(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <div className="hl-form-field">
                <label>Carta de presentación PDF (opcional)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCarta(e.target.files?.[0] ?? null)}
                />
              </div>
              <button type="submit" className="hl-btn hl-btn-primary" style={{ width: "100%" }} disabled={loading}>
                {loading ? "Enviando…" : "Enviar solicitud"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
