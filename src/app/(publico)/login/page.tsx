import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión — Nodexa Core",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-16 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative flex w-full max-w-md flex-col gap-8 rounded-2xl border border-[#222A27]/60 bg-[#111615]/80 backdrop-blur-md p-8 shadow-2xl">
        <div className="flex flex-col gap-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl font-bold tracking-widest text-[#F3F5F4]">
              N O D E X A
            </span>
            <span className="rounded bg-[#16D39A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#16D39A] uppercase tracking-wider">
              Core
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#F3F5F4]">Iniciar sesión</h1>
          <p className="text-sm text-[#A6AEAA]">
            Ingresá tus credenciales para acceder a tu panel de control.
          </p>
        </div>

        <LoginForm codigoErrorInicial={error} />
      </div>
    </div>
  );
}
