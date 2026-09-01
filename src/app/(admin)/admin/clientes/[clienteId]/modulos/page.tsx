import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { type ModuloNodexa, MODULOS_NODEXA } from "@/services/admin/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { PanelModulosAdmin } from "./PanelModulosAdmin";

export const metadata: Metadata = {
  title: "Administrar Módulos — Nodexa Core",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
}

interface FilaCliente {
  nombre_comercio: string;
  slug: string;
}

interface FilaTenantModule {
  modulo: ModuloNodexa;
  activo: boolean;
}

export default async function AdminModulosPage({
  params,
}: {
  params: Promise<{ clienteId: string }>;
}) {
  const parametros = await params;
  const clienteId = parametros.clienteId;

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
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10">
        <MensajeError codigo="NX-SYS-003" className="max-w-md" />
      </div>
    );
  }

  // Cargar info del comercio/cliente
  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("nombre_comercio, slug")
    .eq("cliente_id", clienteId)
    .maybeSingle<FilaCliente>();

  if (errorCliente || !cliente) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10">
        <MensajeError codigo="NX-SYS-007" className="max-w-md" />
      </div>
    );
  }

  // Cargar módulos contratados
  const { data: modulosFila } = await supabase
    .from("tenant_modules")
    .select("modulo, activo")
    .eq("cliente_id", clienteId)
    .returns<FilaTenantModule[]>();

  const modulosContratados = MODULOS_NODEXA.reduce((acc, modulo) => {
    const fila = modulosFila?.find((m) => m.modulo === modulo);
    acc[modulo] = fila ? fila.activo : false;
    return acc;
  }, {} as Record<ModuloNodexa, boolean>);

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <Link
            href={`/admin/clientes/${clienteId}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-xs text-slate-400 hover:text-[#16D39A] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a la ficha del comercio
          </Link>
        </div>

        <header className="flex flex-col gap-1 border-b border-[#222A27] pb-4">
          <h1 className="text-2xl font-semibold text-slate-50 font-sans">Administrar Módulos</h1>
          <p className="text-sm text-slate-400">
            Comercio: <span className="font-semibold text-slate-200">{cliente.nombre_comercio}</span> ({cliente.slug})
          </p>
        </header>

        <PanelModulosAdmin clienteId={clienteId} modulosContratados={modulosContratados} />
      </div>
    </div>
  );
}

