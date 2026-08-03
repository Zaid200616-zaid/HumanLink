"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchList } from "@/lib/fetch-client";
import { useSession } from "@/lib/use-session";
import { useToast } from "@/components/ToastProvider";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import FormControl, { inputClass } from "@/components/ui/FormControl";
import Badge from "@/components/ui/Badge";
import { useZodForm } from "@/hooks/useZodForm";
import { ESTADOS_QUEJA, labelEstadoQueja, quejaCreateSchema } from "@/lib/schemas/queja";
import { firstZodError } from "@/lib/validation/zod-errors";
import {
  ANTIGUEDAD_ROW_CLASS,
  diasDesdeRegistro,
  etiquetaAntiguedad,
  nivelAntiguedad,
} from "@/lib/quejas-utils";
import {
  MSG_BLOQUEO_QUEJA_CERRADA,
  quejaEstaCerrada,
  quejaResolucionFinal,
} from "@/lib/quejas-bloqueo";

interface Queja {
  id: number;
  asunto: string;
  descripcion: string;
  estado: string;
  seguimiento?: string | null;
  createdAt: string;
  empleado: { nombre: string; apellidoPaterno: string };
}

type HistorialRow = {
  usuario: string;
  fecha: string;
  hora: string;
  estadoAnterior: string;
  estadoNuevo: string;
};

const MSG_BLOQUEO = MSG_BLOQUEO_QUEJA_CERRADA;

const emptyForm = { asunto: "", descripcion: "" };

