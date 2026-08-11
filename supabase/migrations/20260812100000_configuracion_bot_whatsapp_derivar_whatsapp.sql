-- ------------------------------------------------------------
-- Agrega el toggle "permite derivar a WhatsApp real" pedido por el negocio
-- para el FAQ del bot en la vidriera pública (docs/SCHEMA.md §15): cuando el
-- cliente final no encuentra respuesta entre las preguntas predefinidas
-- (mensaje_horarios/mensaje_ubicacion/mensaje_catalogo), el comerciante
-- decide si se le ofrece continuar la conversación por WhatsApp real
-- (wa.me + clientes.telefono_whatsapp) o no. DEFAULT true preserva el
-- comportamiento actual para los tenants ya sembrados (Ferretería El
-- Tornillo, Bazar Casa Sur) sin requerir un backfill explícito.
-- ------------------------------------------------------------

alter table configuracion_bot_whatsapp
  add column if not exists permite_derivar_whatsapp boolean not null default true;
