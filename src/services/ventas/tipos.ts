export interface EstadoConfirmarVenta {
  error: string | null;
  exito: boolean;
  ventaId: string | null;
}

export const ESTADO_CONFIRMAR_VENTA_INICIAL: EstadoConfirmarVenta = { error: null, exito: false, ventaId: null };
