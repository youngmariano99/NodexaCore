-- Siembra el comerciante de cada uno de los 3 tenants volumétricos
-- (docs/SEED.md §2), prerrequisito de 20260809170000_seed_auditoria_diffs_volumetrico.sql
-- (auditoria_diffs.usuario_id tiene FK NOT NULL a usuarios). Mismo patrón que
-- 20260807231822_seed_usuarios_demo.sql: auth.users + auth.identities vía
-- crypt()/gen_salt('bf') (solo demo/dev), luego public.usuarios.
-- Password para los tres: "NodexaDemo123!". Reejecutable: ON CONFLICT DO NOTHING.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  is_super_admin, is_sso_user, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-a00000000002', 'authenticated', 'authenticated',
   'pedro@almacendonpedro.com', crypt('NodexaDemo123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', false, false, false),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-a00000000004', 'authenticated', 'authenticated',
   'marta@ferreteriaeltornillo.com', crypt('NodexaDemo123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', false, false, false),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-a00000000007', 'authenticated', 'authenticated',
   'andres@bazarcasasur.com', crypt('NodexaDemo123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', false, false, false)
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at
) values
  (gen_random_uuid(), '00000000-0000-4000-8000-a00000000002', '00000000-0000-4000-8000-a00000000002',
   '{"sub":"00000000-0000-4000-8000-a00000000002","email":"pedro@almacendonpedro.com"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-8000-a00000000004', '00000000-0000-4000-8000-a00000000004',
   '{"sub":"00000000-0000-4000-8000-a00000000004","email":"marta@ferreteriaeltornillo.com"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-8000-a00000000007', '00000000-0000-4000-8000-a00000000007',
   '{"sub":"00000000-0000-4000-8000-a00000000007","email":"andres@bazarcasasur.com"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.usuarios (usuario_id, auth_user_id, cliente_id, rol, nombre, email) values
  ('d0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-a00000000002',
   'a1111111-1111-4111-8111-111111111111', 'comerciante', 'Pedro Gómez', 'pedro@almacendonpedro.com'),
  ('d0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-a00000000004',
   'b2222222-2222-4222-8222-222222222222', 'comerciante', 'Marta Silva', 'marta@ferreteriaeltornillo.com'),
  ('d0000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-a00000000007',
   'c3333333-3333-4333-8333-333333333333', 'comerciante', 'Andrés Bazán', 'andres@bazarcasasur.com')
on conflict (usuario_id) do nothing;
