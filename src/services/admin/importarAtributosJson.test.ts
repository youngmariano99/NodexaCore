import { describe, expect, it, vi } from "vitest";

import {
  importarAtributosJson,
  normalizarListaAtributos,
  parsearYValidarAtributosJson,
} from "./importarAtributosJson";

describe("importarAtributosJson", () => {
  describe("normalizarListaAtributos", () => {
    it("deduplica nombres repetidos de manera case-insensitive y elimina espacios", () => {
      const entrada = [
        "Coca Cola",
        "coca cola",
        "  COCA COLA  ",
        "Pepsi",
        { nombre: "pepsi" },
        { nombre: "Sprite" },
      ];

      const resultado = normalizarListaAtributos(entrada);
      expect(resultado).toEqual(["Coca Cola", "Pepsi", "Sprite"]);
    });

    it("retorna array vacío ante entradas undefined o vacías", () => {
      expect(normalizarListaAtributos(undefined)).toEqual([]);
      expect(normalizarListaAtributos([])).toEqual([]);
    });
  });

  describe("parsearYValidarAtributosJson", () => {
    it("parsea strings JSON válidos", () => {
      const jsonStr = JSON.stringify({
        marcas: ["Nike", "Adidas"],
        categorias: [{ nombre: "Calzado" }, { nombre: "Ropa" }],
      });

      const res = parsearYValidarAtributosJson(jsonStr);
      expect(res).not.toBeNull();
      expect(res?.marcas).toEqual(["Nike", "Adidas"]);
      expect(res?.categorias).toEqual([{ nombre: "Calzado" }, { nombre: "Ropa" }]);
    });

    it("retorna null si el string no es JSON válido", () => {
      expect(parsearYValidarAtributosJson("{ invalid json }")).toBeNull();
      expect(parsearYValidarAtributosJson("")).toBeNull();
      expect(parsearYValidarAtributosJson(null)).toBeNull();
    });

    it("retorna null si el esquema no cumple la estructura", () => {
      expect(parsearYValidarAtributosJson({ marcas: "No es un array" })).toBeNull();
    });
  });

  describe("importarAtributosJson (bulk insert)", () => {
    it("inserta marcas y categorías con cliente_id correctamente", async () => {
      const insertMarcasMock = vi.fn(async () => ({ error: null }));
      const insertCategoriasMock = vi.fn(async () => ({ error: null }));

      const supabaseMock = {
        from: vi.fn((tabla: string) => {
          if (tabla === "marcas") return { insert: insertMarcasMock };
          if (tabla === "categorias") return { insert: insertCategoriasMock };
          return { insert: vi.fn(async () => ({ error: null })) };
        }),
      };

      const clienteId = "c-cliente-123";
      const json = {
        marcas: ["Nike", "Adidas", "nike"],
        categorias: ["Calzado", "Indumentaria"],
      };

      const resultado = await importarAtributosJson(supabaseMock as never, clienteId, json);

      expect(resultado).toEqual({
        ok: true,
        marcasInsertadas: 2,
        categoriasInsertadas: 2,
      });

      expect(insertMarcasMock).toHaveBeenCalledWith([
        { cliente_id: clienteId, nombre: "Nike" },
        { cliente_id: clienteId, nombre: "Adidas" },
      ]);

      expect(insertCategoriasMock).toHaveBeenCalledWith([
        { cliente_id: clienteId, nombre: "Calzado" },
        { cliente_id: clienteId, nombre: "Indumentaria" },
      ]);
    });

    it("maneja json inválido retornando ok: false sin lanzar excepción (Fail-Safe)", async () => {
      const supabaseMock = { from: vi.fn() };
      const resultado = await importarAtributosJson(
        supabaseMock as never,
        "c-cliente-123",
        "json invalido",
      );

      expect(resultado.ok).toBe(false);
      expect(resultado.marcasInsertadas).toBe(0);
      expect(resultado.categoriasInsertadas).toBe(0);
      expect(supabaseMock.from).not.toHaveBeenCalled();
    });
  });
});
