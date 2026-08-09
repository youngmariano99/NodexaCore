import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión — Nodexa Core",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

/**
 * El middleware de sesión redirige acá con `?error=NX-SYS-XXX` cuando corta
 * el acceso a (app)/(admin) (sesión vencida o rol sin permiso). Se muestra
 * como error inicial del formulario hasta el primer submit.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Iniciar sesión</h1>
          <p className="text-sm text-slate-400">Ingresá con tu email y contraseña para acceder a tu panel.</p>
        </div>
        <LoginForm codigoErrorInicial={error} />
      </div>
    </div>
  );
}
