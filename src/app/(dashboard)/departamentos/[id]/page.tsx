"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/use-session";
import { MSG_DEPT_SIN_AUTORIZACION } from "@/lib/departamentos-auth";
import { useToast } from "@/components/ToastProvider";
import { MSG } from "@/lib/ui-messages";
import LoadingState from "@/components/ui/LoadingState";
import ActivoBadge from "@/components/ui/ActivoBadge";
import PageHeader from "@/components/ui/PageHeader";
import { resolveEstadoBadge } from "@/lib/estado-badge";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

type EmpleadoRow = { id: number; nombre: string; apellidoPaterno: string; numeroEmpleado: string; puesto: string };
type VacanteRow = {
  id: number;
  titulo: string;
  estado: string;
  cupoTotal: number;
  cupoDisponible: number;
  _count: { candidatos: number };
};

type DeptoDetalle = {
  id: number;
  nombre: string;
  descripcion: string | null;
  ubicacion: string | null;
  cantidadVacantes: number;
  activo: boolean;
  supervisor: { id: number; nombre: string; apellidoPaterno: string } | null;
  organizacion: { nombre: string };
  empleados: EmpleadoRow[];
  vacantes: VacanteRow[];
  _count: { empleados: number; vacantes: number };
};

type Meta = {
  empleados: { id: number; nombre: string; apellidoPaterno: string; departamentoId: number | null }[];
};

