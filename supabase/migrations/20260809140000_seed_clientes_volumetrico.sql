-- Siembra volumétrica de `clientes` (docs/SEED.md §1-2): 3 comercios
-- representativos de los escenarios de uso de `limite_sku` que ejercita el
-- Server Action crearCliente y el Módulo Core (Productos y Stock):
--   - Almacén Don Pedro: bajo uso (tenant demo del Sprint 1, ya sembrado)
--   - Ferretería El Tornillo: cerca del umbral de aviso preventivo (90%)
--   - Bazar Casa Sur: sobre el tope base, con limite_sku ampliado (pack extendido)
-- Reejecutable vía ON CONFLICT DO NOTHING (mismos cliente_id que docs/SEED.md,
-- para que estaciones futuras de usuarios/productos referencien los mismos IDs).

insert into clientes (
  cliente_id, nombre_comercio, slug, estado_pago, limite_sku,
  cuota_mensual_ia, ia_consultas_usadas, ia_periodo_actual,
  logo_url, color_primario, dominio_personalizado, telefono_whatsapp
) values
  ('a1111111-1111-4111-8111-111111111111', 'Almacén Don Pedro', 'almacen-don-pedro', true, 1000,
   40, 0, date_trunc('month', now()), null, '#3B82F6', null, '+5492920000001'),
  ('b2222222-2222-4222-8222-222222222222', 'Ferretería El Tornillo', 'ferreteria-el-tornillo', true, 1000,
   40, 34, date_trunc('month', now()), null, '#3B82F6', null, '+5492920000002'),
  ('c3333333-3333-4333-8333-333333333333', 'Bazar Casa Sur', 'bazar-casa-sur', true, 2000,
   40, 12, date_trunc('month', now()), null, '#3B82F6', 'bazarcasasur.com.ar', '+5492920000003')
on conflict (cliente_id) do nothing;
