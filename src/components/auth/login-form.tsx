"use client";

import { useActionState } from "react";
import { MensajeError } from "@/components/errores/MensajeError";
import { iniciarSesion } from "@/services/autenticacion/iniciarSesion";
import { ESTADO_LOGIN_INICIAL } from "@/services/autenticacion/tipos";

const CLASES_CAMPO_BASE =
  "min-h-11 rounded-md border bg-[#0D1110] px-4 text-base text-[#F3F5F4] placeholder:text-[#737C78] outline-none transition-colors duration-150 focus:border-[#16D39A]";

interface LoginFormProps {
  codigoErrorInicial?: string;
}

export function LoginForm({ codigoErrorInicial }: LoginFormProps) {
  const [estado, accionFormulario, estaEnviando] = useActionState(iniciarSesion, ESTADO_LOGIN_INICIAL);
  const codigoError = estado.error ?? codigoErrorInicial ?? null;
  const hayError = Boolean(codigoError);

  return (
    <form action={accionFormulario} className="flex w-full flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-[#F3F5F4]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ej. juan.perez@comercio.com"
          required
          aria-invalid={hayError || undefined}
          className={`${CLASES_CAMPO_BASE} ${hayError ? "border-red-500/50 focus:border-red-500" : "border-[#222A27]"}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-[#F3F5F4]">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          required
          aria-invalid={hayError || undefined}
          className={`${CLASES_CAMPO_BASE} ${hayError ? "border-red-500/50 focus:border-red-500" : "border-[#222A27]"}`}
        />
      </div>

      <MensajeError codigo={codigoError} />

      <button
        type="submit"
        disabled={estaEnviando}
        className="min-h-11 rounded-md bg-[#16D39A] px-4 text-base font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90 disabled:cursor-not-allowed disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-[#16D39A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111615]"
      >
        {estaEnviando ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
