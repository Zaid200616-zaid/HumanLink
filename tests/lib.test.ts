import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { verifyTotp, generarTotp, generarSecretoBase32, construirOtpauthUri } from "../src/lib/totp";
import { calcularDiasHabiles } from "../src/lib/vacaciones";
import { checkRateLimit } from "../src/lib/rate-limit";

describe("TOTP (RFC 6238)", () => {
  it("genera un secreto base32 válido", () => {
    const secret = generarSecretoBase32();
    assert.match(secret, /^[A-Z2-7]+$/);
    assert.ok(secret.length >= 16);
  });

  it("genera códigos de 6 dígitos", () => {
    const secret = generarSecretoBase32();
    const code = generarTotp(secret);
    assert.match(code, /^\d{6}$/);
  });

  it("valida el código TOTP recién generado", () => {
    const secret = generarSecretoBase32();
    const code = generarTotp(secret);
    assert.equal(verifyTotp(secret, code), true);
  });

  it("acepta los primeros 6 caracteres del secreto (demo)", () => {
    assert.equal(verifyTotp("ABC123DEF456", "ABC123"), true);
  });

  it("rechaza un código incorrecto", () => {
    assert.equal(verifyTotp(generarSecretoBase32(), "000001"), false);
  });

  it("construye una URI otpauth válida", () => {
    const uri = construirOtpauthUri("ABCDEF", "user@test.mx");
    assert.ok(uri.startsWith("otpauth://totp/"));
    assert.ok(uri.includes("secret=ABCDEF"));
  });
});

describe("calcularDiasHabiles", () => {
  // Constructor numérico = medianoche local (evita desfases por zona horaria)
  it("cuenta lunes a domingo como 5 días hábiles", () => {
    assert.equal(calcularDiasHabiles(new Date(2026, 5, 1), new Date(2026, 5, 7)), 5);
  });

  it("un solo día hábil (lunes) cuenta 1", () => {
    assert.equal(calcularDiasHabiles(new Date(2026, 5, 1), new Date(2026, 5, 1)), 1);
  });

  it("un fin de semana (sáb-dom) cuenta 0", () => {
    assert.equal(calcularDiasHabiles(new Date(2026, 5, 6), new Date(2026, 5, 7)), 0);
  });
});

describe("checkRateLimit", () => {
  it("permite solicitudes dentro del límite", () => {
    const key = `test-${Date.now()}`;
    assert.equal(checkRateLimit(key).ok, true);
  });

  it("bloquea al superar el límite", () => {
    const key = `flood-${Date.now()}`;
    let bloqueado = false;
    for (let i = 0; i < 200; i++) {
      if (!checkRateLimit(key).ok) { bloqueado = true; break; }
    }
    assert.equal(bloqueado, true);
  });
});
