-- ============================================================
-- seed_usuarios_demo
-- 3 usuarios de prueba (admin_nodexa, comerciante, empleado) para validar
-- los tres flujos de redirección del login. Password para los tres:
-- "NodexaDemo123!" (solo demo/dev, nunca usar en producción).
-- Reejecutable: ON CONFLICT DO NOTHING por id.
-- ============================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  is_super_admin, is_sso_user, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', 'a1a1a1a1-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'admin.demo@nodexa.app', crypt('NodexaDemo123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', false, false, false),
  ('00000000-0000-0000-0000-000000000000', 'a1a1a1a1-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'comerciante.demo@nodexa.app', crypt('NodexaDemo123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', false, false, false),
  ('00000000-0000-0000-0000-000000000000', 'a1a1a1a1-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'empleado.demo@nodexa.app', crypt('NodexaDemo123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', false, false, false)
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at
) values
  (gen_random_uuid(), 'a1a1a1a1-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000001',
   '{"sub":"a1a1a1a1-0000-4000-8000-000000000001","email":"admin.demo@nodexa.app"}', 'email', now(), now(), now()),
  (gen_random_uuid(), 'a1a1a1a1-0000-4000-8000-000000000002', 'a1a1a1a1-0000-4000-8000-000000000002',
   '{"sub":"a1a1a1a1-0000-4000-8000-000000000002","email":"comerciante.demo@nodexa.app"}', 'email', now(), now(), now()),
  (gen_random_uuid(), 'a1a1a1a1-0000-4000-8000-000000000003', 'a1a1a1a1-0000-4000-8000-000000000003',
   '{"sub":"a1a1a1a1-0000-4000-8000-000000000003","email":"empleado.demo@nodexa.app"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.usuarios (auth_user_id, cliente_id, rol, nombre, email)
select 'a1a1a1a1-0000-4000-8000-000000000001', null, 'admin_nodexa', 'Admin Demo Nodexa', 'admin.demo@nodexa.app'
where not exists (select 1 from public.usuarios where auth_user_id = 'a1a1a1a1-0000-4000-8000-000000000001');

insert into public.usuarios (auth_user_id, cliente_id, rol, nombre, email)
select 'a1a1a1a1-0000-4000-8000-000000000002', cliente_id, 'comerciante', 'Comerciante Demo', 'comerciante.demo@nodexa.app'
from public.clientes
where slug = 'demo-nodexa'
  and not exists (select 1 from public.usuarios where auth_user_id = 'a1a1a1a1-0000-4000-8000-000000000002');

insert into public.usuarios (auth_user_id, cliente_id, rol, nombre, email)
select 'a1a1a1a1-0000-4000-8000-000000000003', cliente_id, 'empleado', 'Empleado Demo', 'empleado.demo@nodexa.app'
from public.clientes
where slug = 'demo-nodexa'
  and not exists (select 1 from public.usuarios where auth_user_id = 'a1a1a1a1-0000-4000-8000-000000000003');
