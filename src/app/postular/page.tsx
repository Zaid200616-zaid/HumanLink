"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

interface Vacante {
  id: number;
  titulo: string;
  cupoDisponible: number;
  departamento: string;
  organizacion?: string;
}

export default function PostularPage() {
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [form, setForm] = useState({
    nombre: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    email: "",
    telefono: "",
    curp: "",
    vacanteId: "",
  });
  const [curriculum, setCurriculum] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/public/vacantes")
      .then((r) => r.json())
      .then((data) => setVacantes(data.filter((v: Vacante) => v.cupoDisponible > 0)));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.nombre || !form.apellidoPaterno || !form.email || !form.vacanteId) {
      setError("Complete todos los campos obligatorios");
      return;
    }

    const fd = new FormData();
    fd.append("nombre", form.nombre);
    fd.append("apellidoPaterno", form.apellidoPaterno);
    if (form.apellidoMaterno) fd.append("apellidoMaterno", form.apellidoMaterno);
    fd.append("email", form.email);
    if (form.telefono) fd.append("telefono", form.telefono);
    if (form.curp) fd.append("curp", form.curp);
    fd.append("vacanteId", form.vacanteId);
    if (curriculum) fd.append("curriculum", curriculum);

    const res = await fetch("/api/candidatos", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al enviar");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--color-bg)" }}>
        <div className="card max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--color-secondary)" }}>¡Solicitud enviada!</h1>
          <p style={{ color: "var(--color-muted)" }}>Su formulario ha sido registrado. Recursos Humanos se pondrá en contacto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex justify-center mb-3">
            <BrandLogo />
          </Link>
          <p style={{ color: "var(--color-muted)" }}>Registro público · Postulación a vacantes disponibles</p>
        </div>

        {vacantes.length === 0 ? (
          <div className="card text-center">
            <p className="text-[#7F8C8D]">No hay vacantes disponibles en este momento.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label-field">Vacante *</label>
              <select className="input-field w-full" value={form.vacanteId} onChange={(e) => setForm({ ...form, vacanteId: e.target.value })} required>
                <option value="">Seleccionar vacante</option>
                {vacantes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.titulo} — {v.organizacion ?? v.departamento} ({v.cupoDisponible} cupos)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Nombre *</label>
                <input className="input-field w-full" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div>
                <label className="label-field">Apellidos *</label>
                <input className="input-field w-full" placeholder="Paterno" value={form.apellidoPaterno} onChange={(e) => setForm({ ...form, apellidoPaterno: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="label-field">Apellido materno</label>
              <input className="input-field w-full" value={form.apellidoMaterno} onChange={(e) => setForm({ ...form, apellidoMaterno: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Correo electrónico *</label>
              <input type="email" className="input-field w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Teléfono</label>
              <input className="input-field w-full" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <label className="label-field">CURP (opcional)</label>
              <input className="input-field w-full" value={form.curp} onChange={(e) => setForm({ ...form, curp: e.target.value })} maxLength={18} />
            </div>
            <div>
              <label className="label-field">Currículum (PDF)</label>
              <input type="file" accept="application/pdf" className="input-field w-full" onChange={(e) => setCurriculum(e.target.files?.[0] || null)} />
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

            <button type="submit" className="btn-primary w-full">Enviar solicitud</button>
          </form>
        )}
      </div>
    </div>
  );
}
