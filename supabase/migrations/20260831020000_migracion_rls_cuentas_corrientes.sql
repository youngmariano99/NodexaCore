-- Migración: Remediación de Políticas RLS en Cuentas Corrientes e Imputaciones
-- Archivo: supabase/migrations/20260831020000_migracion_rls_cuentas_corrientes.sql
-- Módulo: Cuentas Corrientes

-- 1. Eliminar políticas permisivas/erróneas anteriores
DROP POLICY IF EXISTS "Comerciante gestiona sus cuentas corrientes" ON cuentas_corrientes;
DROP POLICY IF EXISTS "Comerciante gestiona sus imputaciones" ON imputaciones_comprobantes;

DROP POLICY IF EXISTS cuentas_corrientes_select_tenant ON cuentas_corrientes;
DROP POLICY IF EXISTS cuentas_corrientes_insert_tenant ON cuentas_corrientes;
DROP POLICY IF EXISTS cuentas_corrientes_update_tenant ON cuentas_corrientes;

DROP POLICY IF EXISTS imputaciones_comprobantes_select_tenant ON imputaciones_comprobantes;
DROP POLICY IF EXISTS imputaciones_comprobantes_insert_tenant ON imputaciones_comprobantes;
DROP POLICY IF EXISTS imputaciones_comprobantes_update_tenant ON imputaciones_comprobantes;

-- 2. Asegurar RLS habilitado
ALTER TABLE cuentas_corrientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE imputaciones_comprobantes ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para cuentas_corrientes
CREATE POLICY cuentas_corrientes_select_tenant ON cuentas_corrientes
  FOR SELECT
  USING (
    cliente_id = (auth.jwt() ->> 'cliente_id')::uuid
    OR public.es_admin_nodexa()
  );

CREATE POLICY cuentas_corrientes_insert_tenant ON cuentas_corrientes
  FOR INSERT
  WITH CHECK (
    cliente_id = (auth.jwt() ->> 'cliente_id')::uuid
  );

CREATE POLICY cuentas_corrientes_update_tenant ON cuentas_corrientes
  FOR UPDATE
  USING (
    cliente_id = (auth.jwt() ->> 'cliente_id')::uuid
  )
  WITH CHECK (
    cliente_id = (auth.jwt() ->> 'cliente_id')::uuid
  );

-- 4. Políticas para imputaciones_comprobantes
CREATE POLICY imputaciones_comprobantes_select_tenant ON imputaciones_comprobantes
  FOR SELECT
  USING (
    cliente_id = (auth.jwt() ->> 'cliente_id')::uuid
    OR public.es_admin_nodexa()
  );

CREATE POLICY imputaciones_comprobantes_insert_tenant ON imputaciones_comprobantes
  FOR INSERT
  WITH CHECK (
    cliente_id = (auth.jwt() ->> 'cliente_id')::uuid
  );

CREATE POLICY imputaciones_comprobantes_update_tenant ON imputaciones_comprobantes
  FOR UPDATE
  USING (
    cliente_id = (auth.jwt() ->> 'cliente_id')::uuid
  )
  WITH CHECK (
    cliente_id = (auth.jwt() ->> 'cliente_id')::uuid
  );
