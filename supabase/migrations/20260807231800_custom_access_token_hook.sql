-- ============================================================
-- custom_access_token_hook
-- Inyecta rol y cliente_id como custom claims del JWT (docs/ROLES.md §3.1-3.2),
-- de los que dependen auth_rol()/auth_cliente_id()/es_admin_nodexa() ya usados
-- por las políticas RLS de la migración init_enums_y_tablas_core.
-- Requiere activación manual en Supabase Dashboard:
-- Authentication > Hooks > "Customize Access Token (JWT) Claims hook".
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  fila_usuario record;
  claims jsonb;
begin
  select rol, cliente_id
    into fila_usuario
    from public.usuarios
   where auth_user_id = (event->>'user_id')::uuid
     and eliminado_en is null;

  claims := coalesce(event->'claims', '{}'::jsonb);

  -- OJO: "fila_usuario IS NOT NULL" sobre un record es true solo si TODOS sus
  -- campos son no-nulos (no "al menos uno"). admin_nodexa tiene cliente_id
  -- NULL a propósito, así que esa condición nunca se cumplía para ese rol y
  -- el hook le devolvía el JWT sin claims. FOUND es el chequeo correcto tras
  -- un SELECT INTO, sin la ambigüedad de fila con campos mixtos null/no-null.
  if found then
    claims := jsonb_set(claims, '{rol}', to_jsonb(fila_usuario.rol));
    claims := jsonb_set(
      claims,
      '{cliente_id}',
      case when fila_usuario.cliente_id is null then 'null'::jsonb else to_jsonb(fila_usuario.cliente_id) end
    );
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

grant select on public.usuarios to supabase_auth_admin;

drop policy if exists usuarios_select_auth_admin on public.usuarios;
create policy usuarios_select_auth_admin on public.usuarios
  for select
  to supabase_auth_admin
  using (true);
