create or replace function public.fn_alternar_estado_pedidos(
  p_aceptando_pedidos boolean
)
returns clientes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_cliente clientes;
  v_nueva_config jsonb;
begin
  if auth_rol() is distinct from 'comerciante' then
    raise exception 'No tenés permiso para modificar la configuración de este comercio.' using errcode = 'P0001';
  end if;

  v_cliente_id := auth_cliente_id();

  if v_cliente_id is null then
    raise exception 'No se encontró el comercio del usuario solicitante.' using errcode = 'P0002';
  end if;

  select configuracion_plantilla into v_nueva_config
  from clientes
  where cliente_id = v_cliente_id;

  v_nueva_config := jsonb_set(coalesce(v_nueva_config, '{}'::jsonb), '{aceptando_pedidos}', to_jsonb(p_aceptando_pedidos));

  update clientes
  set configuracion_plantilla = v_nueva_config
  where cliente_id = v_cliente_id
    and eliminado_en is null
  returning * into v_cliente;

  if not found then
    raise exception 'No se encontró el comercio del usuario solicitante.' using errcode = 'P0002';
  end if;

  return v_cliente;
end;
$$;
