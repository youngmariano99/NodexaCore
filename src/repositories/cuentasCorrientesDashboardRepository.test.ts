import { describe, expect, it, vi } from "vitest";

import { obtenerDashboardCuentasCorrientes } from "./cuentasCorrientesDashboardRepository";

const CLIENTE_ID = "a1111111-1111-4111-8111-111111111111";

describe("cuentasCorrientesDashboardRepository", () => {
  it("calcula correctamente la situación de caja, semáforo de riesgo y top deudores", async () => {
    const supabaseMock = {
      from: vi.fn((tabla: string) => {
        if (tabla === "clientes") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    modo_facturacion_estimada: "automatico",
                    facturacion_manual_monto: 0,
                    tope_deuda_tolerable_pct: 30.0,
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (tabla === "ventas") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(async () => ({
                    data: [{ total: 100000 }, { total: 50000 }],
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        if (tabla === "clientes_finales") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(async () => ({
                  data: [
                    {
                      cliente_final_id: "cf-1",
                      nombre: "Juan Perez",
                      telefono: "+54929201111",
                      limite_credito: 20000,
                      saldo_deudor: 15000,
                      estado: "activo",
                      creado_en: "2026-08-01T10:00:00Z",
                    },
                    {
                      cliente_final_id: "cf-2",
                      nombre: "Maria Garcia",
                      telefono: "+54929202222",
                      limite_credito: 10000,
                      saldo_deudor: 25000,
                      estado: "activo",
                      creado_en: "2026-08-01T10:00:00Z",
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          };
        }
        if (tabla === "movimientos_cuenta_corriente") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [
                    {
                      movimiento_cc_id: "m-1",
                      cliente_final_id: "cf-1",
                      tipo: "cargo",
                      monto: 20000,
                      monto_pendiente: 15000,
                      estado_imputacion: "parcial",
                      comprobante_tipo: "factura",
                      numero_comprobante: "FAC-001",
                      metodo_pago: null,
                      creado_en: "2026-07-01T10:00:00Z", // >30 días
                      clientes_finales: { nombre: "Juan Perez" },
                    },
                    {
                      movimiento_cc_id: "m-2",
                      cliente_final_id: "cf-1",
                      tipo: "pago",
                      monto: 5000,
                      monto_pendiente: 0,
                      estado_imputacion: "total",
                      comprobante_tipo: "recibo_cobro",
                      numero_comprobante: "REC-001",
                      metodo_pago: "transferencia",
                      creado_en: "2026-08-05T10:00:00Z",
                      clientes_finales: { nombre: "Juan Perez" },
                    },
                    {
                      movimiento_cc_id: "m-3",
                      cliente_final_id: "cf-2",
                      tipo: "cargo",
                      monto: 25000,
                      monto_pendiente: 25000,
                      estado_imputacion: "pendiente",
                      comprobante_tipo: "factura",
                      numero_comprobante: "FAC-002",
                      metodo_pago: null,
                      creado_en: "2026-08-20T10:00:00Z",
                      clientes_finales: { nombre: "Maria Garcia" },
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };

    const resultado = await obtenerDashboardCuentasCorrientes(supabaseMock as never, CLIENTE_ID);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      // Situación de Caja
      expect(resultado.data.situacionCaja.cajaTotalRecuperada).toBe(5000);
      expect(resultado.data.situacionCaja.totalVendidoCredito).toBe(45000);
      expect(resultado.data.situacionCaja.deudaTotalCalle).toBe(40000);
      expect(resultado.data.situacionCaja.porcentajeFiadoCobrado).toBe(11.1);

      // Control Clientes
      expect(resultado.data.controlClientes.totalClientesPadron).toBe(2);
      expect(resultado.data.controlClientes.clientesConDeuda).toBe(2);
      expect(resultado.data.controlClientes.clientesSuperanLimite).toBe(1); // cf-2 (25000 > 10000)
      expect(resultado.data.controlClientes.deudaPromedio).toBe(20000);
      expect(resultado.data.controlClientes.deudaMasAlta).toBe(25000);
      expect(resultado.data.controlClientes.deudaMas30Dias).toBe(15000);

      // Semáforo de Riesgo (150.000 ventas POS * 30% = 45.000 max. 40.000 <= 45.000 -> Saludable)
      expect(resultado.data.semaforoRiesgo.facturacionRealPos30Dias).toBe(150000);
      expect(resultado.data.semaforoRiesgo.montoMaximoRecomendado).toBe(45000);
      expect(resultado.data.semaforoRiesgo.estadoAlertaRiesgo).toBe("precaucion");


      // Top 5 Deudores
      expect(resultado.data.top5Deudores).toHaveLength(2);
      expect(resultado.data.top5Deudores[0].nombre).toBe("Maria Garcia"); // Saldo 25000 es #1

      // Padrón Enriquecido
      expect(resultado.data.padronClientes[0].estadoAlerta).toBe("excedido"); // Maria Garcia superó su límite
      expect(resultado.data.padronClientes[1].estadoAlerta).toBe("al_dia");
    }
  });
});
