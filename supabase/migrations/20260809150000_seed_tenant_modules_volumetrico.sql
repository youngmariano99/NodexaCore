-- Siembra volumétrica de `tenant_modules` (docs/SEED.md §1-3): activación
-- diferenciada de los 5 módulos entre los 3 tenants sembrados en
-- 20260809140000_seed_clientes_volumetrico.sql, dejando `carga_ia`
-- desactivado a propósito en Bazar Casa Sur para validar en el Core
-- (mostrador/productos) que un módulo apagado no rompe nada (Pilar 1).
-- Reejecutable vía ON CONFLICT DO NOTHING sobre UNIQUE(cliente_id, modulo).

insert into tenant_modules (cliente_id, modulo, activo) values
  -- Almacén Don Pedro: solo fiados
  ('a1111111-1111-4111-8111-111111111111', 'fiados', true),

  -- Ferretería El Tornillo: catálogo web + carga IA + bot
  ('b2222222-2222-4222-8222-222222222222', 'catalogo_web', true),
  ('b2222222-2222-4222-8222-222222222222', 'carga_ia', true),
  ('b2222222-2222-4222-8222-222222222222', 'bot_whatsapp', true),

  -- Bazar Casa Sur: catálogo web + fiados + devoluciones + bot, carga_ia desactivado a propósito
  ('c3333333-3333-4333-8333-333333333333', 'catalogo_web', true),
  ('c3333333-3333-4333-8333-333333333333', 'fiados', true),
  ('c3333333-3333-4333-8333-333333333333', 'devoluciones', true),
  ('c3333333-3333-4333-8333-333333333333', 'bot_whatsapp', true),
  ('c3333333-3333-4333-8333-333333333333', 'carga_ia', false)
on conflict (cliente_id, modulo) do nothing;
