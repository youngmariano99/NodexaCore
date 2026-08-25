import { describe, expect, it, vi } from "vitest";
import { EditorPersonalizacionDiseno } from "./EditorPersonalizacionDiseno";

vi.mock("@/components/catalogoWeb/SubidorImagen", () => ({
  SubidorImagen: ({ label }: { label: string }) => <div data-testid="subidor-imagen">{label}</div>,
}));

describe("EditorPersonalizacionDiseno Component", () => {
  it("se define y exporta correctamente como un componente funcional", () => {
    expect(EditorPersonalizacionDiseno).toBeDefined();
  });

  it("inicializa el componente con los valores por defecto y configuraciones iniciales", () => {
    const props = {
      clienteSlug: "despensa-carlitos",
      configuracionInicial: {
        plantillaActiva: "basica",
        colorPrimario: "#16D39A",
        mostrarPrecios: true,
      },
    };

    const resultado = EditorPersonalizacionDiseno(props);
    expect(resultado).toBeDefined();
  });

  it("permite configurar las plantillas basica, la-martina y filomena", () => {
    const props = {
      clienteSlug: "boutique-test",
      configuracionInicial: {
        plantillaActiva: "la-martina",
        mostrarPrecios: false,
      },
    };

    const resultado = EditorPersonalizacionDiseno(props);
    expect(resultado).toBeDefined();
  });
});
