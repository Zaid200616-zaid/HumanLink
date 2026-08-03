import { NextRequest } from "next/server";

import { z } from "zod";

import { Prisma } from "@prisma/client";

import { apiError, apiSuccess, requireAuth } from "@/lib/api";

import { prisma } from "@/lib/prisma";



const empleadoSelect = {

  id: true,

  numeroEmpleado: true,

  nombre: true,

  apellidoPaterno: true,

  turnoId: true,

} as const;



// RF-H20 + RNF12 — Búsqueda paginada

export async function GET(request: NextRequest) {

  const { error } = await requireAuth();

  if (error) return error;



  const sp = request.nextUrl.searchParams;

  const q = sp.get("q")?.trim() || "";

  const horario = sp.get("horario")?.trim() || "";

  const soloActivos = sp.get("soloActivos") === "1";

  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));

  const pageSize = Math.min(50, Math.max(5, parseInt(sp.get("pageSize") || "15", 10)));

  const includeEmpleados = sp.get("includeEmpleados") === "1" && pageSize <= 20;



  const where: Prisma.TurnoWhereInput = {

    ...(soloActivos ? { activo: true } : {}),

  };



  const orFilters: Prisma.TurnoWhereInput[] = [];

  if (q) {

    orFilters.push(

      { nombre: { contains: q } },

      { descripcion: { contains: q } },

    );

  }

  if (horario) {

    orFilters.push(

      { horaInicio: { contains: horario } },

      { horaFin: { contains: horario } },

    );

  }

  if (q && horario) {

    where.AND = [

      { OR: [{ nombre: { contains: q } }, { descripcion: { contains: q } }] },

      { OR: [{ horaInicio: { contains: horario } }, { horaFin: { contains: horario } }] },

    ];

  } else if (orFilters.length) {

    where.OR = orFilters;

  }



  const [total, turnos] = await Promise.all([

    prisma.turno.count({ where }),

    prisma.turno.findMany({

      where,

      skip: (page - 1) * pageSize,

      take: pageSize,

      include: {

        _count: { select: { empleados: true } },

        ...(includeEmpleados

          ? {

              empleados: {

                select: empleadoSelect,

                orderBy: { apellidoPaterno: "asc" },

                take: 100,

              },

            }

          : {}),

      },

      orderBy: { nombre: "asc" },

    }),

  ]);



  return apiSuccess({

    items: turnos,

    total,

    page,

    pageSize,

    totalPages: Math.max(1, Math.ceil(total / pageSize)),

  });

}



const turnoSchema = z.object({

  nombre: z.string().min(2),

  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),

  horaFin: z.string().regex(/^\d{2}:\d{2}$/),

  descripcion: z.string().optional(),

  activo: z.boolean().optional(),

});



export async function POST(request: NextRequest) {

  const { error } = await requireAuth("turnos:write");

  if (error) return error;



  const body = await request.json();

  const parsed = turnoSchema.safeParse(body);

  if (!parsed.success) return apiError("Datos inválidos");



  const turno = await prisma.turno.create({

    data: { ...parsed.data, activo: parsed.data.activo ?? true },

    include: { _count: { select: { empleados: true } } },

  });

  return apiSuccess(turno, 201);

}

