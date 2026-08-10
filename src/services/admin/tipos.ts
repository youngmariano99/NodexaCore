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
