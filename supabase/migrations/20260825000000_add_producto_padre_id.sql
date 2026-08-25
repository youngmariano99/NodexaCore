-- Migración: Agregar columna producto_padre_id para soportar variantes jerárquicas
ALTER TABLE productos
  ADD COLUMN producto_padre_id uuid REFERENCES productos(producto_id) ON DELETE CASCADE;

-- Índice para optimizar consultas de variantes de un producto padre
CREATE INDEX idx_productos_padre_id ON productos(producto_padre_id);
