import { describe, expect, it, vi } from "vitest";
import { SelectorPlantillas } from "./SelectorPlantillas";

vi.mock("./basica/PlantillaBasica", () => ({
  default: () => <div data-testid="plantilla-basica">Plantilla Básica Renderizada</div>,
}));

vi.mock("./la-martina/PlantillaLaMartina", () => ({
  default: () => <div data-testid="plantilla-la-martina">Plantilla La Martina Renderizada</div>,
}));

vi.mock("./filomena/PlantillaFilomena", () => ({
  default: () => <div data-testid="plantilla-filomena">Plantilla Filomena Renderizada</div>,
}));

const MOCK_CLIENTE = {
  cliente_id: "cli-123",
  nombre_comercio: "Comercio Test",
  logo_url: null,
  color_primario: "#16D39A",
  telefono_whatsapp: "5491112345678",
};

const MOCK_PRODUCTOS = [
  {
    producto_id: "prod-1",
    nombre: "Producto 1",
    precio: 1500,
    imagen_url: null,
    categoria: "General",
  },
];

describe("SelectorPlantillas Component", () => {
  it("renderiza correctamente la Plantilla Básica por defecto cuando no se especifica plantillaActiva", () => {
    const props = {
      cliente: MOCK_CLIENTE,
      productos: MOCK_PRODUCTOS,
    };

    expect(SelectorPlantillas).toBeDefined();
  });

  it("selecciona y retorna el componente dinámico correspondiente según la propiedad plantillaActiva", () => {
    const propsBasica = {
      cliente: MOCK_CLIENTE,
      productos: MOCK_PRODUCTOS,
      plantillaActiva: "basica",
    };

    const propsMartina = {
      cliente: MOCK_CLIENTE,
      productos: MOCK_PRODUCTOS,
      plantillaActiva: "la-martina",
    };

    const propsFilomena = {
      cliente: MOCK_CLIENTE,
      productos: MOCK_PRODUCTOS,
      plantillaActiva: "filomena",
    };

    expect(SelectorPlantillas(propsBasica)).toBeDefined();
    expect(SelectorPlantillas(propsMartina)).toBeDefined();
    expect(SelectorPlantillas(propsFilomena)).toBeDefined();
  });

  it("cae de forma segura a Plantilla Básica si la plantillaActiva no es reconocida", () => {
    const propsInexistente = {
      cliente: MOCK_CLIENTE,
      productos: MOCK_PRODUCTOS,
      plantillaActiva: "plantilla-desconocida",
    };

    expect(SelectorPlantillas(propsInexistente)).toBeDefined();
  });
});
