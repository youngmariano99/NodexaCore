-- Siembra volumétrica de `cargas_ia` (docs/SEED.md, Módulo Carga con IA):
-- 34 registros para Ferretería El Tornillo (b2222222...), el único tenant
-- sembrado con el módulo `carga_ia` activo (docs/SEED.md §3 — Bazar Casa Sur
-- lo tiene desactivado a propósito y Almacén Don Pedro ni siquiera lo
-- contrata). Deja `ia_consultas_usadas = 34` sobre `cuota_mensual_ia = 40`
-- (85% de uso) para ejercitar el aviso de cuota cercana al límite del
-- frontend sin llegar al bloqueo total (`NX-IA-002`, que es al llegar a 40).
--
-- Se vinculan a los 34 primeros productos con `origen_alta = 'ia_vision'`
-- ya sembrados en 20260809180000_seed_productos_volumetrico.sql (SKU
-- 'FT-00005' a 'FT-00170', múltiplos de 5: ese seed ya los marcó como
-- originados por carga IA) para que `resultado_extraido` refleje datos
-- reales y coherentes con el producto que esa carga habría originado, en
-- vez de un jsonb inventado sin relación con el resto de la siembra.
-- `imagen_url` es una URL de ejemplo con la misma forma que devuelve
-- `subirImagenComoWebp` (carpeta `cargas-ia`), sin subir un archivo real.
--
-- `usuario_id` fijo en Marta Silva (comerciante, d0000000...004): es la
-- única fila de `usuarios` del tenant realmente sembrada contra el proyecto
-- real hasta ahora (los empleados d0000000...005/006 de docs/SEED.md §2
-- quedaron escritos pero no aplicados, mismo bloqueo documentado en
-- 20260809170000_seed_auditoria_diffs_volumetrico.sql: requieren su
-- auth.users correspondiente). `cargas_ia.usuario_id` tiene FK real a
-- `usuarios`, a diferencia del `registro_id` polimórfico de
-- `auditoria_diffs`, así que acá no hay margen para usar un id inventado.
insert into cargas_ia (cliente_id, usuario_id, producto_id, imagen_url, resultado_extraido, creado_en)
select
  'b2222222-2222-4222-8222-222222222222',
  'd0000000-0000-4000-8000-000000000004'::uuid,
  p.producto_id,
  'https://res.cloudinary.com/nodexa-demo/image/upload/v1/cargas-ia/etiqueta-ft-' || lpad(k::text, 5, '0') || '.webp',
  jsonb_build_object('nombre', p.nombre, 'precio', p.precio, 'categoria', p.categoria),
  now() - make_interval(hours => (34 - k) * 6)
from generate_series(1, 34) k
cross join lateral (
  select producto_id, nombre, precio, categoria
  from productos
  where cliente_id = 'b2222222-2222-4222-8222-222222222222'
    and sku = 'FT-' || lpad((k * 5)::text, 5, '0')
) p;

-- `ia_consultas_usadas` es un contador propio de `clientes` (docs/SCHEMA.md
-- §2), no un COUNT(*) derivado de `cargas_ia` — en producción lo incrementa
-- fn_registrar_consumo_ia (20260811100000) de forma atómica en cada subida
-- real; acá se fija a mano para que el estado del tenant sembrado sea
-- consistente con las 34 filas insertadas arriba.
update clientes
set ia_consultas_usadas = 34,
    ia_periodo_actual = date_trunc('month', now())
where cliente_id = 'b2222222-2222-4222-8222-222222222222';
