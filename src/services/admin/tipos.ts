export interface EstadoCrearCliente {
  error: string | null;
  exito: boolean;
  clienteId?: string | null;
}

export const ESTADO_CREAR_CLIENTE_INICIAL: EstadoCrearCliente = { error: null, exito: false, clienteId: null };

/** Espejo del ENUM modulo_nodexa (docs/SCHEMA.md Â§1). */
export type ModuloNodexa = "catalogo_web" | "carga_ia" | "fiados" | "devoluciones" | "bot_whatsapp" | "produccion_gastronomica";

export const MODULOS_NODEXA: readonly ModuloNodexa[] = [
  "catalogo_web",
  "carga_ia",
  "fiados",
  "devoluciones",
  "bot_whatsapp",
  "produccion_gastronomica",
];

/** Modalidades operativas del CatÃ¡logo Web (docs/SCHEMA.md Â§20 y configuracion_plantilla). */
export type ModalidadCatalogo = "vidriera" | "pedidos_whatsapp" | "comandas_realtime";

export const MODALIDADES_CATALOGO: readonly ModalidadCatalogo[] = [
  "vidriera",
  "pedidos_whatsapp",
  "comandas_realtime",
];

/** Etiqueta en espaÃ±ol para mostrar en UI (docs/DESIGN.md: cero tecnicismos crudos). */
export const NOMBRE_MODULO_NODEXA: Record<ModuloNodexa, string> = {
  catalogo_web: "CatÃ¡logo Web",
  carga_ia: "Carga con IA",
  fiados: "Fiados",
  devoluciones: "Devoluciones",
  bot_whatsapp: "Bot de WhatsApp",
  produccion_gastronomica: "Producción Gastronómica",

};


