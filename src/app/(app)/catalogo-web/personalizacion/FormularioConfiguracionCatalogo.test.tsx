import { describe, expect, it } from "vitest";
import { FormularioConfiguracionCatalogo } from "./FormularioConfiguracionCatalogo";
import { verificarHorarioAtencion } from "@/lib/dominio/catalogoWeb/verificarHorarioAtencion";

describe("FormularioConfiguracionCatalogo & verificarHorarioAtencion", () => {
  it("evalúa si el comercio está abierto dentro del horario configurado", () => {
    // 14:00 hs se encuentra dentro del rango 09:00 - 21:00
    const fechaTarde = new Date("2026-08-25T14:00:00");
    const resultadoAbierto = verificarHorarioAtencion("09:00", "21:00", true, fechaTarde);
    expect(resultadoAbierto.estaAbierto).toBe(true);

    // 23:00 hs se encuentra fuera del rango 09:00 - 21:00
    const fechaNoche = new Date("2026-08-25T23:00:00");
    const resultadoCerrado = verificarHorarioAtencion("09:00", "21:00", true, fechaNoche);
    expect(resultadoCerrado.estaAbierto).toBe(false);
    expect(resultadoCerrado.mensajeApertura).toContain("Local actualmente cerrado");
  });

  it("renderiza correctamente el componente FormularioConfiguracionCatalogo", () => {
    expect(FormularioConfiguracionCatalogo).toBeDefined();
    const resultado = FormularioConfiguracionCatalogo({});
    expect(resultado).toBeDefined();
  });
});
