import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { type ModuloNodexa, MODULOS_NODEXA } from "@/services/admin/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { MarketplaceModulos } from "./MarketplaceModulos";

export const metadata: Metadata = {
  title: "Módulos Contratados — Nodexa Core",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaTenantModule {
  modulo: ModuloNodexa;
  activo: boolean;
}

export default async function ModulosConfiguracionPage() {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    redirect("/login?error=NX-SYS-002");
  }

  const { data: solicitante } = await supabase
    .from("usuarios")
    .select("rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  // Exclusivo para rol comerciante
  if (!solicitante || solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10">
        <MensajeError codigo="NX-SYS-003" className="max-w-md" />
      </div>
    );
  }

  const { data: modulosFila } = await supabase
    .from("tenant_modules")
    .select("modulo, activo")
    .eq("cliente_id", solicitante.cliente_id)
    .returns<FilaTenantModule[]>();

  const modulosContratados = MODULOS_NODEXA.reduce((acc, modulo) => {
    const fila = modulosFila?.find((m) => m.modulo === modulo);
    acc[modulo] = fila ? fila.activo : false;
    return acc;
  }, {} as Record<ModuloNodexa, boolean>);

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1 border-b border-[#222A27] pb-4">
          <h1 className="text-2xl font-semibold text-slate-50 font-sans">Módulos Contratados</h1>
          <p className="text-sm text-slate-400">
            Revisá los módulos activos de tu comercio y solicitá la habilitación de nuevas funciones de forma simple.
          </p>
        </header>

        <MarketplaceModulos modulosContratados={modulosContratados} />
      </div>
    </div>
  );
}
