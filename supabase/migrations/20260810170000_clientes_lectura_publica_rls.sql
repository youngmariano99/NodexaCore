-- Consulta pública del catálogo sin autenticación (docs/BACKLOG.md "Página
-- estática con ISR de vidriera pública"). `clientes_select` (migración
-- inicial) solo permite `cliente_id = auth_cliente_id() OR es_admin_nodexa()`
-- — un visitante anónimo (`cliente_final`, sin sesión) no tiene ninguna de
-- las dos cosas, así que hoy no puede resolver `clienteSlug -> cliente_id`
-- para la vidriera pública en absoluto. Se agrega una política adicional,
-- mismo patrón exacto que `productos_lectura_publica` (coexiste con la
-- política existente: Postgres evalúa políticas permisivas del mismo comando
-- con OR).
--
-- Se filtra `estado_pago = true` a propósito: un comercio suspendido no debe
-- ser resoluble por slug desde afuera — la Server Component de la vidriera
-- no distingue "el slug no existe" de "el comercio está suspendido" (mismo
-- criterio de no filtrar existencia de recursos que ya usa
-- `verificarPertenenciaTenant`, docs/ROLES.md §3.8): ambos casos
-- simplemente no devuelven fila y la página muestra `NX-WEB-004` con 404
-- (Criterio de Aceptación 3).
drop policy if exists clientes_lectura_publica on clientes;
create policy clientes_lectura_publica on clientes
  for select using (
    estado_pago = true
    and eliminado_en is null
  );
