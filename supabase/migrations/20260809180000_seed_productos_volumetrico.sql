-- Siembra volumétrica de `productos` (docs/SEED.md §1-4): 1.960 filas sobre
-- los 3 tenants de 20260809140000_seed_clientes_volumetrico.sql, para
-- probar paginación real y los umbrales de crearProducto (NX-PRD-001):
--   - Almacén Don Pedro (limite_sku=1000): 50 productos, bajo uso.
--   - Ferretería El Tornillo (limite_sku=1000): 910 productos, 91% del
--     límite (dispara la banda de aviso NX-PRD-008 en el Core).
--   - Bazar Casa Sur (limite_sku=2000, 1 pack ya contratado): 1.000
--     productos, deja margen bajo el límite ampliado.
-- Reejecutable: ON CONFLICT (cliente_id, sku) DO NOTHING.

insert into productos (cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
select
  'a1111111-1111-4111-8111-111111111111',
  'DP-' || lpad(n::text, 5, '0'),
  'Producto Almacén ' || n,
  'ej. Yerba mate 1kg, paquete x' || n,
  (array['Almacén','Bebidas','Limpieza','Kiosco'])[1 + (n % 4)],
  round((500 + random() * 9500)::numeric, 2),
  (10 + (n % 90)),
  (n % 3 = 0),
  'manual'
from generate_series(1, 50) n
on conflict (cliente_id, sku) do nothing;

insert into productos (cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
select
  'b2222222-2222-4222-8222-222222222222',
  'FT-' || lpad(n::text, 5, '0'),
  'Producto Ferretería ' || n,
  'ej. Tornillo autorroscante 3/4", caja x' || n,
  (array['Tornillería','Herramientas','Pinturas','Electricidad'])[1 + (n % 4)],
  round((200 + random() * 14800)::numeric, 2),
  (5 + (n % 200)),
  (n % 2 = 0),
  case when n % 5 = 0 then 'ia_vision' when n % 7 = 0 then 'excel' else 'manual' end
from generate_series(1, 910) n
on conflict (cliente_id, sku) do nothing;

insert into productos (cliente_id, sku, nombre, descripcion, categoria, precio, stock_actual, publicado, origen_alta)
select
  'c3333333-3333-4333-8333-333333333333',
  'CS-' || lpad(n::text, 5, '0'),
  'Producto Bazar ' || n,
  'ej. Set de vasos x6, línea ' || n,
  (array['Bazar','Hogar','Regalería','Cocina'])[1 + (n % 4)],
  round((300 + random() * 19700)::numeric, 2),
  (0 + (n % 60)),
  (n % 2 = 0),
  case when n % 9 = 0 then 'excel' else 'manual' end
from generate_series(1, 1000) n
on conflict (cliente_id, sku) do nothing;
