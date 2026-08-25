import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { FormularioConfiguracionBot } from "./FormularioConfiguracionBot";

export const metadata: Metadata = {
  title: "Configuración del Bot de WhatsApp — Nodexa Core",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaConfiguracionBot {
  activo: boolean;
  mensaje_horarios: string | null;
  mensaje_ubicacion: string | null;
  mensaje_catalogo: string | null;
  permite_derivar_whatsapp: boolean;
}

export default async function WhatsappBotPage() {
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

  if (!solicitante || solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  const clienteId = solicitante.cliente_id;

  // Verificar que el módulo bot_whatsapp está activo para este cliente
  const { data: moduloBot } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "bot_whatsapp")
    .maybeSingle<{ activo: boolean }>();

  if (!moduloBot?.activo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10 text-slate-50">
        <div className="flex w-full max-w-md flex-col gap-4">
          <MensajeError codigo="NX-BOT-001" className="w-full" />
        </div>
      </div>
    );
  }

  // Traer los valores actuales de configuración si existen
  const { data: config } = await supabase
    .from("configuracion_bot_whatsapp")
    .select("activo, mensaje_horarios, mensaje_ubicacion, mensaje_catalogo, permite_derivar_whatsapp")
    .eq("cliente_id", clienteId)
    .maybeSingle<FilaConfiguracionBot>();

  const configInicial = {
    activo: config?.activo ?? false,
    mensajeHorarios: config?.mensaje_horarios ?? "",
    mensajeUbicacion: config?.mensaje_ubicacion ?? "",
    mensajeCatalogo: config?.mensaje_catalogo ?? "",
    permiteDerivarWhatsapp: config?.permite_derivar_whatsapp ?? false,
  };

  return (
    <div className="flex flex-1 flex-col items-center bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Configuración del Bot</h1>
          <p className="text-sm text-slate-400">
            Mensajes de respuesta automática y desvío para tus clientes de WhatsApp.
          </p>
        </header>

        <FormularioConfiguracionBot configInicial={configInicial} />
      </div>
    </div>
  );
}
