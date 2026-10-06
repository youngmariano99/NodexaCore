-- ============================================================
-- modulo_gastronomia_y_rpc.sql
-- ============================================================

CREATE TYPE tipo_producto_enum AS ENUM ('estandar', 'fabricado', 'insumo');

ALTER TABLE productos ADD COLUMN tipo_producto tipo_producto_enum NOT NULL DEFAULT 'estandar';

CREATE TABLE costos_indirectos (
  costo_indirecto_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(cliente_id),
  nombre text NOT NULL,
  tipo_calculo text NOT NULL CHECK (tipo_calculo IN ('porcentaje', 'fijo')),
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  eliminado_en timestamptz
);
ALTER TABLE costos_indirectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY costos_indirectos_tenant ON costos_indirectos FOR ALL USING (cliente_id = auth_cliente_id()) WITH CHECK (cliente_id = auth_cliente_id());

CREATE TABLE recetas (
  receta_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(cliente_id),
  producto_id uuid NOT NULL REFERENCES productos(producto_id) UNIQUE,
  rendimiento_lote numeric(12,2) NOT NULL DEFAULT 1 CHECK (rendimiento_lote > 0),
  estado_costeo text NOT NULL DEFAULT 'actualizado' CHECK (estado_costeo IN ('actualizado', 'desactualizado')),
  eliminado_en timestamptz
);
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY recetas_tenant ON recetas FOR ALL USING (cliente_id = auth_cliente_id()) WITH CHECK (cliente_id = auth_cliente_id());

CREATE TABLE receta_insumos (
  receta_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id uuid NOT NULL REFERENCES recetas(receta_id) ON DELETE CASCADE,
  insumo_producto_id uuid NOT NULL REFERENCES productos(producto_id),
  cantidad_utilizada numeric(12,4) NOT NULL CHECK (cantidad_utilizada > 0)
);
-- No se aplica RLS directo aca, se asume acceso via funcion RPC de seguridad invoker, o se puede habilitar si se lee del cliente.
ALTER TABLE receta_insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY receta_insumos_tenant ON receta_insumos FOR ALL USING (
  EXISTS (SELECT 1 FROM recetas r WHERE r.receta_id = receta_insumos.receta_id AND r.cliente_id = auth_cliente_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM recetas r WHERE r.receta_id = receta_insumos.receta_id AND r.cliente_id = auth_cliente_id())
);


CREATE TYPE movimiento_stock_batch_type AS (
  producto_id uuid,
  tipo tipo_movimiento_stock,
  cantidad integer
);

-- RPC for atomic batch updates of stock
CREATE OR REPLACE FUNCTION fn_registrar_produccion_batch(
  p_movimientos jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_usuario_id uuid;
  v_mov jsonb;
  v_prod_id uuid;
  v_tipo tipo_movimiento_stock;
  v_cantidad integer;
  v_delta integer;
  v_nuevo_stock integer;
BEGIN
  v_cliente_id := auth_cliente_id();

  SELECT usuario_id INTO v_usuario_id
  FROM usuarios
  WHERE auth_user_id = auth.uid()
    AND eliminado_en IS NULL;

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro el usuario solicitante.' USING ERRCODE = 'P0001';
  END IF;

  FOR v_mov IN SELECT * FROM jsonb_array_elements(p_movimientos)
  LOOP
    v_prod_id := (v_mov->>'producto_id')::uuid;
    v_tipo := (v_mov->>'tipo')::tipo_movimiento_stock;
    v_cantidad := (v_mov->>'cantidad')::integer;

    IF v_cantidad <= 0 THEN
      RAISE EXCEPTION 'La cantidad debe ser mayor a cero.' USING ERRCODE = 'P0001';
    END IF;

    v_delta := CASE WHEN v_tipo = 'entrada' THEN v_cantidad ELSE -v_cantidad END;

    UPDATE productos
    SET stock_actual = stock_actual + v_delta,
        actualizado_en = now()
    WHERE producto_id = v_prod_id
      AND cliente_id = v_cliente_id
      AND eliminado_en IS NULL
      AND stock_actual + v_delta >= 0
    RETURNING stock_actual INTO v_nuevo_stock;

    IF NOT FOUND THEN
      IF EXISTS (
        SELECT 1 FROM productos
        WHERE producto_id = v_prod_id
          AND cliente_id = v_cliente_id
          AND eliminado_en IS NULL
      ) THEN
        RAISE EXCEPTION 'No podes dejar stock en negativo para el insumo %', v_prod_id USING ERRCODE = 'NX004';
      ELSE
        RAISE EXCEPTION 'Producto no encontrado o no pertenece a este comercio.' USING ERRCODE = 'P0002';
      END IF;
    END IF;

    INSERT INTO movimientos_stock (cliente_id, producto_id, usuario_id, tipo, cantidad, saldo_resultante)
    VALUES (v_cliente_id, v_prod_id, v_usuario_id, v_tipo, v_cantidad, v_nuevo_stock);
  END LOOP;
END;
$$;
-- ============================================================
-- configuracion_costos y receta_costos_indirectos
-- ============================================================

CREATE TABLE configuracion_costos (
  cliente_id uuid PRIMARY KEY REFERENCES clientes(cliente_id),
  margen_ganancia_meta numeric(5,2)
);
ALTER TABLE configuracion_costos ENABLE ROW LEVEL SECURITY;
CREATE POLICY configuracion_costos_tenant ON configuracion_costos FOR ALL USING (cliente_id = auth_cliente_id()) WITH CHECK (cliente_id = auth_cliente_id());

CREATE TABLE receta_costos_indirectos (
  receta_id uuid NOT NULL REFERENCES recetas(receta_id) ON DELETE CASCADE,
  costo_indirecto_id uuid NOT NULL REFERENCES costos_indirectos(costo_indirecto_id),
  PRIMARY KEY (receta_id, costo_indirecto_id)
);
-- Aplicar RLS indirectamente via la tabla recetas
ALTER TABLE receta_costos_indirectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY receta_costos_indirectos_tenant ON receta_costos_indirectos FOR ALL USING (
  EXISTS (SELECT 1 FROM recetas r WHERE r.receta_id = receta_costos_indirectos.receta_id AND r.cliente_id = auth_cliente_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM recetas r WHERE r.receta_id = receta_costos_indirectos.receta_id AND r.cliente_id = auth_cliente_id())
);

