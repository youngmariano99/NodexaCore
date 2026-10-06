-- ============================================================
-- trigger_desactualizacion_costos.sql
-- ============================================================

CREATE OR REPLACE FUNCTION fn_invalidar_costos_por_insumo()
RETURNS trigger
LANGUAGE plpgsql
AS \$\$
BEGIN
  -- Verificar si el precio cambió realmente
  IF NEW.precio IS DISTINCT FROM OLD.precio THEN
    -- Actualizar el estado a 'desactualizado' para todas las recetas vinculadas
    UPDATE recetas
    SET estado_costeo = 'desactualizado'
    WHERE receta_id IN (
      SELECT receta_id 
      FROM receta_insumos 
      WHERE insumo_producto_id = NEW.producto_id
    )
    AND estado_costeo != 'desactualizado';
  END IF;
  
  RETURN NEW;
END;
\$\$;

CREATE TRIGGER trg_invalidar_costos_por_insumo_update
  AFTER UPDATE OF precio ON productos
  FOR EACH ROW
  WHEN (NEW.tipo_producto = 'insumo')
  EXECUTE FUNCTION fn_invalidar_costos_por_insumo();

