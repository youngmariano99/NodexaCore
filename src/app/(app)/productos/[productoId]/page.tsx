import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioEdicionProducto } from "./formulario-edicion-producto";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const metadata: Metadata = {
  title: "Editar producto — Nodexa Core",
};

export const dynamic = "force-dynamic";

interface EditarProductoPageProps {
  params: Promise<{ productoId: string }>;
}

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaProductoDetalle {
  producto_id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number;
  eliminado_en: string | null;
}

export default async function EditarProductoPage({ params }: EditarProductoPageProps) {
  const { productoId } = await params;
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    redirect("/login?error=NX-SYS-002");
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante || !solicitante.cliente_id || (solicitante.rol !== "comerciante" && solicitante.rol !== "empleado")) {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  // Verificación de pertenencia a tenant (BOLA/IDOR protection)
  const verificacion = await verificarPertenenciaTenant(productoId, solicitante.cliente_id, {
    supabase,
    tabla: "productos",
    usuarioId: solicitante.usuario_id,
  });

  if (!verificacion.perteneceAlTenant) {
    redirect(`/productos?error=${verificacion.error ?? "NX-SYS-007"}`);
  }

  // Obtener los datos actuales del producto
  const { data: producto, error: errorProducto } = await supabase
    .from("productos")
    .select("producto_id, sku, nombre, descripcion, categoria, precio, eliminado_en")
    .eq("producto_id", productoId)
    .maybeSingle<FilaProductoDetalle>();

  if (errorProducto || !producto) {
    redirect("/productos?error=NX-SYS-004");
  }

  if (producto.eliminado_en) {
    redirect("/productos?error=NX-PRD-006");
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-[#090B0B] px-6 py-10 text-[#F3F5F4]">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#F3F5F4]">Editar producto</h1>
          <p className="text-sm text-[#A6AEAA]">Modificá los datos del producto seleccionado.</p>
        </header>

        <FormularioEdicionProducto producto={producto} />
      </div>
    </div>
  );
}
