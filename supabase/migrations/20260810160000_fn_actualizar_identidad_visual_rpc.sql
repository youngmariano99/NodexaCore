-- Personalización visual de la vidriera (docs/BACKLOG.md "Server Action
-- actualizarIdentidadVisual"). `clientes` no tiene ninguna política RLS de
-- UPDATE para `comerciante` — solo `clientes_update_admin`, exclusiva de
-- `admin_nodexa` (ver `init_enums_y_tablas_core.sql`). Sumar una política de
-- UPDATE genérica para que el comerciante edite su propia fila expondría
-- columnas administrativas (`estado_pago`, `limite_sku`,
-- `packs_sku_contratados`) a cualquier comerciante que llame a PostgREST
-- directo: RLS filtra FILAS, no columnas, así que una política amplia no
-- alcanza para "solo estas dos columnas" (Paso 3 del checklist).
--
-- En vez de eso, esta función es `SECURITY DEFINER`: corre con el privilegio
-- del dueño de la función (el rol de la migración, que no está sujeto a la
-- RLS de `comerciante`), y su `UPDATE` interno menciona literalmente
-- `logo_url`/`color_primario` y ninguna otra columna — no hay forma de que
-- esta función toque `estado_pago` aunque quisiera, porque esa columna ni
-- siquiera aparece en su cuerpo. `set search_path = public` evita el ataque
-- clásico de secuestro de `search_path` sobre funciones `SECURITY DEFINER`.
--
-- La función no recibe ningún `cliente_id` como parámetro: siempre opera
-- sobre `auth_cliente_id()` de la sesión que la invoca. Un comerciante de
-- otro tenant no tiene forma de apuntar a otro comercio — no es que la
-- operación se "rechace", es que ni siquiera es expresable como input
-- (Criterio de Aceptación 4).
create or replace function public.fn_actualizar_identidad_visual(
  p_logo_url text,
  p_color_primario text
)
returns clientes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_cliente clientes;
begin
  if auth_rol() is distinct from 'comerciante' then
    raise exception 'No tenés permiso para modificar la identidad visual de este comercio.' using errcode = 'P0001';
  end if;

  v_cliente_id := auth_cliente_id();

  if v_cliente_id is null then
    raise exception 'No se encontró el comercio del usuario solicitante.' using errcode = 'P0002';
  end if;

  update clientes
  set logo_url = p_logo_url,
      color_primario = p_color_primario
  where cliente_id = v_cliente_id
    and eliminado_en is null
  returning * into v_cliente;

  if not found then
    raise exception 'No se encontró el comercio del usuario solicitante.' using errcode = 'P0002';
  end if;

  return v_cliente;
end;
$$;