export default function AdministrarDepartamentoPage() {
  const { id } = useParams();
  const { user } = useSession();
  const { showError, showSuccess, showWarning } = useToast();
  const { confirm, ConfirmDialogHost } = useConfirmDialog();
  const puedeEscribir = user?.rol === "Administrador" || user?.rol === "Supervisor";
  const puedeListarVacantes = user?.rol === "Administrador" || user?.rol === "Recursos Humanos";
  const deptId = Number(id);

  const [dept, setDept] = useState<DeptoDetalle | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [buscarEmp, setBuscarEmp] = useState("");
  const [empAsignar, setEmpAsignar] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [vacTitulo, setVacTitulo] = useState("");
  const [vacDesc, setVacDesc] = useState("");
  const [vacAsociar, setVacAsociar] = useState("");
  const [vacantesOtras, setVacantesOtras] = useState<VacanteRow[]>([]);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(() => {
    if (!deptId) return;
    fetch(`/api/departamentos/${deptId}`)
      .then((r) => r.json())
      .then((data) => {
        setDept(data);
        setSupervisorId(data.supervisor?.id ? String(data.supervisor.id) : "");
      });
  }, [deptId]);

  useEffect(() => {
    cargar();
    fetch("/api/departamentos?meta=1").then((r) => r.json()).then(setMeta);
    if (puedeListarVacantes) {
      fetch("/api/vacantes")
        .then((r) => r.json())
        .then((v) => setVacantesOtras(Array.isArray(v) ? v : []));
    }
  }, [cargar, puedeListarVacantes]);

  const empleadosDisponibles = useMemo(() => {
    if (!meta) return [];
    const q = buscarEmp.trim().toLowerCase();
    return meta.empleados.filter((e) => {
      if (dept?.empleados.some((a) => a.id === e.id)) return false;
      if (!q) return true;
      return `${e.nombre} ${e.apellidoPaterno}`.toLowerCase().includes(q);
    });
  }, [meta, buscarEmp, dept]);

  const vacantesParaAsociar = useMemo(() => {
    return vacantesOtras.filter((v) => !dept?.vacantes.some((dv) => dv.id === v.id));
  }, [vacantesOtras, dept]);

  async function asignarEmpleado() {
    if (!puedeEscribir) { setMsg(MSG_DEPT_SIN_AUTORIZACION); return; }
    if (!empAsignar) return;
    const res = await fetch(`/api/departamentos/${deptId}/empleados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "asignar", empleadoId: Number(empAsignar) }),
    });
    if (res.ok) {
      setEmpAsignar("");
      setMsg("");
      showSuccess(MSG.empleadoAsignado);
      cargar();
    } else {
      const d = await res.json();
      showError(d.error || MSG.errorGenerico);
    }
  }

  async function removerEmpleado(empleadoId: number) {
    const ok = await confirm("Remover empleado", "¿Remover empleado de este departamento?");
    if (!ok) return;
    const res = await fetch(`/api/departamentos/${deptId}/empleados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "remover", empleadoId }),
    });
    if (res.ok) cargar();
  }

  async function guardarSupervisor() {
    const res = await fetch(`/api/departamentos/${deptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supervisorId: supervisorId ? Number(supervisorId) : null }),
    });
    if (res.ok) {
      setMsg("");
      showSuccess(MSG.supervisorActualizado);
      cargar();
    } else {
      const d = await res.json();
      showError(d.error || MSG.errorGenerico);
    }
  }

  async function crearVacante() {
    if (!vacTitulo.trim() || vacDesc.trim().length < 10) {
      showWarning("Complete título y descripción (mínimo 10 caracteres).");
      return;
    }
    const res = await fetch(`/api/departamentos/${deptId}/vacantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "crear",
        titulo: vacTitulo,
        descripcion: vacDesc,
        cupoTotal: 1,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      showError(d.error || MSG.errorGenerico);
      return;
    }
    setVacTitulo("");
    setVacDesc("");
    showSuccess(MSG.creado);
    cargar();
  }

  async function asociarVacante() {
    if (!vacAsociar) return;
    const res = await fetch(`/api/departamentos/${deptId}/vacantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "asociar", vacanteId: Number(vacAsociar) }),
    });
    if (res.ok) {
      setVacAsociar("");
      cargar();
      if (puedeListarVacantes) {
        fetch("/api/vacantes").then((r) => r.json()).then(setVacantesOtras);
      }
    }
  }

  async function desasociarVacante(vacanteId: number) {
    const ok = await confirm("Desasociar vacante", "¿Eliminar asociación de esta vacante?");
    if (!ok) return;
    const res = await fetch(`/api/departamentos/${deptId}/vacantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "desasociar", vacanteId }),
    });
    const d = await res.json();
    if (!res.ok) showError(d.error || MSG.errorGenerico);
    else {
      showSuccess(MSG.actualizado);
      cargar();
    }
  }

  if (!dept) return <LoadingState label="Cargando departamento…" />;

  const vacantesRegistradas = dept._count.vacantes;
  const limiteDept = dept.cantidadVacantes;
  const espaciosDisponibles =
    limiteDept > 0 ? Math.max(0, limiteDept - vacantesRegistradas) : null;

  return (
    <div className="space-y-6">
      <Link href="/departamentos" className="text-sm link-action hover:underline">← Volver a departamentos</Link>

      <div>
        <PageHeader title="Administrar departamento" subtitle="Personal, vacantes y supervisor del área" />
        <p className="text-lg mt-1">{dept.nombre}</p>
        <p className="text-sm text-muted">
          {dept.organizacion.nombre} · {dept._count.empleados} empleados · {dept._count.vacantes} vacantes
          {dept.cantidadVacantes > 0 ? ` (máx. ${dept.cantidadVacantes})` : ""} ·{" "}
          <ActivoBadge activo={dept.activo} />
        </p>
        {msg && <p className="text-sm mt-2" style={{ color: "var(--color-secondary)" }}>{msg}</p>}
        {!puedeEscribir && user && (
          <p className="text-sm mt-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{MSG_DEPT_SIN_AUTORIZACION}</p>
        )}
      </div>

      {puedeEscribir ? (
      <>
      <section className="rounded-xl p-5 space-y-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <h2 className="font-semibold">1. Empleados asignados</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Buscar empleado…"
            className="input-field flex-1 min-w-[200px]"
            value={buscarEmp}
            onChange={(e) => setBuscarEmp(e.target.value)}
          />
          <select className="input-field min-w-[200px]" value={empAsignar} onChange={(e) => setEmpAsignar(e.target.value)}>
            <option value="">Asignar empleado…</option>
            {empleadosDisponibles.slice(0, 30).map((e) => (
              <option key={e.id} value={e.id}>{e.nombre} {e.apellidoPaterno}</option>
            ))}
          </select>
          <button type="button" className="btn-primary text-sm" onClick={asignarEmpleado}>Asignar</button>
        </div>
        <ul className="divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
          {dept.empleados.map((e) => (
            <li key={e.id} className="py-2 flex justify-between gap-2">
              <span>{e.nombre} {e.apellidoPaterno} · {e.puesto} ({e.numeroEmpleado})</span>
              <button type="button" className="link-danger text-xs hover:underline" onClick={() => removerEmpleado(e.id)}>
                Remover
              </button>
            </li>
          ))}
          {dept.empleados.length === 0 && <li className="py-2 text-muted">Sin empleados asignados</li>}
        </ul>
      </section>

      <section className="rounded-xl p-5 space-y-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <h2 className="font-semibold">2. Vacantes</h2>

        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
        >
          {limiteDept > 0 ? (
            <>
              <p>
                <strong>Espacios disponibles:</strong>{" "}
                <span style={{ color: espaciosDisponibles === 0 ? "var(--color-danger)" : "var(--color-secondary)" }}>
                  {espaciosDisponibles}
                </span>
                {" "}de {limiteDept} permitidos por departamento
              </p>
              <p className="text-muted mt-1">
                Vacantes registradas: {vacantesRegistradas} · Cálculo: {limiteDept} − {vacantesRegistradas} = {espaciosDisponibles} libre(s)
              </p>
            </>
          ) : (
            <p className="text-muted">
              Sin límite de vacantes en departamento · Registradas: {vacantesRegistradas}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input-field" placeholder="Título del puesto vacante" value={vacTitulo} onChange={(e) => setVacTitulo(e.target.value)} />
          <input className="input-field" placeholder="Descripción del puesto y responsabilidades" value={vacDesc} onChange={(e) => setVacDesc(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn-outline text-sm disabled:opacity-50"
          disabled={limiteDept > 0 && espaciosDisponibles === 0}
          onClick={crearVacante}
        >
          Crear vacante
        </button>
        {limiteDept > 0 && espaciosDisponibles === 0 && (
          <p className="text-xs link-danger">No hay espacios disponibles. Aumente la cantidad máxima al editar el departamento.</p>
        )}

        {puedeListarVacantes && (
        <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
          <select
            className="input-field min-w-[240px]"
            value={vacAsociar}
            onChange={(e) => setVacAsociar(e.target.value)}
            disabled={limiteDept > 0 && espaciosDisponibles === 0}
          >
            <option value="">Asociar vacante existente…</option>
            {vacantesParaAsociar.map((v) => (
              <option key={v.id} value={v.id}>{v.titulo}</option>
            ))}
          </select>
          <button type="button" className="btn-outline text-sm" onClick={asociarVacante}>Asociar</button>
        </div>
        )}

        <ul className="divide-y text-sm">
          {dept.vacantes.map((v) => (
            <li key={v.id} className="py-2 flex justify-between gap-2 flex-wrap">
              <span>
                {v.titulo} · {resolveEstadoBadge(v.estado).label} · Cupo {v.cupoDisponible}/{v.cupoTotal} · {v._count.candidatos} candidato(s)
              </span>
              <button type="button" className="link-danger text-xs hover:underline" onClick={() => desasociarVacante(v.id)}>
                Eliminar asociación
              </button>
            </li>
          ))}
          {dept.vacantes.length === 0 && <li className="py-2 text-muted">Sin vacantes</li>}
        </ul>
      </section>

      <section className="rounded-xl p-5 space-y-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <h2 className="font-semibold">3. Supervisor</h2>
        <div className="flex flex-wrap gap-2">
          <select className="input-field min-w-[240px]" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
            <option value="">Sin supervisor</option>
            {meta?.empleados.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre} {e.apellidoPaterno}</option>
            ))}
          </select>
          <button type="button" className="btn-primary text-sm" onClick={guardarSupervisor}>Cambiar supervisor</button>
        </div>
      </section>
      </>
      ) : (
        <section className="rounded-xl p-5 text-sm text-muted" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p>Empleados asignados: {dept.empleados.length}. Vacantes: {dept._count.vacantes}. Use una cuenta con permisos de escritura para administrar.</p>
          <ul className="mt-3 divide-y" style={{ borderColor: "var(--color-border)" }}>
            {dept.empleados.map((e) => (
              <li key={e.id} className="py-2">{e.nombre} {e.apellidoPaterno} · {e.puesto}</li>
            ))}
          </ul>
        </section>
      )}
      {ConfirmDialogHost}
    </div>
  );
}
