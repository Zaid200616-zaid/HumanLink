"use client";



import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";

import Avatar from "@/components/Avatar";

import ExpedienteVacacionesPanel from "@/components/ExpedienteVacacionesPanel";
import { descargarPdf } from "@/lib/pdf";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { labelEstadoQueja } from "@/lib/schemas/queja";



export default function ExpedientePage() {

  const { id } = useParams();

  const [emp, setEmp] = useState<Record<string, unknown> | null>(null);



  useEffect(() => {

    if (id) fetch(`/api/empleados/${id}`).then((r) => r.json()).then(setEmp);

  }, [id]);



  if (!emp) return <LoadingState label="Cargando expediente…" />;



  const empleado = emp as {

    id: number;

    numeroEmpleado: string;

    nombre: string;

    apellidoPaterno: string;

    apellidoMaterno?: string;

    email: string;

    curp?: string | null;

    rfc?: string | null;

    telefono?: string;

    puesto: string;

    fechaIngreso: string;

    fotoUrl?: string | null;

    departamento?: { nombre: string; organizacion: { nombre: string } };

    turno?: { nombre: string; horaInicio: string; horaFin: string };

    asistencias: { fecha: string; estado: string; horaEntrada?: string }[];

    capacitaciones: { capacitacion: { nombre: string }; estado: string }[];

    solicitudes: { tipo: string; estado: string; motivo: string; fechaInicio: string; fechaFin: string; diasSolicitados: number }[];

    evaluaciones: { periodo: string; comentarios: string; puntaje?: number }[];

    documentos: { id: number; tipo: string; nombre: string; rutaArchivo: string; activo: boolean; createdAt: string; observaciones?: string | null }[];

    quejas: { asunto: string; estado: string }[];

  };



  function descargarExpediente() {

    const nombreCompleto = `${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno || ""}`.trim();

    descargarPdf({

      titulo: "Expediente Digital",

      subtitulo: `${nombreCompleto} · No. ${empleado.numeroEmpleado}`,

      archivo: `expediente-${empleado.numeroEmpleado || empleado.id}.pdf`,

      secciones: [

        {

          titulo: "Información laboral",

          head: ["Campo", "Valor"],

          body: [

            ["Puesto", empleado.puesto || "-"],

            ["Email", empleado.email || "-"],

            ["CURP", empleado.curp || "-"],

            ["RFC", empleado.rfc || "-"],

            ["Teléfono", empleado.telefono || "-"],

            ["Fecha ingreso", new Date(empleado.fechaIngreso).toLocaleDateString("es-MX")],

            ["Departamento", empleado.departamento?.nombre || "-"],

            ["Organización", empleado.departamento?.organizacion.nombre || "-"],

          ],

        },

        {

          titulo: "Permisos y vacaciones",

          head: ["Tipo", "Inicio", "Fin", "Días", "Estado"],

          body: (empleado.solicitudes || []).map((s) => [s.tipo, new Date(s.fechaInicio).toLocaleDateString("es-MX"), new Date(s.fechaFin).toLocaleDateString("es-MX"), s.diasSolicitados, s.estado]),

        },

        {

          titulo: "Capacitaciones",

          head: ["Capacitación", "Estado"],

          body: (empleado.capacitaciones || []).map((c) => [c.capacitacion.nombre, c.estado]),

        },

        {

          titulo: "Evaluaciones de desempeño",

          head: ["Periodo", "Puntaje", "Comentarios"],

          body: (empleado.evaluaciones || []).map((ev) => [ev.periodo, ev.puntaje ? `${ev.puntaje}/100` : "-", ev.comentarios || ""]),

        },

        {

          titulo: "Documentos",

          head: ["Tipo", "Nombre"],

          body: (empleado.documentos || []).map((d) => [d.tipo, d.nombre]),

        },

      ],

    });

  }



  return (

    <div>

      <Link href="/empleados" className="link-action text-sm mb-4 inline-block">

        ← Volver a empleados

      </Link>



      <div className="mb-8 flex items-start gap-4 flex-wrap">
        <Avatar nombre={empleado.nombre} apellido={empleado.apellidoPaterno} fotoUrl={empleado.fotoUrl} size="xl" />
        <div className="flex-1 min-w-0">
          <PageHeader
            title="Expediente digital"
            subtitle={`${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno || ""}`}
            actions={
              <button onClick={descargarExpediente} className="btn-primary flex items-center gap-2 text-sm" type="button">
                <FileText size={16} aria-hidden /> Descargar PDF
              </button>
            }
          />
        </div>
      </div>



      <div className="card mb-6">

        <h2 className="font-semibold mb-4" style={{ color: "var(--color-primary)" }}>Expediente de vacaciones</h2>

        <ExpedienteVacacionesPanel empleadoId={empleado.id} compact />

      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="card lg:col-span-1">

          <h2 className="font-semibold mb-4">Información Laboral</h2>

          <dl className="space-y-2 text-sm">

            <div><dt className="text-muted">No. Empleado</dt><dd className="font-medium">{empleado.numeroEmpleado}</dd></div>

            <div><dt className="text-muted">Puesto</dt><dd>{empleado.puesto}</dd></div>

            <div><dt className="text-muted">Email</dt><dd>{empleado.email}</dd></div>

            <div><dt className="text-muted">CURP</dt><dd className="font-mono text-xs">{empleado.curp || "-"}</dd></div>

            <div><dt className="text-muted">RFC</dt><dd className="font-mono text-xs">{empleado.rfc || "-"}</dd></div>

            <div><dt className="text-muted">Teléfono</dt><dd>{empleado.telefono || "-"}</dd></div>

            <div><dt className="text-muted">Fecha ingreso</dt><dd>{new Date(empleado.fechaIngreso).toLocaleDateString("es-MX")}</dd></div>

            <div><dt className="text-muted">Departamento</dt><dd>{empleado.departamento?.nombre || "-"}</dd></div>

            <div><dt className="text-muted">Organización</dt><dd>{empleado.departamento?.organizacion.nombre || "-"}</dd></div>

            {empleado.turno && (

              <div><dt className="text-muted">Turno</dt><dd>{empleado.turno.nombre} ({empleado.turno.horaInicio}-{empleado.turno.horaFin})</dd></div>

            )}

          </dl>

        </div>



        <div className="card lg:col-span-2 space-y-6">

          <section>

            <h2 className="font-semibold mb-3">Permisos y vacaciones</h2>

            {empleado.solicitudes?.length ? empleado.solicitudes.map((s, i) => (

              <div key={i} className="p-2 bg-[var(--color-surface-2)] rounded mb-2 text-sm flex justify-between">

                <span>{s.tipo} · {new Date(s.fechaInicio).toLocaleDateString("es-MX")} – {new Date(s.fechaFin).toLocaleDateString("es-MX")} ({s.diasSolicitados} días)</span>

                <StatusBadge estado={s.estado} />

              </div>

            )) : <p className="text-sm text-muted">Sin solicitudes</p>}

          </section>



          <section>

            <h2 className="font-semibold mb-3">Capacitaciones</h2>

            {empleado.capacitaciones?.length ? empleado.capacitaciones.map((c, i) => (

              <div key={i} className="p-2 bg-[var(--color-surface-2)] rounded mb-2 text-sm">

                {c.capacitacion.nombre} · <StatusBadge estado={c.estado} />

              </div>

            )) : <p className="text-sm text-muted">Sin capacitaciones</p>}

          </section>



          <section>

            <h2 className="font-semibold mb-3">Evaluaciones de Desempeño</h2>

            {empleado.evaluaciones?.map((ev, i) => (

              <div key={i} className="p-3 bg-[var(--color-surface-2)] rounded mb-2 text-sm">

                <p className="font-medium">{ev.periodo} {ev.puntaje ? `· ${ev.puntaje}/100` : ""}</p>

                <p className="text-muted">{ev.comentarios}</p>

              </div>

            ))}

          </section>



          <section>
            <h2 className="font-semibold mb-3">Documentos laborales</h2>
            {empleado.documentos?.length ? (
              <div className="hl-table-shell">
                <div className="hl-table-wrap">
                <table className="hl-table min-w-[520px]">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Nombre</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empleado.documentos.map((d) => (
                      <tr key={d.id}>
                        <td>{d.tipo}</td>
                        <td>{d.nombre}</td>
                        <td className="whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString("es-MX")}</td>
                        <td>{d.activo ? "Activo" : "Inactivo"}</td>
                        <td className="px-3 py-2">
                          <a href={d.rutaArchivo} target="_blank" rel="noopener noreferrer" className="link-action mr-2">Ver</a>
                          <a href={d.rutaArchivo} download className="link-action">Descargar</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">Sin documentos registrados</p>
            )}
          </section>



          {empleado.quejas?.length > 0 && (

            <section>

              <h2 className="font-semibold mb-3">Quejas laborales</h2>

              {empleado.quejas.map((q, i) => (

                <div key={i} className="text-sm p-2 bg-[var(--color-surface-2)] rounded mb-2">{q.asunto} · {labelEstadoQueja(String(q.estado))}</div>

              ))}

            </section>

          )}

        </div>

      </div>

    </div>

  );

}


