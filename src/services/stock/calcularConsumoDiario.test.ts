import { beforeEach, describe, expect, it, vi } from "vitest";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

import { calcularConsumoDiario } from "./calcularConsumoDiario";

vi.mock("@/lib/supabase/server", () => ({
  crearClienteSupabaseServidor: vi.fn(),
}));

interface ResultadoSupabase {
  data: unknown;
  error: unknown;
}

function mockearSupabase(productoRes: ResultadoSupabase, itemsRes: ResultadoSupabase) {
  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    eq: vi.fn(() => queryBuilder),
    is: vi.fn(() => queryBuilder),
    gte: vi.fn(() => queryBuilder),
    single: vi.fn(async () => productoRes),
  };

  const supabaseMock = {
    from: vi.fn((tabla: string) => {
      if (tabla === "productos") {
        return queryBuilder;
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(async () => itemsRes),
          })),
        })),
      };
    }),
  };

  return supabaseMock;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("calcularConsumoDiario", () => {
  it("retorna null si el producto no existe o está eliminado", async () => {
    const supabaseMock = mockearSupabase({ data: null, error: new Error("Not found") }, { data: [], error: null });
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await calcularConsumoDiario("prod-1");
    expect(resultado).toBeNull();
  });

  it("calcula consumo diario ignorando dias sin ventas e identifica alerta y urgencia", async () => {
    const productoMock = {
      data: {
        producto_id: "prod-1",
        nombre: "Yerba Mate",
        stock_actual: 15,
        stock_minimo: 5,
        proveedores: {
          dias_demora: 2,
        },
      },
      error: null,
    };

    const itemsMock = {
      data: [
        { cantidad: 5, ventas: { creado_en: "2026-08-20T10:00:00Z" } },
        { cantidad: 5, ventas: { creado_en: "2026-08-20T14:00:00Z" } }, // Mismo día
        { cantidad: 10, ventas: { creado_en: "2026-08-22T09:00:00Z" } }, // Segundo día
      ],
      error: null,
    };

    const supabaseMock = mockearSupabase(productoMock, itemsMock);
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await calcularConsumoDiario("prod-1");

    expect(resultado).toEqual({
      productoId: "prod-1",
      consumoDiario: 10, // (5 + 5 + 10) / 2 dias unicos
      puntoPedido: 25, // 5 + (10 * 2)
      diasDemora: 2,
      stockMinimo: 5,
      stockActual: 15,
      dispararAlerta: true, // stockActual (15) <= puntoPedido (25)
      prioridadUrgente: false, // stockActual (15) > stockMinimo (5)
    });
  });

  it("dispara alerta urgente si stockActual es menor o igual al stock mínimo", async () => {
    const productoMock = {
      data: {
        producto_id: "prod-1",
        nombre: "Yerba Mate",
        stock_actual: 3,
        stock_minimo: 5,
        proveedores: {
          dias_demora: 2,
        },
      },
      error: null,
    };

    const itemsMock = {
      data: [
        { cantidad: 10, ventas: { creado_en: "2026-08-20T10:00:00Z" } },
      ],
      error: null,
    };

    const supabaseMock = mockearSupabase(productoMock, itemsMock);
    vi.mocked(crearClienteSupabaseServidor).mockResolvedValue(supabaseMock as never);

    const resultado = await calcularConsumoDiario("prod-1");

    expect(resultado).toEqual({
      productoId: "prod-1",
      consumoDiario: 10,
      puntoPedido: 25,
      diasDemora: 2,
      stockMinimo: 5,
      stockActual: 3,
      dispararAlerta: true,
      prioridadUrgente: true, // stockActual (3) <= stockMinimo (5)
    });
  });
});
