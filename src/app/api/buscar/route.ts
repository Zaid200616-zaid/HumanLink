import { NextRequest } from "next/server";
import { apiError, requireAuth } from "@/lib/api";
import { hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error || !session) return error;

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return apiError("Ingrese al menos 2 caracteres para buscar.");

  const empleados = await prisma.empleado.findMany({
    where: {
      activo: true,
      OR: [
        { nombre: { contains: q } },
        { apellidoPaterno: { contains: q } },
        { email: { contains: q } },
        { numeroEmpleado: { contains: q } },
      ],
    },
    take: 8,
    select: {
      id: true,
      nombre: true,
      apellidoPaterno: true,
      puesto: true,
      numeroEmpleado: true,
    },
  });

  const puedeReclutamiento =
    session.rol !== "Empleado" &&
    (hasPermission(session.permisos, "vacantes:read") ||
      hasPermission(session.permisos, "candidatos:read") ||
      hasPermission(session.permisos, "vacantes:*") ||
      hasPermission(session.permisos, "candidatos:*"));

  const vacantes = puedeReclutamiento
    ? await prisma.vacante.findMany({
        where: { titulo: { contains: q } },
        take: 5,
        select: { id: true, titulo: true, estado: true },
      })
    : [];

  const candidatos = puedeReclutamiento
    ? await prisma.candidato.findMany({
        where: {
          OR: [{ nombre: { contains: q } }, { email: { contains: q } }],
        },
        take: 5,
        select: { id: true, nombre: true, apellidoPaterno: true, etapa: true },
      })
    : [];

  const departamentos =
    hasPermission(session.permisos, "departamentos:read") ||
    hasPermission(session.permisos, "departamentos:*")
      ? await prisma.departamento.findMany({
          where: {
            activo: true,
            OR: [{ nombre: { contains: q } }, { descripcion: { contains: q } }],
          },
          take: 5,
          select: {
            id: true,
            nombre: true,
            organizacion: { select: { nombre: true } },
          },
        })
      : [];

  const documentos =
    hasPermission(session.permisos, "documentos:read") ||
    hasPermission(session.permisos, "documentos:*")
      ? await prisma.documento.findMany({
          where: {
            activo: true,
            OR: [{ nombre: { contains: q } }, { tipo: { contains: q } }],
          },
          take: 5,
          select: {
            id: true,
            nombre: true,
            tipo: true,
            empleado: { select: { nombre: true, apellidoPaterno: true } },
          },
        })
      : [];

  return Response.json({ empleados, vacantes, candidatos, departamentos, documentos });
}
