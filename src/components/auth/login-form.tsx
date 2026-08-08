"use client";

import { AlertCircle } from "lucide-react";
import { useActionState } from "react";

import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { iniciarSesion } from "@/services/autenticacion/iniciarSesion";
import { ESTADO_LOGIN_INICIAL } from "@/services/autenticacion/tipos";

const CLASES_CAMPO_BASE =
  "min-h-11 rounded-md border bg-slate-700 px-4 text-base text-slate-50 placeholder:text-slate-400 outline-none transition-colors duration-150 focus:border-blue-500";

export function LoginForm() {
  const [estado, accionFormulario, estaEnviando] = useActionState(iniciarSesion, ESTADO_LOGIN_INICIAL);
  const hayError = Boolean(estado.error);

  return (
    <form action={accionFormulario} className="flex w-full flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-50">
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
          className={`${CLASES_CAMPO_BASE} ${hayError ? "border-red-500" : "border-slate-700"}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-50">
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
          className={`${CLASES_CAMPO_BASE} ${hayError ? "border-red-500" : "border-slate-700"}`}
        />
      </div>

      {estado.error ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-red-500">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{obtenerMensajeError(estado.error)}</span>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={estaEnviando}
        className="min-h-11 rounded-md bg-blue-500 px-4 text-base font-medium text-slate-50 transition-colors duration-150 hover:bg-blue-500/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {estaEnviando ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
