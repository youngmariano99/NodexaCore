import { describe, expect, it } from "vitest";

import { armarPreguntasBot } from "./armarPreguntasBot";

describe("armarPreguntasBot", () => {
  it("arma las 3 preguntas cuando los 3 mensajes están configurados", () => {
    const preguntas = armarPreguntasBot({
      mensaje_horarios: "Lunes a sábado de 8 a 20 hs.",
      mensaje_ubicacion: "Belgrano 120",
      mensaje_catalogo: "Mirá todo acá: https://bazarcasasur.com.ar",
    });

    expect(preguntas.map((p) => p.clave)).toEqual(["horarios", "ubicacion", "catalogo"]);
  });

  it("omite una pregunta cuando su mensaje es null", () => {
    const preguntas = armarPreguntasBot({
      mensaje_horarios: "Lunes a sábado de 8 a 20 hs.",
      mensaje_ubicacion: null,
      mensaje_catalogo: "Mirá todo acá: https://bazarcasasur.com.ar",
    });

    expect(preguntas.map((p) => p.clave)).toEqual(["horarios", "catalogo"]);
  });

  it("omite una pregunta cuando su mensaje es una cadena vacía", () => {
    const preguntas = armarPreguntasBot({
      mensaje_horarios: "",
      mensaje_ubicacion: "Belgrano 120",
      mensaje_catalogo: null,
    });

    expect(preguntas.map((p) => p.clave)).toEqual(["ubicacion"]);
  });

  it("retorna un arreglo vacío sin ningún mensaje configurado", () => {
    const preguntas = armarPreguntasBot({ mensaje_horarios: null, mensaje_ubicacion: null, mensaje_catalogo: null });

    expect(preguntas).toEqual([]);
  });

  it("conserva la respuesta exacta cargada por el comerciante, sin transformarla", () => {
    const preguntas = armarPreguntasBot({
      mensaje_horarios: "  Lunes a sábado de 8 a 20 hs.  ",
      mensaje_ubicacion: null,
      mensaje_catalogo: null,
    });

    expect(preguntas[0]?.respuesta).toBe("  Lunes a sábado de 8 a 20 hs.  ");
  });
});
