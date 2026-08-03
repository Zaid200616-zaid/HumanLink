import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Genera un secreto base32 aleatorio para TOTP (RFC 4648). */
export function generarSecretoBase32(longitud = 20): string {
  const bytes = crypto.randomBytes(longitud);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let secret = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
}

function base32Decode(secret: string): Buffer {
  const limpio = secret.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = "";
  for (const c of limpio) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** Genera el código TOTP de 6 dígitos para un contador de tiempo dado (RFC 6238). */
export function generarTotp(secret: string, paso = 0, periodo = 30): string {
  const contador = Math.floor(Date.now() / 1000 / periodo) + paso;
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(contador));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binario =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binario % 1_000_000).toString().padStart(6, "0");
}

/**
 * Valida un código 2FA. Acepta TOTP real (RFC 6238, con ventana ±1 paso) y,
 * por compatibilidad demo, el secreto completo o sus primeros 6 caracteres.
 */
export function verifyTotp(secret: string, code: string): boolean {
  const normalized = code.trim().toUpperCase().replace(/\s/g, "");
  if (!normalized) return false;

  // Compatibilidad demo
  if (normalized === secret.toUpperCase() || normalized === secret.slice(0, 6).toUpperCase()) {
    return true;
  }

  // TOTP real con tolerancia de ±1 ventana (reloj desfasado)
  for (const paso of [-1, 0, 1]) {
    try {
      if (generarTotp(secret, paso) === normalized) return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Construye la URI otpauth:// para apps como Google Authenticator. */
export function construirOtpauthUri(secret: string, email: string, emisor = "HumanLink"): string {
  const label = encodeURIComponent(`${emisor}:${email}`);
  const params = new URLSearchParams({ secret, issuer: emisor, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${label}?${params.toString()}`;
}
