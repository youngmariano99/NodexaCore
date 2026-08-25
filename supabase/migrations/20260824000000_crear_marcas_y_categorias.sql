-- Migración para crear tablas de marcas y categorías
CREATE TABLE marcas (
    marca_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cliente_id UUID NOT NULL REFERENCES clientes(cliente_id),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    eliminado_en TIMESTAMPTZ NULL
);

CREATE TABLE categorias (
    categoria_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    cliente_id UUID NOT NULL REFERENCES clientes(cliente_id),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    eliminado_en TIMESTAMPTZ NULL
);

-- Habilitar RLS
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY marcas_rls ON marcas
    FOR ALL USING (cliente_id = (auth.jwt() ->> 'cliente_id')::uuid);

CREATE POLICY categorias_rls ON categorias
    FOR ALL USING (cliente_id = (auth.jwt() ->> 'cliente_id')::uuid);
