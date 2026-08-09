/**
 * Prueba de integración (Paso 4 de la actividad): ejercita
 * verificarPertenenciaTenant() ya integrado dentro de las mutaciones reales
 * de ventas/devoluciones/clientesFinales, no en aislamiento. Solo se
 * stubea el límite externo (el cliente Supabase); la lógica del guard y de
 * los repositorios corre real, simulando acceso cruzado entre dos tenants.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registrarDiffAuditoria } from "@/repositories/auditoria";
import { actualizarClienteFinal } from "@/repositories/clientesFinales";
import { actualizarEstadoDevolucion } from "@/repositories/devoluciones";
import { actualizarEstadoVenta } from "@/repositories/ventas";

import { verificarPertenenciaTenant } from "./verificarPertenenciaTenant";

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

vi.mock("@/repositories/auditoria", () => ({
  registrarDiffAuditoria: vi.fn(async () => undefined),
}));

const TENANT_A = "a1111111-1111-4111-8111-111111111111";
const TENANT_B = "b2222222-2222-4222-8222-222222222222";
const USUARIO_A = "u-comerciante-a";

function crearMockSupabase(filaEncontrada: Record<string, string> | null) {
  const builderSelect = {
    eq: vi.fn(() => builderSelect),
    maybeSingle: vi.fn(async () => ({ data: filaEncontrada, error: null })),
  };

  const builderUpdate = {
    eq: vi.fn(() => builderUpdate),
    select: vi.fn(() => builderUpdate),
    single: vi.fn(async () => ({ data: { ...filaEncontrada, estado: "procesada" }, error: null })),
  };

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => builderSelect),
      update: vi.fn(() => builderUpdate),
    })),
    _builderUpdate: builderUpdate,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verificarPertenenciaTenant", () => {
  it("retorna NX-SYS-007 sin ejecutar mutación cuando el recurso es de otro tenant", async () => {
    const supabase = crearMockSupabase(null); // sin fila: no existe con ese id + cliente_id del tenant A

    const resultado = await verificarPertenenciaTenant(TENANT_B, TENANT_A, {
      supabase: supabase as never,
      tabla: "ventas",
      usuarioId: USUARIO_A,
    });

    expect(resultado).toEqual({ perteneceAlTenant: false, error: "NX-SYS-007" });
  });

  it("deja continuar la operación cuando el recurso sí pertenece al tenant autenticado", async () => {
    const supabase = crearMockSupabase({ venta_id: TENANT_A });

    const resultado = await verificarPertenenciaTenant(TENANT_A, TENANT_A, {
      supabase: supabase as never,
      tabla: "ventas",
    });

    expect(resultado).toEqual({ perteneceAlTenant: true, error: null });
  });

  it("registra el intento de acceso cruzado en Sentry y en auditoria_diffs", async () => {
    const Sentry = await import("@sentry/nextjs");
    const supabase = crearMockSupabase(null);

    await verificarPertenenciaTenant("venta-ajena", TENANT_A, {
      supabase: supabase as never,
      tabla: "ventas",
      usuarioId: USUARIO_A,
    });

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("IDOR/BOLA"),
      expect.objectContaining({ level: "warning", tags: expect.objectContaining({ codigo_error: "NX-SYS-007" }) }),
    );

    expect(registrarDiffAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: TENANT_A,
        usuarioId: USUARIO_A,
        tablaAfectada: "ventas",
        registroId: "venta-ajena",
        campoModificado: "intento_acceso_cruzado",
      }),
    );
  });
});

describe("guard aplicado en el repositorio de ventas", () => {
  it("bloquea actualizarEstadoVenta antes de tocar la base si la venta es de otro tenant", async () => {
    const supabase = crearMockSupabase(null);

    const resultado = await actualizarEstadoVenta("venta-de-otro-tenant", "devuelta_total", {
      supabase: supabase as never,
      clienteIdJwt: TENANT_A,
      usuarioId: USUARIO_A,
    });

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-007" });
    expect(supabase.from).toHaveBeenCalledTimes(1); // solo la consulta del guard, nunca el update
  });
});

describe("guard aplicado en el repositorio de devoluciones", () => {
  it("bloquea la mutación antes de tocar la base cuando la devolución es de otro tenant", async () => {
    const supabase = crearMockSupabase(null);

    const resultado = await actualizarEstadoDevolucion("devolucion-de-otro-tenant", "procesada", {
      supabase: supabase as never,
      clienteIdJwt: TENANT_A,
      usuarioId: USUARIO_A,
    });

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-007" });
    expect(supabase._builderUpdate.eq).not.toHaveBeenCalled();
  });

  it("permite la mutación cuando la devolución pertenece al tenant autenticado", async () => {
    const supabase = crearMockSupabase({ devolucion_id: "devolucion-propia" });

    const resultado = await actualizarEstadoDevolucion("devolucion-propia", "procesada", {
      supabase: supabase as never,
      clienteIdJwt: TENANT_A,
      usuarioId: USUARIO_A,
    });

    expect(resultado.ok).toBe(true);
  });
});

describe("guard aplicado en el repositorio de clientesFinales", () => {
  it("bloquea actualizarClienteFinal antes de tocar la base si el cliente final es de otro tenant", async () => {
    const supabase = crearMockSupabase(null);

    const resultado = await actualizarClienteFinal(
      "cliente-final-de-otro-tenant",
      { telefono: "+5490000000000" },
      { supabase: supabase as never, clienteIdJwt: TENANT_A, usuarioId: USUARIO_A },
    );

    expect(resultado).toEqual({ ok: false, error: "NX-SYS-007" });
    expect(supabase._builderUpdate.eq).not.toHaveBeenCalled();
  });
});
