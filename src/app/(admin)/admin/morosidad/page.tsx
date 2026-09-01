import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { ControlMorosidad } from "./ControlMorosidad";

export const metadata: Metadata = {
  title: "Control de Morosidad — Admin Nodexa",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
}

interface FilaCliente {
  cliente_id: string;
  nombre_comercio: string;
  slug: string;
  telefono_whatsapp: string;
  estado_pago: boolean;
}

export default async function MorosidadAdminPage() {
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

  // Cargar lista de clientes registrados
  const { data: clientes, error: errorClientes } = await supabase
    .from("clientes")
    .select("cliente_id, nombre_comercio, slug, telefono_whatsapp, estado_pago")
    .is("eliminado_en", null)
    .order("nombre_comercio", { ascending: true })
    .returns<FilaCliente[]>();

  if (errorClientes || !clientes) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1 border-b border-[#222A27] pb-4">
          <h1 className="text-2xl font-semibold text-slate-50 font-sans">Control de Morosidad</h1>
          <p className="text-sm text-slate-400">
            Administrá el estado de pago de los comercios y aplicá suspensiones o reactivaciones según corresponda.
          </p>
        </header>

        <ControlMorosidad clientesIniciales={clientes} />
      </div>
    </div>
  );
}

