export interface EstadoCrearCliente {
  error: string | null;
  exito: boolean;
}

export const ESTADO_CREAR_CLIENTE_INICIAL: EstadoCrearCliente = { error: null, exito: false };

/** Espejo del ENUM modulo_nodexa (docs/SCHEMA.md §1). */
export type ModuloNodexa = "catalogo_web" | "carga_ia" | "fiados" | "devoluciones" | "bot_whatsapp";

export const MODULOS_NODEXA: readonly ModuloNodexa[] = [
  "catalogo_web",
  "carga_ia",
  "fiados",
  "devoluciones",
  "bot_whatsapp",
];

/** Etiqueta en español para mostrar en UI (docs/DESIGN.md: cero tecnicismos crudos). */
export const NOMBRE_MODULO_NODEXA: Record<ModuloNodexa, string> = {
  catalogo_web: "Catálogo Web",
  carga_ia: "Carga con IA",
  fiados: "Fiados",
  devoluciones: "Devoluciones",
  bot_whatsapp: "Bot de WhatsApp",
};
