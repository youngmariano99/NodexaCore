-- ============================================================
-- MIGRACIÓN: Ampliar ajustes de riesgo en cuentas corrientes
-- Permite configurar el modo de estimación de facturación (automático vs manual)
-- y el porcentaje del tope de deuda tolerable por tenant.
-- ============================================================

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS modo_facturacion_estimada text DEFAULT 'automatico',
  ADD COLUMN IF NOT EXISTS facturacion_manual_monto numeric(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tope_deuda_tolerable_pct numeric(5,2) DEFAULT 30.00;

COMMENT ON COLUMN clientes.modo_facturacion_estimada IS 'Modo de facturación para el semáforo de riesgo: automatico (POS) o manual';
COMMENT ON COLUMN clientes.facturacion_manual_monto IS 'Monto de facturación mensual estimado ingresado manualmente por el usuario';
COMMENT ON COLUMN clientes.tope_deuda_tolerable_pct IS 'Porcentaje de facturación tolerable en deuda fiada (ej: 30.00%)';
