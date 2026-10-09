-- Migration: Configuración de Mensajes Transaccionales (Kanban)
-- Módulo: Comandas
-- Descripción: Agregar clave en la configuración del tenant para guardar mensajes dinámicos por estado.

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS mensajes_kanban JSONB NOT NULL DEFAULT '{
    "pendiente": "¡Hola {{nombre_cliente}}! Te escribimos desde nuestro local por tu pedido #{{nro_pedido}}.",
    "en_preparacion": "¡Hola {{nombre_cliente}}! 👨‍🍳 Tu pedido #{{nro_pedido}} ya está en preparación 🍽️. ¡Te avisaremos cuando esté listo!",
    "despachado": "¡Hola {{nombre_cliente}}! 🛵 Tu pedido #{{nro_pedido}} va en camino a tu domicilio.",
    "completado": "¡Hola {{nombre_cliente}}! ✅ Tu pedido #{{nro_pedido}} ha sido entregado con éxito. ¡Muchas gracias por tu compra!",
    "cancelado": "Hola {{nombre_cliente}}. Te informamos que tu pedido #{{nro_pedido}} ha sido cancelado."
  }'::jsonb;
