-- Migration: Cuentas de Delivery, Repartidores y Asignación de Hojas de Reparto
-- Archivo: supabase/migrations/20260824040000_crear_repartidores.sql
-- Módulo: Ventas / Deliverys

-- 1. Crear tabla repartidores asociada al cliente/tenant
CREATE TABLE IF NOT EXISTS repartidores (
  repartidor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(cliente_id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  pin_acceso TEXT NOT NULL DEFAULT '1234',
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eliminado_en TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_repartidores_cliente_id ON repartidores(cliente_id) WHERE eliminado_en IS NULL;

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE repartidores ENABLE ROW LEVEL SECURITY;

-- Política de lectura y gestión para comerciantes autenticados
DROP POLICY IF EXISTS "Comerciante gestiona sus repartidores" ON repartidores;
CREATE POLICY "Comerciante gestiona sus repartidores"
  ON repartidores FOR ALL
  USING (
    cliente_id = (auth.jwt() -> 'app_metadata' ->> 'cliente_id')::uuid
  );

-- Política de lectura pública restringida para el PIN de acceso del repartidor en su vista móvil
DROP POLICY IF EXISTS "Lectura publica repartidores para vista movil" ON repartidores;
CREATE POLICY "Lectura publica repartidores para vista movil"
  ON repartidores FOR SELECT
  USING (
    activo = true AND eliminado_en IS NULL
  );

COMMENT ON TABLE repartidores IS 'Cuentas de repartidores asociadas a cada comercio (máximo 2 activos per tenant)';
