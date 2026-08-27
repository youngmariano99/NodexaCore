-- Migration: Cuentas Corrientes Contables, Imputación M:N e Inalterabilidad Append-Only
-- Archivo: supabase/migrations/20260824050000_ampliar_cuentas_corrientes.sql
-- Módulo: Clientes y Cuentas Corrientes (fiados)

-- 1. Ampliar tabla clientes_finales con límite de crédito, cuit/cuil, email y estado
ALTER TABLE clientes_finales
  ADD COLUMN IF NOT EXISTS limite_credito NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (limite_credito >= 0),
  ADD COLUMN IF NOT EXISTS cuit_cuil VARCHAR(11) NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido'));

-- 2. Crear tabla cuentas_corrientes (Cabecera de cuenta corriente por cliente final)
CREATE TABLE IF NOT EXISTS cuentas_corrientes (
  cuenta_corriente_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(cliente_id) ON DELETE CASCADE,
  cliente_final_id UUID NOT NULL REFERENCES clientes_finales(cliente_final_id) ON DELETE RESTRICT,
  fecha_apertura DATE NOT NULL DEFAULT CURRENT_DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cuentas_corrientes_cliente_final ON cuentas_corrientes(cliente_id, cliente_final_id);

-- 3. Actualizar columnas de movimientos_cuenta_corriente para soporte contable e imputación
ALTER TABLE movimientos_cuenta_corriente
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(cliente_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS cuenta_corriente_id UUID REFERENCES cuentas_corrientes(cuenta_corriente_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS monto_pendiente NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (monto_pendiente >= 0),
  ADD COLUMN IF NOT EXISTS estado_imputacion VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado_imputacion IN ('pendiente', 'parcial', 'total')),
  ADD COLUMN IF NOT EXISTS comprobante_tipo VARCHAR(50) NOT NULL DEFAULT 'factura',
  ADD COLUMN IF NOT EXISTS numero_comprobante VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS saldo_historico_resultante NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT NULL;

-- 4. Crear tabla imputaciones_comprobantes (Relación M:N entre Cobros/Créditos y Débitos/Facturas)
CREATE TABLE IF NOT EXISTS imputaciones_comprobantes (
  imputacion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(cliente_id) ON DELETE CASCADE,
  movimiento_credito_id UUID NOT NULL REFERENCES movimientos_cuenta_corriente(movimiento_cc_id) ON DELETE RESTRICT,
  movimiento_debito_id UUID NOT NULL REFERENCES movimientos_cuenta_corriente(movimiento_cc_id) ON DELETE RESTRICT,
  monto_imputado NUMERIC(12,2) NOT NULL CHECK (monto_imputado > 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imputaciones_credito ON imputaciones_comprobantes(cliente_id, movimiento_credito_id);
CREATE INDEX IF NOT EXISTS idx_imputaciones_debito ON imputaciones_comprobantes(cliente_id, movimiento_debito_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_cc_fifo ON movimientos_cuenta_corriente(cliente_id, cliente_final_id, tipo, estado_imputacion, creado_en ASC);

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE cuentas_corrientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE imputaciones_comprobantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comerciante gestiona sus cuentas corrientes" ON cuentas_corrientes;
CREATE POLICY "Comerciante gestiona sus cuentas corrientes"
  ON cuentas_corrientes FOR ALL
  USING (cliente_id = (auth.jwt() -> 'app_metadata' ->> 'cliente_id')::uuid);

DROP POLICY IF EXISTS "Comerciante gestiona sus imputaciones" ON imputaciones_comprobantes;
CREATE POLICY "Comerciante gestiona sus imputaciones"
  ON imputaciones_comprobantes FOR ALL
  USING (cliente_id = (auth.jwt() -> 'app_metadata' ->> 'cliente_id')::uuid);

COMMENT ON TABLE cuentas_corrientes IS 'Cabeceras de cuentas corrientes por cliente final';
COMMENT ON TABLE imputaciones_comprobantes IS 'Enlace de imputación contable M:N entre cobros/créditos y facturas/débitos';
