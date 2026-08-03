import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contactoSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  asunto: z.string().min(3),
  mensaje: z.string().min(10),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = contactoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message || "Datos inválidos", 400);
  }

  const lead = await prisma.contactoLead.create({ data: parsed.data });
  return apiSuccess({ id: lead.id, ok: true }, 201);
}
