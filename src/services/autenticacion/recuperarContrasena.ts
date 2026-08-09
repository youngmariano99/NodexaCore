"use server";

import { z } from "zod";

import { verificarAuthLimiter } from "@/lib/rate-limit/authLimiter";
import { obtenerIpSolicitante } from "@/lib/rate-limit/obtenerIpSolicitante";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { EstadoRecuperarContrasena } from "@/services/autenticacion/tipos";

const esquemaRecuperarContrasena = z.object({
  email: z.string({ message: "El email es obligatorio." }).email("Ingresá un email válido."),
});

/**
 * Envía el link de recuperación de contraseña de Supabase Auth. Rate
 * limiting (docs/lib/rate-limit/authLimiter.ts, NX-SYS-005) corre ANTES de
 * tocar Supabase Auth, misma clave compuesta IP+email que iniciarSesion.
 *
 * Devuelve `enviado: true` ante cualquier email con formato válido, exista o
 * no la cuenta, e ignora a propósito el resultado de
 * `resetPasswordForEmail`: no distinguir la respuesta evita la enumeración
 * de usuarios (un atacante no puede usar este formulario para confirmar qué
 * emails están registrados), el mismo patrón que usan la mayoría de flujos
 * de "olvidé mi contraseña" en producción.
 */
export async function recuperarContrasena(
  _estadoPrevio: EstadoRecuperarContrasena,
  formData: FormData,
): Promise<EstadoRecuperarContrasena> {
  const resultado = esquemaRecuperarContrasena.safeParse({
    email: formData.get("email"),
  });

  if (!resultado.success) {
    return { error: "NX-SYS-006", enviado: false };
  }

  const ip = await obtenerIpSolicitante();
  const limite = await verificarAuthLimiter(ip, resultado.data.email);

  if (!limite.permitido) {
    return { error: "NX-SYS-005", enviado: false };
  }

  const supabase = await crearClienteSupabaseServidor();
  await supabase.auth.resetPasswordForEmail(resultado.data.email);

  return { error: null, enviado: true };
}
