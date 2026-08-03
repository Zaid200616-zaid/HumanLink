import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function rangoMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1);
  const fin = new Date(y, m, 0, 23, 59, 59, 999);
  return { inicio, fin };
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("reportes:read");
  if (error) return error;

  const formato = request.nextUrl.searchParams.get("format") || "csv";
  const mesParam = request.nextUrl.searchParams.get("mes");
  const mes =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam)
      ? mesParam
      : new Date().toISOString().slice(0, 7);
  const { inicio, fin } = rangoMes(mes);

  const empleados = await prisma.empleado.findMany({
    include: { departamento: { include: { organizacion: true } } },
  });

  const solicitudes = await prisma.solicitudPermiso.findMany({
    where: {
      OR: [
        { createdAt: { gte: inicio, lte: fin } },
        { fechaResolucion: { gte: inicio, lte: fin } },
      ],
    },
    include: { empleado: true },
    orderBy: { createdAt: "desc" },
  });

  const encabezadoMes = `Periodo del reporte: ${mes}`;

  if (formato === "json") {
    return Response.json({
      mes,
      generado: new Date().toISOString(),
      empleados: empleados.map((e) => ({
        numero: e.numeroEmpleado,
        nombre: `${e.nombre} ${e.apellidoPaterno}`,
        email: e.email,
        puesto: e.puesto,
        departamento: e.departamento?.nombre || "",
        organizacion: e.departamento?.organizacion?.nombre || "",
        activo: e.activo ? "Sí" : "No",
      })),
      solicitudes: solicitudes.map((s) => ({
        id: s.id,
        empleado: s.empleado.nombre,
        tipo: s.tipo,
        inicio: s.fechaInicio.toISOString().split("T")[0],
        fin: s.fechaFin.toISOString().split("T")[0],
        dias: s.diasSolicitados,
        estado: s.estado,
      })),
    });
  }

  if (formato === "xlsx") {
    const wb = XLSX.utils.book_new();
    const metaSheet = XLSX.utils.aoa_to_sheet([
      ["HumanLink — Reporte administrativo"],
      [encabezadoMes],
      [`Generado: ${new Date().toLocaleString("es-MX")}`],
    ]);
    XLSX.utils.book_append_sheet(wb, metaSheet, "Resumen");

    const empleadosSheet = XLSX.utils.json_to_sheet(
      empleados.map((e) => ({
        Numero: e.numeroEmpleado,
        Nombre: `${e.nombre} ${e.apellidoPaterno}`,
        Email: e.email,
        Puesto: e.puesto,
        Departamento: e.departamento?.nombre || "",
        Organizacion: e.departamento?.organizacion?.nombre || "",
        Activo: e.activo ? "Sí" : "No",
      }))
    );
    XLSX.utils.book_append_sheet(wb, empleadosSheet, "Empleados");

    const solicitudesSheet = XLSX.utils.json_to_sheet(
      solicitudes.map((s) => ({
        ID: s.id,
        Empleado: s.empleado.nombre,
        Tipo: s.tipo,
        Inicio: s.fechaInicio.toISOString().split("T")[0],
        Fin: s.fechaFin.toISOString().split("T")[0],
        Dias: s.diasSolicitados,
        Estado: s.estado,
        Motivo: s.motivo,
      }))
    );
    XLSX.utils.book_append_sheet(wb, solicitudesSheet, "Solicitudes");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="humanlink-reporte-${mes}-${Date.now()}.xlsx"`,
      },
    });
  }

  const lines = [
    "REPORTE HUMANLINK",
    encabezadoMes,
    `Generado: ${new Date().toISOString()}`,
    "",
    "=== EMPLEADOS ===",
    "Numero,Nombre,Email,Puesto,Departamento,Organizacion,Activo",
    ...empleados.map((e) =>
      `${e.numeroEmpleado},"${e.nombre} ${e.apellidoPaterno}",${e.email},"${e.puesto}","${e.departamento?.nombre || ""}","${e.departamento?.organizacion?.nombre || ""}",${e.activo}`
    ),
    "",
    "=== SOLICITUDES ===",
    "ID,Empleado,Tipo,Inicio,Fin,Dias,Estado,Motivo",
    ...solicitudes.map((s) =>
      `${s.id},"${s.empleado.nombre}",${s.tipo},${s.fechaInicio.toISOString().split("T")[0]},${s.fechaFin.toISOString().split("T")[0]},${s.diasSolicitados},${s.estado},"${s.motivo.replace(/"/g, "'")}"`
    ),
  ];

  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="humanlink-reporte-${mes}-${Date.now()}.csv"`,
    },
  });
}
