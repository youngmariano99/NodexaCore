"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoLogin, RolUsuario } from "@/services/autenticacion/tipos";

const esquemaLogin = z.object({
  email: z
    .string({ message: "El email es obligatorio." })
    .email("Ingresá un email válido."),
  password: z.string({ message: "La contraseña es obligatoria." }).min(1, "La contraseña es obligatoria."),
});

interface FilaUsuarioRol {
  rol: RolUsuario;
}

/**
 * Server Action del formulario de login (Fail-Fast con Zod antes de llamar a
 * Supabase). El rol de redirección se lee de la tabla `usuarios` en vez de
 * decodificar el JWT directamente: el custom_access_token_hook que inyecta
 * `rol`/`cliente_id` como claims (docs/ROLES.md §3.1-3.2) requiere activación
 * manual en el Dashboard de Supabase, y esta lectura vía RLS (política
 * `auth_user_id = auth.uid()`) es correcta y determinística la ejecute o no.
 */
export async function iniciarSesion(_estadoPrevio: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const resultado = esquemaLogin.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!resultado.success) {
    return { error: "NX-SYS-006" };
  }

  const supabase = await crearClienteSupabaseServidor();

  const { data: datosSesion, error: errorSesion } = await supabase.auth.signInWithPassword({
    email: resultado.data.email,
    password: resultado.data.password,
  });

  if (errorSesion || !datosSesion.user) {
    return { error: errorSesion?.status === 400 ? "NX-SYS-006" : "NX-SYS-001" };
  }

  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("auth_user_id", datosSesion.user.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioRol>();

  if (errorUsuario || !usuario) {
    return { error: "NX-SYS-001" };
  }

  redirect(RUTA_POR_ROL[usuario.rol] ?? "/dashboard");
}
