import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";
import type { FilaProveedor } from "@/repositories/proveedoresRepository";

import { FormularioProveedores } from "./FormularioProveedores";

export const metadata: Metadata = {
  title: "Proveedores — Nodexa Core",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

export default async function ProveedoresPage() {
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

  if (!solicitante || (solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  const clienteId = solicitante.cliente_id;

  // Traer listado de proveedores activos
  const { data: proveedores, error } = await supabase
    .from("proveedores")
    .select("proveedor_id, cliente_id, nombre, contacto, dias_demora, creado_en, eliminado_en")
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .order("nombre", { ascending: true });

  if (error || !proveedores) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <FormularioProveedores proveedores={proveedores as unknown as FilaProveedor[]} />
      </div>
    </div>
  );
}
