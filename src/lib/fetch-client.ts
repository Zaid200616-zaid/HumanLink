/** Parsea cuerpo JSON de forma segura (evita "Unexpected end of JSON input"). */
async function parseResponseJson(res: Response): Promise<unknown | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Obtiene JSON de API y devuelve array seguro (evita .map is not a function) */
export async function fetchList<T>(url: string, fallback: T[] = []): Promise<T[]> {
  try {
    const res = await fetch(url);
    const data = await parseResponseJson(res);
    if (!res.ok || data === null) return fallback;
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
}

/** Obtiene JSON de API con manejo de error */
export async function fetchJson<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url);
    const data = await parseResponseJson(res);
    if (data === null) {
      return {
        data: null,
        error: res.ok ? "Respuesta vacía del servidor" : "No autenticado",
      };
    }
    if (!res.ok) {
      return { data: null, error: (data as { error?: string }).error || "Error al cargar datos" };
    }
    return { data: data as T, error: null };
  } catch {
    return { data: null, error: "Error de conexión" };
  }
}
