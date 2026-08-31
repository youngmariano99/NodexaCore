import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { FormularioConfiguracion } from "./FormularioConfiguracion";
import { FormularioMetodosPago } from "./FormularioMetodosPago";
import type { ReglaMetodoPago } from "@/lib/dominio/ventas/calcularTotalVenta";

export const metadata: Metadata = {
  title: "Configuración del Comercio — Nodexa Core",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaCliente {
  nombre_comercio: string;
  telefono_whatsapp: string;
  logo_url: string | null;
  configuracion_metodos_pago: ReglaMetodoPago[] | null;
}

export default async function ConfiguracionPage() {
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

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("nombre_comercio, telefono_whatsapp, logo_url")
    .eq("cliente_id", solicitante.cliente_id)
    .maybeSingle<FilaCliente>();

  if (errorCliente || !cliente) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  // Consulta opcional de métodos de pago (resiliente si la migración de la columna está pendiente)
  let metodosIniciales: ReglaMetodoPago[] | null = null;
  try {
    const { data: metodosData } = await supabase
      .from("clientes")
      .select("configuracion_metodos_pago")
      .eq("cliente_id", solicitante.cliente_id)
      .maybeSingle<{ configuracion_metodos_pago: ReglaMetodoPago[] | null }>();

    if (metodosData?.configuracion_metodos_pago) {
      metodosIniciales = metodosData.configuracion_metodos_pago;
    }
  } catch {
    // Si la columna aún no está creada en la BD remota, usa null/defaults
  }

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-1 border-b border-[#222A27] pb-4">
          <h1 className="text-2xl font-semibold text-slate-50 font-sans">Configuración del Comercio</h1>
          <p className="text-sm text-slate-400">
            Mantené actualizados los datos comerciales de tu tienda y sus políticas de cobro y promociones.
          </p>
        </header>

        <FormularioConfiguracion
          nombreInicial={cliente.nombre_comercio}
          whatsappInicial={cliente.telefono_whatsapp}
          logoInicial={cliente.logo_url}
        />

        <FormularioMetodosPago
          metodosIniciales={metodosIniciales}
        />
      </div>
    </div>
  );
}
