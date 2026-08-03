"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/use-session";
import { notifySessionRefresh } from "@/components/SessionUserIndicator";
import Avatar from "@/components/Avatar";
import { Camera } from "lucide-react";

type PerfilData = {
  id: number;
  email: string;
  rol: { nombre: string } | string;
  numeroEmpleado: string | null;
  empleado: {
    id: number;
    nombre: string;
    apellidoPaterno: string;
    puesto: string;
    numeroEmpleado: string;
    fotoUrl: string | null;
    telefono: string | null;
    departamento?: { nombre: string; organizacion: { nombre: string } };
  } | null;
};

export default function PerfilPage() {
  const { user } = useSession();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [telefono, setTelefono] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  function cargarPerfil() {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((data: PerfilData) => {
        setPerfil(data);
        const emp = data.empleado;
        setTelefono(emp?.telefono || "");
        setFotoUrl(emp?.fotoUrl || null);
      });
  }

  useEffect(() => {
    cargarPerfil();
  }, []);

  const empleado = perfil?.empleado;
  const numeroEmpleado = perfil?.numeroEmpleado || empleado?.numeroEmpleado || null;
  const rolNombre =
    typeof perfil?.rol === "string" ? perfil.rol : perfil?.rol?.nombre || user?.rol || "";

  async function subirFoto(file: File) {
    setSubiendoFoto(true);
    setMsg("");
    const fd = new FormData();
    fd.append("foto", file);
    const res = await fetch("/api/perfil/foto", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setFotoUrl(data.fotoUrl);
      setMsg("Foto actualizada correctamente");
      cargarPerfil();
      notifySessionRefresh();
    } else {
      setMsg(data.error || "No se pudo subir la foto");
    }
    setSubiendoFoto(false);
  }

  function onSeleccionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Use una imagen JPG o PNG");
      return;
    }
    if (file.size > 500_000) {
      setMsg("La imagen debe ser menor a 500 KB");
      return;
    }
    subirFoto(file);
    e.target.value = "";
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefono }),
    });
    setMsg(res.ok ? "Perfil actualizado correctamente" : "Error al actualizar");
    if (res.ok) notifySessionRefresh();
  }

  if (!perfil) return <p>Cargando perfil...</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">
          Mi Perfil
        </h1>
        <p className="text-[#7F8C8D]">RF-H14 · Número de empleado y foto de perfil</p>
      </div>

      <div className="card max-w-lg mb-6">
        <h2 className="font-semibold mb-4">Foto de perfil</h2>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar
              nombre={empleado?.nombre || perfil.email}
              apellido={empleado?.apellidoPaterno || ""}
              fotoUrl={fotoUrl}
              size="lg"
            />
            <button
              type="button"
              className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow border hover:bg-gray-50"
              title="Cambiar foto"
              disabled={subiendoFoto || !empleado}
              onClick={() => inputFotoRef.current?.click()}
            >
              <Camera size={14} className="text-[#7F8C8D]" />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onSeleccionarFoto}
            />
            <button
              type="button"
              className="btn-outline text-sm"
              disabled={subiendoFoto || !empleado}
              onClick={() => inputFotoRef.current?.click()}
            >
              {subiendoFoto ? "Subiendo…" : "Elegir y subir imagen"}
            </button>
            {!empleado && (
              <p className="text-xs text-[#7F8C8D]">
                Vincule un expediente de empleado a su cuenta para guardar la foto.
              </p>
            )}
            {empleado && (
              <p className="text-xs text-[#7F8C8D]">JPG o PNG, máximo 500 KB. La foto se guarda al seleccionar el archivo.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card max-w-lg">
        {empleado && (
          <div className="mb-6 pb-6 border-b">
            <h2 className="text-xl font-semibold">
              {empleado.nombre} {empleado.apellidoPaterno}
            </h2>
            <p className="text-[#7F8C8D]">{empleado.puesto}</p>
            {empleado.departamento && (
              <p className="text-sm mt-1">
                {empleado.departamento.organizacion.nombre} · {empleado.departamento.nombre}
              </p>
            )}
            <div className="flex gap-4 mt-3">
              <Link href={`/empleados/${empleado.id}`} className="text-sm text-[#2874A6] hover:underline">
                Ver expediente digital →
              </Link>
              <Link href="/vacaciones" className="text-sm text-[#17A589] hover:underline">
                Mi expediente de vacaciones →
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="label-field">Número de empleado</label>
            <input
              className="input-field bg-[#F4F6F7] font-mono"
              value={numeroEmpleado || "No asignado"}
              readOnly
              disabled
            />
            <p className="text-xs text-[#7F8C8D] mt-1">Dato informativo; no editable.</p>
          </div>
          <div>
            <label className="label-field">Email</label>
            <input className="input-field bg-gray-50" value={perfil.email} disabled />
          </div>
          <div>
            <label className="label-field">Rol</label>
            <input className="input-field bg-gray-50" value={rolNombre} disabled />
          </div>
          <div>
            <label className="label-field">Teléfono (editable)</label>
            <input className="input-field" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
          {msg && (
            <p
              className={`text-sm ${
                msg.includes("Error") || msg.includes("500") || msg.includes("No se") ? "text-red-600" : "text-[#17A589]"
              }`}
            >
              {msg}
            </p>
          )}
          <button type="submit" className="btn-primary">
            Guardar cambios
          </button>
        </form>
      </div>

      <div className="card max-w-lg mt-6 space-y-4">
        <h2 className="font-semibold">Seguridad</h2>
        <PasswordForm />
        <button
          type="button"
          className="btn-outline text-sm"
          onClick={async () => {
            await fetch("/api/perfil/sesiones", { method: "DELETE" });
            setMsg("Otras sesiones cerradas");
          }}
        >
          Cerrar otras sesiones
        </button>
        <SesionesActivas />
      </div>
    </div>
  );
}

function PasswordForm() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [msg, setMsg] = useState("");
  async function cambiar(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/perfil/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva }),
    });
    const d = await res.json();
    setMsg(res.ok ? "Contraseña actualizada" : d.error);
  }
  return (
    <form onSubmit={cambiar} className="space-y-2 border-t pt-4">
      <p className="text-sm font-medium">Cambiar contraseña</p>
      <input type="password" className="input-field" placeholder="Actual" value={actual} onChange={(e) => setActual(e.target.value)} />
      <input type="password" className="input-field" placeholder="Nueva (min 8)" value={nueva} onChange={(e) => setNueva(e.target.value)} minLength={8} />
      <button type="submit" className="btn-secondary text-sm">
        Actualizar contraseña
      </button>
      {msg && <p className="text-xs text-[#17A589]">{msg}</p>}
    </form>
  );
}

function SesionesActivas() {
  const [sesiones, setSesiones] = useState<Array<{ id: number; ip?: string; createdAt: string }>>([]);
  useEffect(() => {
    fetch("/api/perfil/sesiones").then((r) => r.json()).then(setSesiones);
  }, []);
  if (sesiones.length === 0) return null;
  return (
    <div className="border-t pt-4">
      <p className="text-sm font-medium mb-2">Sesiones activas ({sesiones.length})</p>
      <ul className="text-xs space-y-1 text-[#7F8C8D]">
        {sesiones.map((s) => (
          <li key={s.id}>
            {s.ip} · {new Date(s.createdAt).toLocaleString("es-MX")}
          </li>
        ))}
      </ul>
    </div>
  );
}
