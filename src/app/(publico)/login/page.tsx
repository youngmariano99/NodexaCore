import type { Metadata } from "next";
import Image from "next/image";
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
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-[#151A18] p-2 shadow-lg shadow-emerald-500/5">
            <Image
              src="/Isotipo.png"
              alt="Nodexa Logo"
              width={56}
              height={56}
              className="h-12 w-12 object-contain drop-shadow-md"
              priority
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-sans text-2xl font-bold tracking-tight text-[#F3F5F4]">
              NODEXA
            </span>
            <span className="rounded bg-[#16D39A]/10 border border-[#16D39A]/20 px-2 py-0.5 font-mono text-xs font-semibold text-[#16D39A] uppercase tracking-wider">
              Core
            </span>
          </div>
          <p className="text-sm text-[#A6AEAA]">
            Ingresá tus credenciales para acceder a tu panel de control.
          </p>
        </div>

        <LoginForm codigoErrorInicial={error} />
      </div>
    </div>
  );
}
