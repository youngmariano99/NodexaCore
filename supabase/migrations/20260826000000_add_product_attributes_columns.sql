-- Migración: Agregar llaves foráneas para categorías, marcas y proveedores en la tabla productos
ALTER TABLE productos
  ADD COLUMN categoria_id UUID REFERENCES categorias(categoria_id) ON DELETE SET NULL,
  ADD COLUMN marca_id UUID REFERENCES marcas(marca_id) ON DELETE SET NULL,
  ADD COLUMN proveedor_id UUID; -- Se deja sin FK porque la tabla proveedores aún no está creada en este sprint

-- Índices para optimizar filtros
CREATE INDEX idx_productos_categoria_id ON productos(categoria_id);
CREATE INDEX idx_productos_marca_id ON productos(marca_id);
CREATE INDEX idx_productos_proveedor_id ON productos(proveedor_id);

-- Función de base de datos para la actualización atómica y auditoría masiva de precios
CREATE OR REPLACE FUNCTION fn_actualizar_precios_lote(
  p_cliente_id UUID,
  p_usuario_id UUID,
  p_tipo_filtro TEXT,
  p_filtro_id UUID,
  p_tipo_ajuste TEXT,
  p_valor NUMERIC
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
  v_nuevo_precio NUMERIC;
BEGIN
  -- Iteramos por los productos que matchean el filtro
  FOR r IN
    SELECT producto_id, nombre, precio
    FROM productos
    WHERE cliente_id = p_cliente_id
      AND eliminado_en IS NULL
      AND (
        p_tipo_filtro = 'todos' OR
        (p_tipo_filtro = 'categoria_id' AND categoria_id = p_filtro_id) OR
        (p_tipo_filtro = 'marca_id' AND marca_id = p_filtro_id) OR
        (p_tipo_filtro = 'proveedor_id' AND proveedor_id = p_filtro_id)
      )
  LOOP
    -- Calculamos nuevo precio
    IF p_tipo_ajuste = 'porcentaje' THEN
      v_nuevo_precio := ROUND(r.precio * (1 + p_valor / 100.0), 2);
    ELSE
      v_nuevo_precio := r.precio + p_valor;
    END IF;

    -- El precio no puede ser negativo
    IF v_nuevo_precio < 0 THEN
      v_nuevo_precio := 0;
    END IF;

    -- Actualizamos precio
    UPDATE productos
    SET precio = v_nuevo_precio, actualizado_en = now()
    WHERE producto_id = r.producto_id;

    -- Registramos auditoría
    INSERT INTO auditoria_diffs (
      cliente_id,
      usuario_id,
      tabla_afectada,
      registro_id,
      campo_modificado,
      valor_anterior,
      valor_nuevo
    ) VALUES (
      p_cliente_id,
      p_usuario_id,
      'productos',
      r.producto_id,
      'precio',
      r.precio::TEXT,
      v_nuevo_precio::TEXT
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

