import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export async function guardarArchivo(
  subfolder: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, subfolder);
  await mkdir(dir, { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}-${safeName}`;
  const fullPath = path.join(dir, unique);
  await writeFile(fullPath, buffer);
  return `/api/uploads/${subfolder}/${unique}`;
}

export function uploadsPath(subfolder: string, filename: string): string {
  return path.join(UPLOAD_ROOT, subfolder, filename);
}
