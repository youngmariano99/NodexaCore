-- ============================================================
-- Extiende custom_access_token_hook para inyectar el claim `estado_pago`
-- (docs/ROLES.md §3.1) del que depende src/proxy.ts para cumplir el
-- Criterio de Aceptación "se suspende el acceso al panel" de la actividad
-- actualizarEstadoPago (src/services/admin/actualizarEstadoPago.ts).
--
-- Hallazgo real de esta estación: ninguna parte del código (proxy.ts, RLS)
-- bloqueaba el acceso al panel (app) de un comercio con estado_pago=false —
-- solo la vidriera pública lo respetaba (clientes_lectura_publica). Se
-- reutiliza el mismo mecanismo ya usado para rol/cliente_id en vez de
-- inventar un chequeo nuevo: el hook ya corre en cada emisión de JWT y ya
-- tiene grant de lectura sobre `usuarios` para supabase_auth_admin.
--
-- Solo aplica a comerciante/empleado (cliente_id no nulo): admin_nodexa no
-- lleva este claim, ya que gestiona `estado_pago` de terceros y nunca debe
-- perder su propio acceso por esta razón (además no tiene fila en clientes).
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
  estado_pago_cliente boolean;
  claims jsonb;
begin
  select rol, cliente_id
    into fila_usuario
    from public.usuarios
   where auth_user_id = (event->>'user_id')::uuid
     and eliminado_en is null;

  claims := coalesce(event->'claims', '{}'::jsonb);

  if found then
    claims := jsonb_set(claims, '{rol}', to_jsonb(fila_usuario.rol));
    claims := jsonb_set(
      claims,
      '{cliente_id}',
      case when fila_usuario.cliente_id is null then 'null'::jsonb else to_jsonb(fila_usuario.cliente_id) end
    );

    if fila_usuario.cliente_id is not null then
      select estado_pago
        into estado_pago_cliente
        from public.clientes
       where cliente_id = fila_usuario.cliente_id;

      -- Si por algún motivo la fila de clientes no aparece (no debería
      -- ocurrir con una FK válida), no se bloquea al usuario por un dato
      -- ausente: se omite el claim y proxy.ts lo trata como "no suspendido"
      -- (mismo criterio conservador que ya usa decodificarClaimsSesion.ts).
      if found then
        claims := jsonb_set(claims, '{estado_pago}', to_jsonb(estado_pago_cliente));
      end if;
    end if;
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant select on public.clientes to supabase_auth_admin;

drop policy if exists clientes_select_auth_admin on public.clientes;
create policy clientes_select_auth_admin on public.clientes
  for select
  to supabase_auth_admin
  using (true);
