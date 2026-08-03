import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth-edge";
import { checkRateLimit } from "@/lib/rate-limit";

const publicPaths = ["/login", "/postular", "/recuperar", "/api/auth/login", "/api/auth/recuperar", "/api/public"];

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/images/") ||
    pathname === "/icon.svg" ||
    pathname === "/manifest.json" ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".webp")
  );
}

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return publicPaths.some((p) => pathname.startsWith(p));
}

/** En local no hay certificado TLS; RNF-08 HTTPS aplica en despliegue real detrás de proxy. */
function esHostLocal(hostname: string) {
  const h = hostname.split(":")[0].toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1") return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // RNF-08 — Forzar HTTPS en producción (excepto localhost / red local sin TLS)
  const forzarHttps = process.env.FORCE_HTTPS !== "false";
  if (process.env.NODE_ENV === "production" && forzarHttps && !esHostLocal(request.nextUrl.hostname)) {
    const proto = request.headers.get("x-forwarded-proto");
    if (proto === "http") {
      const url = request.nextUrl.clone();
      url.protocol = "https:";
      return NextResponse.redirect(url, 301);
    }
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rateKey = `${ip}:${pathname.startsWith("/api/auth/login") ? "login" : "global"}`;
  const rate = checkRateLimit(rateKey);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo.", retryAfter: rate.retryAfter },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 60) } }
    );
  }

  // Formulario público de candidatos (POST sin auth)
  if (pathname === "/api/candidatos" && request.method === "POST") {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifyToken(token);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|images/).*)"],
};
