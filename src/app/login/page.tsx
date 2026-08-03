"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_PASSWORD, DEMO_USERS } from "@/lib/roles";

type BloqueoInfo = {
  mensaje: string;
  motivo: string;
  minutosRestantes: number;
  recomendaciones: string[];
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [bloqueo, setBloqueo] = useState<BloqueoInfo | null>(null);
  const [loading, setLoading] = useState(false);

  function validarLocal(): boolean {
    const fe: { email?: string; password?: string } = {};
    if (!email.trim()) fe.email = "El campo Correo es obligatorio.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fe.email = "El correo electrónico no es válido.";
    if (!password) fe.password = "El campo Contraseña es obligatorio.";
    else if (password.length < 8) fe.password = "La contraseña debe contener al menos 8 caracteres.";
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function loginWith(credentials: { email: string; password: string }) {
    setEmail(credentials.email);
    setPassword(credentials.password);
    setError("");
    setBloqueo(null);
    setFieldErrors({});
    if (!validarLocal()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.bloqueo) setBloqueo(data.bloqueo);
        else setError(data.error || "Error de autenticación");
        if (data.field) setFieldErrors({ [data.field as string]: data.error });
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginWith({ email, password });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "linear-gradient(135deg, var(--brand-dark) 0%, #121820 100%)" }}>
      <div className="text-center mb-6">
        <BrandLogo />
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          Sistema de Gestión de Recursos Humanos
        </p>
      </div>
      <div className="w-full max-w-lg space-y-4">
        <div className="card">
          <div className="text-center mb-4">
            <Link href="/" className="text-sm hover:underline inline-block" style={{ color: "var(--brand-cyan)" }}>
              ← Volver al sitio corporativo
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="label-field" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className={`input-field w-full ${fieldErrors.email ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: undefined })); }}
                placeholder="tu@correo.com"
              />
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="label-field" htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className={`input-field w-full ${fieldErrors.password ? "border-red-500 ring-1 ring-red-300" : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })); }}
              />
              {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
            </div>
            <p className="text-center text-sm">
              <a href="/recuperar" className="text-[#2874A6] hover:underline">¿Olvidaste tu contraseña?</a>
            </p>

            {bloqueo && (
              <div className="bg-amber-50 border border-amber-200 text-amber-950 px-4 py-3 rounded-lg text-sm space-y-2">
                <p className="font-medium">{bloqueo.mensaje}</p>
                <p><strong>Motivo:</strong> {bloqueo.motivo}</p>
                <p><strong>Tiempo restante:</strong> {bloqueo.minutosRestantes} minuto(s)</p>
                <ul className="list-disc pl-5 text-xs">
                  {bloqueo.recomendaciones.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && !bloqueo && (
              <div className="form-alert-error">{error}</div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Verificando..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="text-center text-sm mt-4 pt-4 border-t border-[#D5DBDB]">
            <Link href="/#vacantes" className="text-[#2874A6] hover:underline font-medium">
              Ver vacantes y postularme (acceso público)
            </Link>
          </p>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-[#1B4F72] mb-3">Acceso rápido por rol</h2>
          <p className="text-xs text-[#7F8C8D] mb-4">
            Contraseña para todos: <strong>{DEMO_PASSWORD}</strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                disabled={loading}
                onClick={() => loginWith({ email: user.email, password: DEMO_PASSWORD })}
                className="text-left p-3 rounded-lg border border-[#D5DBDB] hover:border-[#2874A6] hover:bg-[#F4F6F7] transition-colors disabled:opacity-50"
              >
                <p className="font-medium text-sm text-[#1B4F72]">{user.label}</p>
                <p className="text-xs text-[#7F8C8D]">{user.descripcion}</p>
                <p className="text-xs text-[#2874A6] mt-1 truncate">{user.email}</p>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/60 text-center">Universidad Tecnológica de Tijuana · Grupo 5B DSM</p>
      </div>
    </div>
  );
}
