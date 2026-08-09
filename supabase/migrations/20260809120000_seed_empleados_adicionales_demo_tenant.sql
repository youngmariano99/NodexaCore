-- ============================================================
-- seed_empleados_adicionales_demo_tenant
-- 2 empleados adicionales para el tenant 'demo-nodexa' (mismo comercio de
-- comerciante.demo@nodexa.app, sembrado en 20260807231822_seed_usuarios_demo.sql),
-- para validar en el frontend el límite de roles/paginación de empleados
-- dentro de un mismo tenant (requerimiento de datos semilla de la actividad
-- "Server Action de creación de usuario empleado").
-- Password para ambos: "NodexaDemo123!" (solo demo/dev, nunca en producción).
-- Reejecutable: ON CONFLICT DO NOTHING por id.
-- ============================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  is_super_admin, is_sso_user, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', 'a1a1a1a1-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
   'empleado2.demo@nodexa.app', crypt('NodexaDemo123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', false, false, false),
  ('00000000-0000-0000-0000-000000000000', 'a1a1a1a1-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
   'empleado3.demo@nodexa.app', crypt('NodexaDemo123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', false, false, false)
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at
) values
  (gen_random_uuid(), 'a1a1a1a1-0000-4000-8000-000000000004', 'a1a1a1a1-0000-4000-8000-000000000004',
   '{"sub":"a1a1a1a1-0000-4000-8000-000000000004","email":"empleado2.demo@nodexa.app"}', 'email', now(), now(), now()),
  (gen_random_uuid(), 'a1a1a1a1-0000-4000-8000-000000000005', 'a1a1a1a1-0000-4000-8000-000000000005',
   '{"sub":"a1a1a1a1-0000-4000-8000-000000000005","email":"empleado3.demo@nodexa.app"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.usuarios (auth_user_id, cliente_id, rol, nombre, email)
select 'a1a1a1a1-0000-4000-8000-000000000004', cliente_id, 'empleado', 'Empleado Demo Dos', 'empleado2.demo@nodexa.app'
from public.clientes
where slug = 'demo-nodexa'
  and not exists (select 1 from public.usuarios where auth_user_id = 'a1a1a1a1-0000-4000-8000-000000000004');

insert into public.usuarios (auth_user_id, cliente_id, rol, nombre, email)
select 'a1a1a1a1-0000-4000-8000-000000000005', cliente_id, 'empleado', 'Empleado Demo Tres', 'empleado3.demo@nodexa.app'
from public.clientes
where slug = 'demo-nodexa'
  and not exists (select 1 from public.usuarios where auth_user_id = 'a1a1a1a1-0000-4000-8000-000000000005');
