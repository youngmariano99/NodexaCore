import type { Metadata } from "next";

import { FormularioAltaProductoWizard } from "@/app/(app)/productos/nuevo/FormularioAltaProductoWizard";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Nuevo producto â€” Nodexa Core",
};

/**
 * Alta manual de producto con wizard multi-paso.
 * Recupera si el comercio tiene activo el mÃ³dulo `catalogo_web` para activar la subida de fotos.
 */
export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  let catalogoWebActivo = false;
  let gastronomiaActivo = false;

  if (usuarioAutenticado) {
    const { data: solicitante } = await supabase
      .from("usuarios")
      .select("cliente_id")
      .eq("auth_user_id", usuarioAutenticado.id)
      .is("eliminado_en", null)
      .single();

    if (solicitante?.cliente_id) {
      const { data: modulo } = await supabase
        .from("tenant_modules")
        .select("activo")
        .eq("cliente_id", solicitante.cliente_id)
        .eq("modulo", "catalogo_web")
        .eq("activo", true)
        .maybeSingle();

      catalogoWebActivo = !!modulo?.activo;
      const { data: moduloGastro } = await supabase.from('tenant_modules').select('activo').eq('cliente_id', solicitante.cliente_id).eq('modulo', 'produccion_gastronomica').eq('activo', true).maybeSingle();
      gastronomiaActivo = !!moduloGastro?.activo;
      console.log('DEBUG: gastronomiaActivo en page.tsx:', gastronomiaActivo);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-[#090B0B] px-6 py-10 text-[#F3F5F4]">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#F3F5F4]">Nuevo producto</h1>
          <p className="text-sm text-slate-400">CargÃ¡ un producto nuevo a tu catÃ¡logo de forma guiada.</p>
        </header>

        <FormularioAltaProductoWizard catalogoWebActivo={catalogoWebActivo} gastronomiaActivo={gastronomiaActivo} />
      </div>
    </div>
  );
}


