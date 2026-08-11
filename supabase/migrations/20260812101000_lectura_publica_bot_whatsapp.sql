-- ------------------------------------------------------------
-- Lectura pública (cliente_final, sin sesión) para el widget de FAQ del bot
-- en la vidriera (/c/[clienteSlug], docs/ROLES.md §2 fila
-- "configuracion_bot_whatsapp": `L (respuesta automática, sin ver config)`
-- para cliente_final). Mismo patrón que productos_lectura_publica /
-- clientes_lectura_publica (política permisiva adicional, PostgreSQL las
-- combina con OR sobre el mismo comando).
--
-- configuracion_bot_whatsapp: solo expone filas con activo = true — un bot
-- desactivado no debe ser legible desde afuera, ni siquiera para confirmar
-- que existe una fila (mismo criterio de no filtrar existencia de recursos
-- ajenos ya aplicado en clientes_lectura_publica).
--
-- tenant_modules: acotado exclusivamente a modulo = 'bot_whatsapp' AND
-- activo = true (nunca se abre lectura pública al resto de los módulos) —
-- necesario para que la vidriera pueda confirmar que el tenant contrató el
-- módulo antes de mostrar el widget, sin depender únicamente del flag
-- `activo` de configuracion_bot_whatsapp (que puede quedar en true aunque el
-- módulo se haya desactivado después).
-- ------------------------------------------------------------

drop policy if exists configuracion_bot_whatsapp_lectura_publica on configuracion_bot_whatsapp;
create policy configuracion_bot_whatsapp_lectura_publica on configuracion_bot_whatsapp
  for select using (activo = true);

drop policy if exists tenant_modules_lectura_publica_bot on tenant_modules;
create policy tenant_modules_lectura_publica_bot on tenant_modules
  for select using (
    modulo = 'bot_whatsapp'
    and activo = true
  );
