-- Migration: Soporte JSONB de Configuración de Plantilla en Entidad Clientes
-- Archivo: supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql
-- Módulo: Catálogo Web

-- 1. Agregar columnas a la tabla clientes para soportar plantillas personalizadas y JSONB dinámico
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS plantilla_activa TEXT NOT NULL DEFAULT 'basica',
  ADD COLUMN IF NOT EXISTS configuracion_plantilla JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Función de validación de estructura JSONB dinámico para configuracion_plantilla
CREATE OR REPLACE FUNCTION fn_validar_configuracion_plantilla()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que la columna configuracion_plantilla contenga un objeto JSON válido
  IF jsonb_typeof(NEW.configuracion_plantilla) <> 'object' THEN
    RAISE EXCEPTION 'NX-SYS-006: La configuración de plantilla debe ser un objeto JSON válido.'
      USING ERRCODE = '22023';
  END IF;

  -- Validar que plantilla_activa no esté vacía ni contenga solo espacios
  IF NEW.plantilla_activa IS NULL OR TRIM(NEW.plantilla_activa) = '' THEN
    RAISE EXCEPTION 'NX-SYS-006: El nombre de la plantilla activa no puede estar vacío.'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para ejecutar la validación antes de insertar o actualizar en la tabla clientes
DROP TRIGGER IF EXISTS trg_validar_configuracion_plantilla ON clientes;

CREATE TRIGGER trg_validar_configuracion_plantilla
  BEFORE INSERT OR UPDATE OF plantilla_activa, configuracion_plantilla
  ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION fn_validar_configuracion_plantilla();

-- 4. Comentario explicativo en columnas
COMMENT ON COLUMN clientes.plantilla_activa IS 'Identificador de la plantilla asignada al comercio para el catálogo web (ej: basica, la-martina, filomena)';
COMMENT ON COLUMN clientes.configuracion_plantilla IS 'Configuración dinámica en JSONB (banners, secciones, fuentes, estilos) según la plantilla activa';
