-- Migración para crear la tabla de proveedores y sus referencias en la tabla productos
CREATE TABLE proveedores (
    proveedor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    contacto TEXT NOT NULL,
    dias_demora INTEGER NOT NULL DEFAULT 0 CHECK (dias_demora >= 0),
    cliente_id UUID NOT NULL REFERENCES clientes(cliente_id),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    eliminado_en TIMESTAMPTZ NULL
);

-- Modificar productos para agregar proveedor_id y stock_minimo
ALTER TABLE productos
    ADD COLUMN proveedor_id UUID REFERENCES proveedores(proveedor_id) ON DELETE SET NULL,
    ADD COLUMN stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0);

-- Habilitar RLS en proveedores
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para proveedores
CREATE POLICY proveedores_rls ON proveedores
    FOR ALL USING (cliente_id = (auth.jwt() ->> 'cliente_id')::uuid);

-- Índices para optimización
CREATE INDEX idx_proveedores_cliente_id ON proveedores(cliente_id);
CREATE INDEX idx_productos_proveedor_id ON productos(proveedor_id);

-- Función y trigger para desvincular proveedor_id de los productos si el proveedor es eliminado lógicamente (soft-delete)
CREATE OR REPLACE FUNCTION fn_desvincular_proveedor_eliminado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL THEN
        UPDATE productos
        SET proveedor_id = NULL
        WHERE proveedor_id = OLD.proveedor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_desvincular_proveedor_eliminado
AFTER UPDATE OF eliminado_en ON proveedores
FOR EACH ROW
EXECUTE FUNCTION fn_desvincular_proveedor_eliminado();
