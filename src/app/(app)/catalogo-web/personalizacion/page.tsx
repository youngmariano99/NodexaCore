import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { FormularioIdentidadVisual } from "@/app/(app)/catalogo-web/personalizacion/FormularioIdentidadVisual";

export const metadata: Metadata = {
  title: "Personalización de la vidriera — Nodexa Core",
};

// Ver el comentario de app/(app)/dashboard/page.tsx: `crearClienteSupabaseServidor()`
// valida el entorno de servidor completo antes de que Next detecte la
// dependencia dinámica por sí solo.
export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaClienteIdentidad {
  logo_url: string | null;
  color_primario: string | null;
}

/**
 * Personalización visual de la vidriera (docs/SITEMAP.md
 * "/catalogo-web/personalizacion → Identidad visual"; docs/ROLES.md §2, fila
 * "clientes (propio tenant)": `L·M` exclusivo de `comerciante` — `/catalogo-web/*`
 * en la tabla de accesos por ruta no lista a `empleado`). Trae los valores
 * actuales para precargar el formulario (Paso 4 del checklist).
 */
export default async function PersonalizacionVidrieraPage() {
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

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("logo_url, color_primario")
    .eq("cliente_id", solicitante.cliente_id)
    .single<FilaClienteIdentidad>();

  if (errorCliente || !cliente) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Personalización de la vidriera</h1>
          <p className="text-sm text-slate-400">Elegí el logo y el color principal que van a ver tus clientes.</p>
        </header>

        <FormularioIdentidadVisual logoUrlActual={cliente.logo_url} colorPrimarioActual={cliente.color_primario} />
      </div>
    </div>
  );
}
