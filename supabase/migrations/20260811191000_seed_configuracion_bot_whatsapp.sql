-- ------------------------------------------------------------
-- Seed de configuracion_bot_whatsapp (docs/SEED.md §11): 2 filas, una por
-- cada tenant con el módulo bot_whatsapp activo (Ferretería El Tornillo y
-- Bazar Casa Sur, ver 20260809150000_seed_tenant_modules_volumetrico.sql).
-- Contenido literal de docs/SEED.md, re-ejecutable vía ON CONFLICT DO NOTHING.
-- ------------------------------------------------------------

insert into configuracion_bot_whatsapp (cliente_id, activo, mensaje_horarios, mensaje_ubicacion, mensaje_catalogo)
values
  ('b2222222-2222-4222-8222-222222222222', true,
   'ej. Atendemos de lunes a sábado de 8 a 20 hs.',
   'ej. Estamos en Av. San Martín 450, Coronel Pringles.',
   'ej. Mirá nuestro catálogo completo acá: https://ferreteriaeltornillo.nodexa.app'),
  ('c3333333-3333-4333-8333-333333333333', true,
   'ej. Abrimos de martes a domingo de 10 a 19 hs.',
   'ej. Nos encontrás en Belgrano 120, Coronel Pringles.',
   'ej. Todo nuestro bazar, a un clic: https://bazarcasasur.com.ar')
on conflict (cliente_id) do nothing;
