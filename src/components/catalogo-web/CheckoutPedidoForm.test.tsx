import { describe, expect, it, vi } from "vitest";
import { CheckoutPedidoForm } from "./CheckoutPedidoForm";
import { usePersistedForm } from "@/hooks/usePersistedForm";

describe("usePersistedForm Hook & CheckoutPedidoForm", () => {
  it("exporta usePersistedForm correctamente", () => {
    expect(usePersistedForm).toBeDefined();
    expect(typeof usePersistedForm).toBe("function");
  });

  it("define y exporta el componente CheckoutPedidoForm", () => {
    expect(CheckoutPedidoForm).toBeDefined();
  });

  it("renderiza el formulario con la función de confirmación", () => {
    const onConfirmar = vi.fn();
    const resultado = CheckoutPedidoForm({ onConfirmarPedido: onConfirmar });
    expect(resultado).toBeDefined();
  });
});
