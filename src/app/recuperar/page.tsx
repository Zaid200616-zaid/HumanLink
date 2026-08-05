"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [demoToken, setDemoToken] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) setToken(t);
  }, []);

  async function solicitar(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/recuperar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setMsg(data.mensaje || data.error);
    if (data.tokenDemo) setDemoToken(data.tokenDemo);
  }

  async function restablecer(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/recuperar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setMsg(data.ok ? "Contraseña actualizada. Ya puedes iniciar sesión." : data.error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--color-bg)" }}>
      <div className="card max-w-md w-full space-y-6">
        <h1 className="text-xl font-bold text-center">Recuperar contraseña</h1>
        <p className="text-sm text-muted text-center">Solicite un enlace de recuperación o restablezca su acceso</p>
        <form onSubmit={solicitar} className="space-y-3">
          <label className="label-field" htmlFor="rec-email">Correo electrónico</label>
          <input id="rec-email" className="input-field" type="email" placeholder="nombre.apellido@humanlink.mx" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" className="btn-primary w-full">Enviar enlace de recuperación</button>
        </form>
        {demoToken && (
          <p className="text-xs p-3 rounded-xl border" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}>
            Enlace de recuperación (entorno local): <code className="text-xs break-all">{demoToken}</code>
          </p>
        )}
        <form onSubmit={restablecer} className="space-y-3 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          <label className="label-field" htmlFor="rec-token">Código de recuperación</label>
          <input id="rec-token" className="input-field" placeholder="Pegue el código recibido por correo" value={token} onChange={(e) => setToken(e.target.value)} />
          <label className="label-field" htmlFor="rec-pass">Nueva contraseña</label>
          <input id="rec-pass" className="input-field" type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
          <button type="submit" className="btn-secondary w-full">Restablecer contraseña</button>
        </form>
        {msg && <p className="text-sm text-center">{msg}</p>}
        <Link href="/login" className="block text-center text-sm link-action">← Volver al inicio de sesión</Link>
      </div>
    </div>
  );
}