export default function QuejasPage() {
  const { isEmpleado, canManage, loading: sessionLoading } = useSession();
  const { showSuccess, showError } = useToast();
  const [quejas, setQuejas] = useState<Queja[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [sortKey, setSortKey] = useState("antiguedad");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [detalle, setDetalle] = useState<Queja | null>(null);
  const [soloLectura, setSoloLectura] = useState(false);
  const [dialogBloqueo, setDialogBloqueo] = useState(false);
  const [estadoEdit, setEstadoEdit] = useState("");
  const [seguimientoEdit, setSeguimientoEdit] = useState("");
  const [historial, setHistorial] = useState<HistorialRow[]>([]);

  const { errors, validate, touch, fieldState, clear } = useZodForm(quejaCreateSchema);

  const cargar = useCallback(() => {
    fetchList<Queja>("/api/quejas").then(setQuejas);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtradas = useMemo(() => {
    let list = [...quejas];
    const q = buscar.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (x) =>
          x.asunto.toLowerCase().includes(q) ||
          x.descripcion.toLowerCase().includes(q) ||
          `${x.empleado.nombre} ${x.empleado.apellidoPaterno}`.toLowerCase().includes(q)
      );
    }
    if (filtroEstado) list = list.filter((x) => x.estado === filtroEstado);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "antiguedad" || sortKey === "createdAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortKey === "asunto") {
        cmp = a.asunto.localeCompare(b.asunto);
      } else if (sortKey === "estado") {
        cmp = a.estado.localeCompare(b.estado);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [quejas, buscar, filtroEstado, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const paginadas = filtradas.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [buscar, filtroEstado]);

  function onSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function enviarQueja(e: React.FormEvent) {
    e.preventDefault();
    if (!validate(form)) {
      const p = quejaCreateSchema.safeParse(form);
      if (!p.success) showError(firstZodError(p.error));
      return;
    }
    const res = await fetch("/api/quejas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "No se pudo registrar la queja.");
      return;
    }
    showSuccess("Queja registrada correctamente.");
    setForm(emptyForm);
    clear();
    cargar();
  }

  async function cargarHistorial(quejaId: number) {
    const res = await fetch(`/api/quejas/${quejaId}/historial`);
    const data = await res.json();
    setHistorial(Array.isArray(data) ? data : []);
  }

  function abrirDetalle(q: Queja, forzarLectura = false) {
    if (canManage && quejaEstaCerrada(q.estado) && !forzarLectura) {
      setDetalle(q);
      setDialogBloqueo(true);
      setSoloLectura(true);
      cargarHistorial(q.id);
      return;
    }
    setDetalle(q);
    setEstadoEdit(q.estado);
    setSeguimientoEdit(q.seguimiento || "");
    setSoloLectura(forzarLectura || quejaEstaCerrada(q.estado));
    setDialogBloqueo(false);
    cargarHistorial(q.id);
  }

  async function guardarSeguimiento() {
    if (!detalle || soloLectura || quejaEstaCerrada(detalle.estado)) {
      setDialogBloqueo(true);
      return;
    }
    const res = await fetch("/api/quejas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: detalle.id,
        estado: estadoEdit,
        seguimiento: seguimientoEdit.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) {
      setDialogBloqueo(true);
      showError(MSG_BLOQUEO);
      return;
    }
    if (!res.ok) {
      showError(data.error || "No se pudo guardar el seguimiento.");
      return;
    }
    showSuccess("Estado de la queja actualizado.");
    cargar();
    setDetalle(null);
  }

  const columns: Column<Queja>[] = [
    {
      key: "asunto",
      label: "Asunto",
      sortable: true,
      render: (q) => {
        const dias = diasDesdeRegistro(q.createdAt);
        const nivel = nivelAntiguedad(dias, q.estado);
        const pillClass =
          nivel === "critico" ? "hl-age-pill hl-age-critico" : nivel === "medio" ? "hl-age-pill hl-age-medio" : "hl-age-pill";
        return (
          <div className="space-y-1">
            <span className="font-medium">{q.asunto}</span>
            {!quejaResolucionFinal(q.estado) && <span className={pillClass}>{etiquetaAntiguedad(dias)}</span>}
          </div>
        );
      },
    },
    ...(canManage
      ? [
          {
            key: "empleado",
            label: "Empleado",
            render: (q: Queja) => `${q.empleado.nombre} ${q.empleado.apellidoPaterno}`,
          } as Column<Queja>,
        ]
      : []),
    {
      key: "createdAt",
      label: "Registro",
      sortable: true,
      render: (q) => new Date(q.createdAt).toLocaleDateString("es-MX"),
    },
    {
      key: "estado",
      label: "Estado",
      sortable: true,
      render: (q) => (
        <Badge variant={quejaResolucionFinal(q.estado) ? "neutral" : "primary"}>{labelEstadoQueja(q.estado)}</Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (q) => (
        <button type="button" className="btn-outline text-xs py-1 px-2" onClick={() => abrirDetalle(q)}>
          Ver detalle
        </button>
      ),
    },
  ];

  if (sessionLoading) return <p className="page-subtitle">Cargando…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quejas laborales"
        subtitle="RF-H16 · RNF-PQ01 antigüedad · Historial de estados · Validación en tiempo real"
      />

      {isEmpleado && (
        <form onSubmit={enviarQueja} className="card space-y-4">
          <h2 className="font-semibold">Registrar queja</h2>
          <FormControl
            label="Tipo / Asunto"
            name="asunto"
            error={errors.asunto}
            state={fieldState("asunto", form.asunto)}
          >
            <input
              id="asunto"
              className={inputClass(fieldState("asunto", form.asunto), "w-full")}
              value={form.asunto}
              onChange={(e) => setForm({ ...form, asunto: e.target.value })}
              onBlur={() => touch("asunto")}
            />
          </FormControl>
          <FormControl
            label="Descripción"
            name="descripcion"
            error={errors.descripcion}
            state={fieldState("descripcion", form.descripcion)}
          >
            <textarea
              id="descripcion"
              className={inputClass(fieldState("descripcion", form.descripcion), "w-full min-h-[100px]")}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              onBlur={() => touch("descripcion")}
            />
          </FormControl>
          <button type="submit" className="btn-primary">
            Enviar queja
          </button>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={paginadas}
        rowKey={(q) => q.id}
        searchPlaceholder="Buscar por asunto, descripción o empleado…"
        searchValue={buscar}
        onSearchChange={setBuscar}
        total={filtradas.length}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        rowClassName={(q) => {
          const dias = diasDesdeRegistro(q.createdAt);
          return ANTIGUEDAD_ROW_CLASS[nivelAntiguedad(dias, q.estado)];
        }}
        toolbar={
          <div className="min-w-[180px]">
            <label className="label-field">Estado</label>
            <select className="input-field" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS_QUEJA.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <Modal
        open={!!detalle && !dialogBloqueo}
        title={soloLectura ? "Detalle de queja (solo lectura)" : "Detalle y seguimiento"}
        onClose={() => setDetalle(null)}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-outline text-sm" onClick={() => setDetalle(null)}>
              Cerrar
            </button>
            {canManage && !soloLectura && (
              <button type="button" className="btn-primary text-sm" onClick={guardarSeguimiento}>
                Guardar cambios
              </button>
            )}
          </>
        }
      >
        {detalle && (
          <div className="space-y-4 text-sm">
            <FormControl label="Asunto" name="det-asunto">
              <input className="input-field w-full" value={detalle.asunto} disabled readOnly />
            </FormControl>
            <FormControl label="Descripción" name="det-desc">
              <textarea className="input-field w-full min-h-[80px]" value={detalle.descripcion} disabled readOnly />
            </FormControl>
            <p>
              <span className="text-[var(--color-muted)]">Empleado: </span>
              {detalle.empleado.nombre} {detalle.empleado.apellidoPaterno}
            </p>
            <p>
              <span className="text-[var(--color-muted)]">Registro: </span>
              {new Date(detalle.createdAt).toLocaleString("es-MX")}
            </p>
            {canManage && (
              <>
                <FormControl label="Estado" name="det-estado">
                  <select
                    className="input-field w-full"
                    value={estadoEdit}
                    disabled={soloLectura}
                    onChange={(e) => setEstadoEdit(e.target.value)}
                  >
                    {ESTADOS_QUEJA.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormControl label="Notas de seguimiento" name="det-seg">
                  <textarea
                    className="input-field w-full min-h-[80px]"
                    value={seguimientoEdit}
                    disabled={soloLectura}
                    readOnly={soloLectura}
                    onChange={(e) => setSeguimientoEdit(e.target.value)}
                  />
                </FormControl>
              </>
            )}
            {historial.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Historial de cambios de estado</h3>
                <ul className="space-y-2 text-xs">
                  {historial.map((h) => (
                    <li key={`${h.fecha}-${h.hora}-${h.estadoNuevo}`} className="hl-table-shell p-3">
                      <p>
                        <strong>{h.usuario}</strong> · {h.fecha} {h.hora}
                      </p>
                      <p>
                        {labelEstadoQueja(h.estadoAnterior)} → {labelEstadoQueja(h.estadoNuevo)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={dialogBloqueo}
        title="Edición bloqueada"
        onClose={() => {
          setDialogBloqueo(false);
          if (!soloLectura) setDetalle(null);
        }}
        footer={
          <>
            <button
              type="button"
              className="btn-outline text-sm"
              onClick={() => {
                setDialogBloqueo(false);
                setSoloLectura(true);
              }}
            >
              Ver como solo lectura
            </button>
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() => {
                setDialogBloqueo(false);
                setDetalle(null);
              }}
            >
              Entendido
            </button>
          </>
        }
      >
        <p>{MSG_BLOQUEO}</p>
      </Modal>
    </div>
  );
}
