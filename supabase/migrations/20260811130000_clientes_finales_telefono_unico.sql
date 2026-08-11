-- ------------------------------------------------------------
-- Unicidad de contacto en clientes_finales (docs/ERRORS.md NX-FIA-005:
-- "Ya existe un cliente cargado con estos datos de contacto"). Mismo
-- criterio anti-TOCTOU que productos(cliente_id, sku)
-- (supabase/migrations/..._crear_tablas_negocio.sql): el UNIQUE constraint
-- es la fuente de verdad, nunca un SELECT previo desde la aplicación.
--
-- Parcial: en un índice UNIQUE de Postgres NULL nunca colisiona consigo
-- mismo, así que un alta sin `telefono` (opcional, docs/SCHEMA.md §9) nunca
-- queda bloqueada por este constraint. `eliminado_en IS NULL` para no
-- impedir el alta de un contacto nuevo que reutiliza el teléfono de un
-- cliente final ya dado de baja lógica.
-- ------------------------------------------------------------
create unique index if not exists idx_clientesfinales_telefono_unico
  on clientes_finales (cliente_id, telefono)
  where telefono is not null and eliminado_en is null;
