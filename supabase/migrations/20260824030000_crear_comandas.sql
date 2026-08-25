-- Migration: Tablero de Comandas, Pedidos Web y Suscripción Realtime por Tenant
-- Archivo: supabase/migrations/20260824030000_crear_comandas.sql
-- Módulo: Caja / Ventas / Catálogo Web

-- 1. Crear tipo enumerado para los estados del pedido web en el Kanban
DO $$ BEGIN
  CREATE TYPE estado_pedido_web AS ENUM (
    'pendiente',
    'en_preparacion',
    'despachado',
    'completado',
    'cancelado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Crear tabla principal de pedidos_web con soporte para método de pago y datos de cliente en JSONB
CREATE TABLE IF NOT EXISTS pedidos_web (
  pedido_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(cliente_id) ON DELETE CASCADE,
  datos_cliente JSONB NOT NULL DEFAULT '{}'::jsonb,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  opcion_entrega TEXT NOT NULL DEFAULT 'envio' CHECK (opcion_entrega IN ('envio', 'retiro')),
  estado estado_pedido_web NOT NULL DEFAULT 'pendiente',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  costo_envio NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (costo_envio >= 0),
  monto_ajuste NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
  repartidor_id UUID NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexación por cliente_id y creado_en para consultas en tiempo real rápidas
CREATE INDEX IF NOT EXISTS idx_pedidos_web_cliente_estado ON pedidos_web(cliente_id, estado, creado_en DESC);

-- 3. Crear tabla de items del pedido (productos y variantes)
CREATE TABLE IF NOT EXISTS pedido_items (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos_web(pedido_id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(producto_id) ON DELETE CASCADE,
  variante_id UUID NULL,
  nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);

-- 4. Trigger de validación de estructura JSONB datos_cliente
CREATE OR REPLACE FUNCTION fn_validar_pedido_web()
RETURNS TRIGGER AS $$
BEGIN
  IF jsonb_typeof(NEW.datos_cliente) <> 'object' THEN
    RAISE EXCEPTION 'NX-SYS-006: Los datos del cliente deben ser un objeto JSON válido.'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.metodo_pago IS NULL OR TRIM(NEW.metodo_pago) = '' THEN
    RAISE EXCEPTION 'NX-SYS-006: El método de pago es obligatorio.'
      USING ERRCODE = '22023';
  END IF;

  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_pedido_web ON pedidos_web;

CREATE TRIGGER trg_validar_pedido_web
  BEFORE INSERT OR UPDATE ON pedidos_web
  FOR EACH ROW
  EXECUTE FUNCTION fn_validar_pedido_web();

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE pedidos_web ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

-- Política de inserción pública desde el catálogo web
DROP POLICY IF EXISTS "Insertar pedidos desde catálogo público" ON pedidos_web;
CREATE POLICY "Insertar pedidos desde catálogo público"
  ON pedidos_web FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Insertar items de pedido público" ON pedido_items;
CREATE POLICY "Insertar items de pedido público"
  ON pedido_items FOR INSERT
  WITH CHECK (TRUE);

-- Política de lectura y gestión exclusiva del comerciante por tenant
DROP POLICY IF EXISTS "Comerciante gestiona sus pedidos web tenant" ON pedidos_web;
CREATE POLICY "Comerciante gestiona sus pedidos web tenant"
  ON pedidos_web FOR ALL
  USING (
    cliente_id = (auth.jwt() -> 'app_metadata' ->> 'cliente_id')::uuid
  );

DROP POLICY IF EXISTS "Comerciante lee sus items de pedido tenant" ON pedido_items;
CREATE POLICY "Comerciante lee sus items de pedido tenant"
  ON pedido_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedidos_web p
      WHERE p.pedido_id = pedido_items.pedido_id
        AND p.cliente_id = (auth.jwt() -> 'app_metadata' ->> 'cliente_id')::uuid
    )
  );

-- 6. Configurar publicación de Supabase Realtime para la tabla pedidos_web
ALTER TABLE pedidos_web REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pedidos_web;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE pedidos_web IS 'Tabla de comandas y pedidos generados desde el catálogo web público para gestión en tiempo real en el Kanban';
COMMENT ON COLUMN pedidos_web.metodo_pago IS 'Método de pago seleccionado por el cliente (ej: efectivo, transferencia, tarjeta)';
COMMENT ON TABLE pedido_items IS 'Desglose de productos y variantes asociados a cada pedido web';
