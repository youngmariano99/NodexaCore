-- Migration: Costos y Códigos de Barras en Catálogo e Inventario
-- Archivo: supabase/migrations/20260831040000_migracion_costos_inventario.sql
-- Módulo: Inventario / Catálogo

-- 1. Añadir costo_promedio, ultimo_costo y codigo_barras a productos
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS costo_promedio numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (costo_promedio >= 0),
  ADD COLUMN IF NOT EXISTS ultimo_costo numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (ultimo_costo >= 0),
  ADD COLUMN IF NOT EXISTS codigo_barras text NULL;

CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras 
  ON productos(cliente_id, codigo_barras) 
  WHERE codigo_barras IS NOT NULL AND eliminado_en IS NULL;

-- 2. Añadir costo_unitario a movimientos_stock
ALTER TABLE movimientos_stock
  ADD COLUMN IF NOT EXISTS costo_unitario numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (costo_unitario >= 0);
