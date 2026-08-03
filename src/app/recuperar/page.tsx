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
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F7] p-4">
      <div className="card max-w-md w-full space-y-6">
        <h1 className="text-xl font-bold text-center" style={{ color: "var(--color-primary)" }}>Recuperar contraseña</h1>
        <form onSubmit={solicitar} className="space-y-3">
          <input className="input-field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" className="btn-primary w-full">Solicitar token</button>
        </form>
        {demoToken && (
          <p className="text-xs bg-yellow-50 p-2 rounded">Token demo: <code>{demoToken}</code></p>
        )}
        <form onSubmit={restablecer} className="space-y-3 border-t pt-4">
          <input className="input-field" placeholder="Token" value={token} onChange={(e) => setToken(e.target.value)} />
          <input className="input-field" type="password" placeholder="Nueva contraseña (min 8)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
          <button type="submit" className="btn-secondary w-full">Restablecer contraseña</button>
        </form>
        {msg && <p className="text-sm text-center">{msg}</p>}
        <Link href="/login" className="block text-center text-sm text-[#2874A6] hover:underline">← Volver al login</Link>
      </div>
    </div>
  );
}
