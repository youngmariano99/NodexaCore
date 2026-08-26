import { describe, expect, it, vi } from "vitest";

import * as repo from "@/repositories/deliverysRepository";
import { crearRepartidor } from "./crearRepartidor";

describe("Servicio crearRepartidor (Plan Premium Deliverys)", () => {
  it("retorna NX-SYS-006 si falta algún campo obligatorio", async () => {
    const mockSupabase = {} as unknown as Parameters<typeof crearRepartidor>[0];
    const resultado = await crearRepartidor(mockSupabase, "tenant-1", {
      nombre: "",
      telefono: "11223344",
      pin_acceso: "1234",
    });

    expect(resultado.exito).toBe(false);
    expect(resultado.error).toBe("NX-SYS-006");
  });

  it("retorna NX-DELIV-001 si el comercio ya tiene 2 repartidores activos", async () => {
    vi.spyOn(repo, "contarRepartidoresActivos").mockResolvedValueOnce(2);

    const mockSupabase = {} as unknown as Parameters<typeof crearRepartidor>[0];
    const resultado = await crearRepartidor(mockSupabase, "tenant-1", {
      nombre: "Carlos Repartidor",
      telefono: "1199887766",
      pin_acceso: "4321",
    });

    expect(resultado.exito).toBe(false);
    expect(resultado.error).toBe("NX-DELIV-001");
  });

  it("crea exitosamente el repartidor si la cuenta tiene menos de 2 activos", async () => {
    vi.spyOn(repo, "contarRepartidoresActivos").mockResolvedValueOnce(1);
    vi.spyOn(repo, "crearRepartidor").mockResolvedValueOnce({
      repartidor_id: "rep-123",
      cliente_id: "tenant-1",
      nombre: "Marcos Delivery",
      telefono: "1122334455",
      pin_acceso: "1234",
      activo: true,
      creado_en: new Date().toISOString(),
    });

    const mockSupabase = {} as unknown as Parameters<typeof crearRepartidor>[0];
    const resultado = await crearRepartidor(mockSupabase, "tenant-1", {
      nombre: "Marcos Delivery",
      telefono: "1122334455",
      pin_acceso: "1234",
    });

    expect(resultado.exito).toBe(true);
    expect(resultado.repartidor?.repartidor_id).toBe("rep-123");
  });
});
