"use client";

import { useEffect, useState } from "react";
import { notifySessionRefresh } from "@/components/SessionUserIndicator";

type UsuarioRow = {
  id: number;
  email: string;
  rolId: number;
  rol: { id: number; nombre: string };
  empleado: { nombre: string; apellidoPaterno: string; numeroEmpleado: string } | null;
};
type RolOpt = { id: number; nombre: string };

/** RF-H07 — Asignación de roles (sin matriz de permisos por rol). */
export default function PermisosRolPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [roles, setRoles] = useState<RolOpt[]>([]);
  const [msg, setMsg] = useState("");

  function cargar() {
    fetch("/api/usuarios/roles").then((r) => r.json()).then(setUsuarios);
    fetch("/api/roles").then((r) => r.json()).then(setRoles);
  }

  useEffect(() => { cargar(); }, []);

  const rolesAsignables = roles.filter((r) => r.nombre !== "Administrador");

  async function asignar(usuarioId: number, rolId: number) {
    const rol = roles.find((r) => r.id === rolId);
    if (rol?.nombre === "Administrador") {
      setMsg("No se puede asignar el rol Administrador a otro usuario");
      return;
    }
    const res = await fetch("/api/usuarios/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, rolId }),
    });
    const d = await res.json();
    setMsg(res.ok ? "Rol actualizado" : d.error || "Error");
    if (res.ok) {
      cargar();
      notifySessionRefresh();
    }
  }

  return (
    <div>
      <h1 className="page-title mb-2">
        Administración de roles
      </h1>
      <p className="text-[#7F8C8D] mb-6">
        RF-H07 · Asignar roles (no se puede otorgar Administrador a otra persona).
      </p>

      {msg && <p className="text-sm text-[#17A589] mb-4">{msg}</p>}

      <div className="hl-table-shell">
        <div className="hl-table-wrap">
        <table className="hl-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Empleado</th>
              <th>Rol actual</th>
              <th>Asignar rol</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const esAdmin = u.rol.nombre === "Administrador";
              return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    {u.empleado ? `${u.empleado.nombre} ${u.empleado.apellidoPaterno}` : "—"}
                  </td>
                  <td>{u.rol.nombre}</td>
                  <td>
                    {esAdmin ? (
                      <span className="text-xs text-[#7F8C8D]">Protegido</span>
                    ) : (
                      <select
                        className="input-field text-xs py-1"
                        value={u.rolId}
                        onChange={(e) => asignar(u.id, Number(e.target.value))}
                      >
                        {rolesAsignables.map((r) => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
