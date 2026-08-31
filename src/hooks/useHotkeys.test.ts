import { describe, it, expect } from "vitest";
import {
  useHotkeys,
  coincideEventoConCombinacion,
  parsearCombinacion,
  esElementoInput,
  normalizarTecla,
} from "./useHotkeys";

describe("useHotkeys and helper functions", () => {
  it("se define correctamente como función", () => {
    expect(useHotkeys).toBeDefined();
    expect(typeof useHotkeys).toBe("function");
  });

  it("normaliza nombres de teclas", () => {
    expect(normalizarTecla("Esc")).toBe("escape");
    expect(normalizarTecla("Escape")).toBe("escape");
    expect(normalizarTecla("Return")).toBe("enter");
    expect(normalizarTecla("Enter")).toBe("enter");
    expect(normalizarTecla("F2")).toBe("f2");
  });

  it("parsea combinaciones de teclas correctamente", () => {
    expect(parsearCombinacion("ctrl+k")).toEqual({
      ctrl: true,
      shift: false,
      alt: false,
      meta: false,
      key: "k",
    });

    expect(parsearCombinacion("Escape")).toEqual({
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      key: "escape",
    });

    expect(parsearCombinacion("Enter")).toEqual({
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      key: "enter",
    });

    expect(parsearCombinacion("F2")).toEqual({
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      key: "f2",
    });
  });

  it("coincide evento con combinación", () => {
    expect(coincideEventoConCombinacion({ key: "Enter" }, "Enter")).toBe(true);
    expect(coincideEventoConCombinacion({ key: "Enter" }, "Escape")).toBe(false);
    expect(coincideEventoConCombinacion({ key: "F2" }, "F2")).toBe(true);
    expect(coincideEventoConCombinacion({ key: "k", ctrlKey: true }, "ctrl+k")).toBe(true);
    expect(coincideEventoConCombinacion({ key: "k", ctrlKey: false }, "ctrl+k")).toBe(false);
  });

  it("detecta elementos input correctamente", () => {
    expect(esElementoInput({ tagName: "INPUT" })).toBe(true);
    expect(esElementoInput({ tagName: "TEXTAREA" })).toBe(true);
    expect(esElementoInput({ tagName: "SELECT" })).toBe(true);
    expect(esElementoInput({ isContentEditable: true })).toBe(true);
    expect(esElementoInput({ tagName: "DIV" })).toBe(false);
    expect(esElementoInput(null)).toBe(false);
  });
});
