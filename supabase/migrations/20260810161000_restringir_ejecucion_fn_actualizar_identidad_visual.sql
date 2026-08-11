-- get_advisors (security) detectó que fn_actualizar_identidad_visual, al
-- ser SECURITY DEFINER, quedaba ejecutable por el rol `anon` (sin sesión) vía
-- PostgREST — la función igual rechaza esas llamadas en tiempo de ejecución
-- (auth_rol() es NULL para un caller anónimo, distinto de 'comerciante', por
-- lo que siempre cae en el `raise exception` de permiso), pero reducir la
-- superficie expuesta a nivel de privilegios de Postgres es la corrección
-- correcta en vez de confiar únicamente en la lógica interna de la función.
revoke execute on function public.fn_actualizar_identidad_visual(text, text) from public;
revoke execute on function public.fn_actualizar_identidad_visual(text, text) from anon;
grant execute on function public.fn_actualizar_identidad_visual(text, text) to authenticated;
