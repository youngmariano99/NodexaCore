import { describe, expect, it } from "vitest";

import { construirNotificacionEstadoPago } from "./construirNotificacionEstadoPago";

describe("construirNotificacionEstadoPago", () => {
  it("arma el mensaje de suspensión cuando nuevoEstadoPago es false", () => {
    const resultado = construirNotificacionEstadoPago("Ferretería El Tornillo", "+5492920000002", false);

    expect(resultado.mensaje).toContain("suspendida por falta de pago");
    expect(resultado.mensaje).toContain("Ferretería El Tornillo");
  });

  it("arma el mensaje de reactivación cuando nuevoEstadoPago es true", () => {
    const resultado = construirNotificacionEstadoPago("Ferretería El Tornillo", "+5492920000002", true);

    expect(resultado.mensaje).toContain("reactivada");
    expect(resultado.mensaje).not.toContain("suspendida");
  });

  it("arma un enlace wa.me con el teléfono y el mensaje codificados", () => {
    const resultado = construirNotificacionEstadoPago("Bazar Casa Sur", "+5492920000003", false);

    expect(resultado.enlaceWhatsapp).toBe(
      `https://wa.me/+5492920000003?text=${encodeURIComponent(resultado.mensaje)}`,
    );
  });
});
