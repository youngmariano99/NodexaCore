import { z } from "zod";
import { describe, expect, it } from "vitest";

import { obtenerMensajeError } from "@/lib/errores/catalogo";

import { ErrorDeDominio, mapearError } from "./mapearError";

describe("mapearError", () => {
  it("traduce un ZodError a NX-SYS-006 con el mensaje del catálogo", () => {
    const esquema = z.object({ nombre: z.string() });
    const resultado = esquema.safeParse({ nombre: 123 });

    const mapeado = mapearError(resultado.error);

    expect(mapeado).toEqual({ codigo: "NX-SYS-006", mensaje: obtenerMensajeError("NX-SYS-006") });
  });

  it("traduce un ErrorDeDominio a su propio código de catálogo", () => {
    const mapeado = mapearError(new ErrorDeDominio("NX-ADM-001"));

    expect(mapeado).toEqual({ codigo: "NX-ADM-001", mensaje: obtenerMensajeError("NX-ADM-001") });
  });

  it("deja pasar un código de catálogo ya normalizado", () => {
    const mapeado = mapearError("NX-SYS-003");

    expect(mapeado).toEqual({ codigo: "NX-SYS-003", mensaje: obtenerMensajeError("NX-SYS-003") });
  });

  it("nunca expone el mensaje SQL crudo ni nombres de columnas de un error técnico de Supabase", () => {
    const errorSupabase = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "clientes_slug_key"',
      details: "Key (slug)=(almacen-don-pedro) already exists.",
    };

    const mapeado = mapearError(errorSupabase);

    expect(mapeado.codigo).toBe("NX-SYS-001");
    expect(mapeado.mensaje).not.toContain("constraint");
    expect(mapeado.mensaje).not.toContain("slug");
    expect(mapeado.mensaje).not.toContain("clientes_slug_key");
  });

  it("mapea por defecto a NX-SYS-001 un código no contemplado en el catálogo", () => {
    const mapeado = mapearError("NX-INVENTADO-999");

    expect(mapeado).toEqual({ codigo: "NX-SYS-001", mensaje: obtenerMensajeError("NX-SYS-001") });
  });

  it("mapea por defecto a NX-SYS-001 cualquier valor no reconocido (null, undefined, primitivos)", () => {
    expect(mapearError(null).codigo).toBe("NX-SYS-001");
    expect(mapearError(undefined).codigo).toBe("NX-SYS-001");
    expect(mapearError(42).codigo).toBe("NX-SYS-001");
    expect(mapearError(new Error("boom")).codigo).toBe("NX-SYS-001");
  });
});
