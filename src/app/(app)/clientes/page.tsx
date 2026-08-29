import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";
import { obtenerDashboardCuentasCorrientes } from "@/repositories/cuentasCorrientesDashboardRepository";
import { CentroControlCuentasCorrientes } from "@/components/fiados/CentroControlCuentasCorrientes";

export const metadata: Metadata = {
  title: "Cuentas Corrientes — Nodexa Core",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

export default async function ClientesPage() {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    redirect("/login?error=NX-SYS-002");
  }

  const { data: solicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (!solicitante || (solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  const clienteId = solicitante.cliente_id;

  // Verificar si el módulo fiados está activo para este cliente
  const { data: moduloFiados } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "fiados")
    .maybeSingle<{ activo: boolean }>();

  if (!moduloFiados?.activo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10 text-slate-50">
        <div className="flex w-full max-w-md flex-col gap-4">
          <MensajeError codigo="NX-FIA-001" className="w-full" />
        </div>
      </div>
    );
  }

  // Obtener nombre del comercio
  const { data: clienteTenant } = await supabase
    .from("clientes")
    .select("nombre_comercio")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  // Obtener agregación del Dashboard de Cuentas Corrientes
  const resDashboard = await obtenerDashboardCuentasCorrientes(supabase, clienteId);

  if (!resDashboard.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10">
        <MensajeError codigo={resDashboard.error} className="max-w-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-4 py-8 sm:px-8 text-slate-50">
      <CentroControlCuentasCorrientes
        datosDashboard={resDashboard.data}
        nombreComercio={clienteTenant?.nombre_comercio ?? "Comercio"}
        esComerciante={solicitante.rol === "comerciante"}
      />
    </div>
  );
}
