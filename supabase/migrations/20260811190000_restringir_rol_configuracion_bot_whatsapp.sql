-- ------------------------------------------------------------
-- Restringe INSERT/UPDATE de configuracion_bot_whatsapp a comerciante.
--
-- Las políticas originales (20260809130100_enable_rls_policies.sql) siguen
-- el patrón genérico de docs/ROLES.md §3.3 (solo filtran por cliente_id),
-- pero docs/ROLES.md §2 no le da a `empleado` ninguna letra en la fila
-- "configuracion_bot_whatsapp" (a diferencia de otras tablas donde empleado
-- sí tiene C/L parcial) — es la única tabla de negocio con acceso exclusivo
-- de comerciante dentro del tenant. Sin este ajuste, un empleado podía
-- escribir esta tabla en silencio vía PostgREST directo, sin pasar por
-- actualizarConfiguracionBot.ts (mismo hallazgo de fondo que motivó
-- clientes_finales_update_tenant y la restricción de rol en
-- alternarPublicacionProducto).
-- ------------------------------------------------------------

drop policy if exists configuracion_bot_whatsapp_insert_tenant on configuracion_bot_whatsapp;
create policy configuracion_bot_whatsapp_insert_tenant on configuracion_bot_whatsapp
  for insert with check (
    cliente_id = auth_cliente_id()
    and auth_rol() = 'comerciante'
  );

drop policy if exists configuracion_bot_whatsapp_update_tenant on configuracion_bot_whatsapp;
create policy configuracion_bot_whatsapp_update_tenant on configuracion_bot_whatsapp
  for update using (cliente_id = auth_cliente_id())
  with check (
    cliente_id = auth_cliente_id()
    and auth_rol() = 'comerciante'
  );
