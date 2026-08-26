import { describe, expect, it, vi } from "vitest";
import { TableroComandasKanban, type PedidoKanban } from "./TableroComandasKanban";

const PEDIDOS_MOCK: PedidoKanban[] = [
  {
    pedidoId: "p1-uuid-1234",
    clienteId: "c1-uuid",
    datosCliente: {
      nombre: "María López",
      telefono: "1199998888",
      direccion: "Av. Cabildo 2000",
    },
    metodoPago: "efectivo",
    opcionEntrega: "envio",
    estado: "pendiente",
    subtotal: 5000,
    costoEnvio: 500,
    montoAjuste: -500,
    total: 5000,
    creadoEn: new Date().toISOString(),
    items: [
      { itemId: "item-1", nombre: "Pizza Muzzarella", cantidad: 1, precioUnitario: 5000 },
    ],
  },
];

describe("TableroComandasKanban Component", () => {
  it("se define y exporta correctamente como componente funcional", () => {
    expect(TableroComandasKanban).toBeDefined();
  });

  it("renderiza el tablero Kanban con los pedidos mock asignados", () => {
    const fnCambiarEstado = vi.fn();
    const resultado = TableroComandasKanban({
      pedidosIniciales: PEDIDOS_MOCK,
      nombreComercio: "Pizzería Don Juan",
      onCambiarEstadoPedido: fnCambiarEstado,
    });
    expect(resultado).toBeDefined();
  });
});
