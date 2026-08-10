import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseAdmin } from "@/lib/supabase/server";

import { registrarDiff } from "./registrarDiff";

vi.mock("next/server", () => ({
  after: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseAdmin: vi.fn(),
}));

const DIFF = {
  clienteId: "a1111111-1111-4111-8111-111111111111",
  usuarioId: "d0000000-0000-4000-8000-000000000001",
  tablaAfectada: "clientes",
  registroId: "c-nuevo-cliente",
  campoModificado: "alta",
  valorAnterior: null,
  valorNuevo: "{}",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registrarDiff", () => {
  it("programa el insert vía after() en vez de ejecutarlo de forma síncrona", () => {
    const insert = vi.fn(async () => ({ error: null }));
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue({ from: vi.fn(() => ({ insert })) } as never);

    registrarDiff(DIFF);

    expect(after).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledWith(expect.any(Function));
    expect(insert).not.toHaveBeenCalled(); // el callback de after() todavía no corrió
  });

  it("no retrasa al llamador: retorna antes de que el insert asíncrono se resuelva", async () => {
    let resolverInsert: (() => void) | undefined;
    const insertLento = vi.fn(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolverInsert = () => resolve({ error: null });
        }),
    );
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue({ from: vi.fn(() => ({ insert: insertLento })) } as never);

    let callbackDeAfter: (() => Promise<void>) | undefined;
    vi.mocked(after).mockImplementation((callback) => {
      callbackDeAfter = callback as () => Promise<void>;
    });

    const resultado = registrarDiff(DIFF); // no es una Promise: retorna de inmediato

    expect(resultado).toBeUndefined();
    expect(insertLento).not.toHaveBeenCalled();

    // Recién acá simulamos que Next.js dispara el callback, después de responder al cliente.
    // No lo esperamos a que termine (el insert simulado se resuelve manualmente más abajo).
    void callbackDeAfter?.();
    await Promise.resolve();
    expect(insertLento).toHaveBeenCalledTimes(1);

    resolverInsert?.();
  });

  it("inserta el diff completo (campo, valores, usuario_id, cliente_id) sin fijar timestamp desde la app", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue({ from: vi.fn(() => ({ insert })) } as never);
    vi.mocked(after).mockImplementation((callback) => {
      void (callback as () => Promise<void>)();
    });

    registrarDiff({
      clienteId: DIFF.clienteId,
      usuarioId: DIFF.usuarioId,
      tablaAfectada: "productos",
      registroId: "p-1",
      campoModificado: "precio",
      valorAnterior: "1000",
      valorNuevo: "1200",
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(insert).toHaveBeenCalledWith({
      cliente_id: DIFF.clienteId,
      usuario_id: DIFF.usuarioId,
      tabla_afectada: "productos",
      registro_id: "p-1",
      campo_modificado: "precio",
      valor_anterior: "1000",
      valor_nuevo: "1200",
    });
  });

  it("no lanza y reporta a Sentry si el insert falla, sin afectar al llamador", async () => {
    const errorSupabase = { message: "fallo de conexión" };
    const insert = vi.fn(async () => ({ error: errorSupabase }));
    vi.mocked(crearClienteSupabaseAdmin).mockReturnValue({ from: vi.fn(() => ({ insert })) } as never);
    vi.mocked(after).mockImplementation((callback) => {
      void (callback as () => Promise<void>)();
    });

    expect(() => registrarDiff(DIFF)).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();

    expect(Sentry.captureException).toHaveBeenCalledWith(errorSupabase, {
      tags: { modulo: "auditoria_diffs" },
    });
  });
});
