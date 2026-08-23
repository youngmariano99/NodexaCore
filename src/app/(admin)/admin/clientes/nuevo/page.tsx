import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { FormularioAltaClienteAdmin } from "./FormularioAltaClienteAdmin";

export const metadata: Metadata = {
  title: "Alta de Comercio — Admin Nodexa",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
}

export default async function NuevoClienteAdminPage() {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    redirect("/login?error=NX-SYS-002");
  }

  const { data: solicitante } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  // Exclusivo para admin_nodexa
  if (!solicitante || solicitante.rol !== "admin_nodexa") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-10">
        <MensajeError codigo="NX-SYS-003" className="max-w-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <Link
            href="/admin/clientes"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al listado de comercios
          </Link>
        </div>

        <header className="flex flex-col gap-1 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold text-slate-50 font-sans">Alta de Comercio</h1>
          <p className="text-sm text-slate-400">
            Registrá un nuevo comercio en la plataforma y configurá sus parámetros iniciales.
          </p>
        </header>

        <FormularioAltaClienteAdmin />
      </div>
    </div>
  );
}
