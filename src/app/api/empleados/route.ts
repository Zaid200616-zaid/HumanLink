import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { empleadoCreateSchema, mensajeDuplicadoEmpleado } from "@/lib/schemas/empleado";
import { firstZodError } from "@/lib/validation/zod-errors";

// RF-H02 + RNF13 - Consulta eficiente con filtros indexados y paginación
export async function GET(request: NextRequest) {
  const { error } = await requireAuth("empleados:read");
  if (error) return error;

  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const departamentoId = sp.get("departamentoId");
  const puesto = sp.get("puesto")?.trim() || "";
  const activoParam = sp.get("activo");
  const pageParam = sp.get("page");

  const where: Prisma.EmpleadoWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { nombre: { contains: q } },
              { apellidoPaterno: { contains: q } },
              { apellidoMaterno: { contains: q } },
              { numeroEmpleado: { contains: q } },
              { email: { contains: q } },
              { curp: { contains: q } },
              { rfc: { contains: q } },
            ],
          }
        : {},
      departamentoId ? { departamentoId: parseInt(departamentoId) } : {},
      puesto ? { puesto: { contains: puesto } } : {},
      activoParam === "true" ? { activo: true } : activoParam === "false" ? { activo: false } : {},
    ],
  };

  const include = {
    departamento: { include: { organizacion: true } },
    turno: true,
  } as const;

  // Sin paginación: modo lista para selects/dropdowns (límite para no cargar 10k+ registros)
  if (!pageParam) {
    const limit = Math.min(500, Math.max(1, parseInt(sp.get("limit") || "200") || 200));
    const empleados = await prisma.empleado.findMany({
      where,
      include,
      orderBy: [{ apellidoPaterno: "asc" }, { nombre: "asc" }],
      take: limit,
    });
    return apiSuccess(empleados);
  }

  // RNF13 - Paginación en servidor: solo los registros necesarios por pantalla
  const page = Math.max(1, parseInt(pageParam) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25") || 25));

  const [items, total] = await Promise.all([
    prisma.empleado.findMany({
      where,
      include,
      orderBy: [{ apellidoPaterno: "asc" }, { nombre: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.empleado.count({ where }),
  ]);

  return apiSuccess({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

// RNF13 - Validaciones de integridad para evitar registros incompletos/duplicados
const empleadoSchema = empleadoCreateSchema;

export async function POST(request: NextRequest) {
  const { error } = await requireAuth("empleados:write");
  if (error) return error;

  const body = await request.json();
  const parsed = empleadoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(firstZodError(parsed.error), 400);
  }

  const { curp, rfc, ...rest } = parsed.data;

  // RNF13 - Verificar que no existan duplicados antes de guardar (además del @unique en BD)
  const duplicado = await prisma.empleado.findFirst({
    where: {
      OR: [
        { numeroEmpleado: rest.numeroEmpleado },
        { email: rest.email },
        ...(curp ? [{ curp }] : []),
        ...(rfc ? [{ rfc }] : []),
      ],
    },
    select: { numeroEmpleado: true, email: true, curp: true, rfc: true },
  });
  if (duplicado) {
    return apiError(mensajeDuplicadoEmpleado(duplicado, { ...rest, curp, rfc }), 409);
  }

  try {
    const empleado = await prisma.empleado.create({
      data: {
        ...rest,
        curp,
        rfc,
        fechaIngreso: new Date(rest.fechaIngreso),
      },
      include: { departamento: true, turno: true },
    });
    return apiSuccess(empleado, 201);
  } catch (e) {
    // Respaldo ante condición de carrera: la restricción @unique de la BD garantiza integridad
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return apiError("Ya existe un empleado con esos datos únicos", 409);
    }
    throw e;
  }
}
