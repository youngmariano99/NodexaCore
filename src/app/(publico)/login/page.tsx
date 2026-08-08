import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión — Nodexa Core",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Iniciar sesión</h1>
          <p className="text-sm text-slate-400">Ingresá con tu email y contraseña para acceder a tu panel.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
