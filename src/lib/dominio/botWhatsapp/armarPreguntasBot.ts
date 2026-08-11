export type ClavePreguntaBot = "horarios" | "ubicacion" | "catalogo";

export interface PreguntaBot {
  clave: ClavePreguntaBot;
  etiqueta: string;
  respuesta: string;
}

export interface MensajesConfiguracionBot {
  mensaje_horarios: string | null;
  mensaje_ubicacion: string | null;
  mensaje_catalogo: string | null;
}

const ETIQUETA_POR_CLAVE: Record<ClavePreguntaBot, string> = {
  horarios: "¿Cuáles son sus horarios de atención?",
  ubicacion: "¿Dónde están ubicados?",
  catalogo: "¿Tienen catálogo completo?",
};

/**
 * Arma la lista de preguntas predefinidas visibles en el FAQ de la vidriera
 * (Módulo Bot de WhatsApp): cada pregunta solo aparece si el comerciante
 * cargó el mensaje correspondiente en configuracion_bot_whatsapp — un
 * mensaje null/vacío no genera una pregunta con respuesta vacía.
 */
export function armarPreguntasBot(mensajes: MensajesConfiguracionBot): PreguntaBot[] {
  const preguntas: PreguntaBot[] = [];

  if (mensajes.mensaje_horarios) {
    preguntas.push({ clave: "horarios", etiqueta: ETIQUETA_POR_CLAVE.horarios, respuesta: mensajes.mensaje_horarios });
  }

  if (mensajes.mensaje_ubicacion) {
    preguntas.push({ clave: "ubicacion", etiqueta: ETIQUETA_POR_CLAVE.ubicacion, respuesta: mensajes.mensaje_ubicacion });
  }

  if (mensajes.mensaje_catalogo) {
    preguntas.push({ clave: "catalogo", etiqueta: ETIQUETA_POR_CLAVE.catalogo, respuesta: mensajes.mensaje_catalogo });
  }

  return preguntas;
}
