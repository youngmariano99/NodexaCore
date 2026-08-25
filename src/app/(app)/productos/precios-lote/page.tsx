import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { EditorPreciosMasivos } from "./EditorPreciosMasivos";

export const metadata: Metadata = {
  title: "Ajuste Masivo de Precios — Nodexa Core",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

export default async function PreciosLotePage() {
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

  // Realizar consultas en paralelo para poblar selectores y conteos
  const [
    resTodos,
    resCatIds,
    resBrandIds,
    resProvIds,
    resCategorias,
    resMarcas,
    resProveedores,
  ] = await Promise.all([
    supabase
      .from("productos")
      .select("producto_id", { count: "exact", head: true })
      .eq("cliente_id", clienteId)
      .is("eliminado_en", null),
    supabase
      .from("productos")
      .select("categoria_id")
      .eq("cliente_id", clienteId)
      .is("eliminado_en", null)
      .not("categoria_id", "is", null),
    supabase
      .from("productos")
      .select("marca_id")
      .eq("cliente_id", clienteId)
      .is("eliminado_en", null)
      .not("marca_id", "is", null),
    supabase
      .from("productos")
      .select("proveedor_id")
      .eq("cliente_id", clienteId)
      .is("eliminado_en", null)
      .not("proveedor_id", "is", null),
    supabase
      .from("categorias")
      .select("categoria_id, nombre")
      .eq("cliente_id", clienteId)
      .is("eliminado_en", null)
      .order("nombre", { ascending: true }),
    supabase
      .from("marcas")
      .select("marca_id, nombre")
      .eq("cliente_id", clienteId)
      .is("eliminado_en", null)
      .order("nombre", { ascending: true }),
    supabase
      .from("proveedores")
      .select("proveedor_id, nombre")
      .eq("cliente_id", clienteId)
      .is("eliminado_en", null)
      .order("nombre", { ascending: true }),
  ]);

  if (
    resTodos.error ||
    resCatIds.error ||
    resBrandIds.error ||
    resProvIds.error ||
    resCategorias.error ||
    resMarcas.error ||
    resProveedores.error
  ) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  // Agrupar conteos
  const conteoTodos = resTodos.count ?? 0;

  const conteoCategorias: Record<string, number> = {};
  resCatIds.data?.forEach((p) => {
    if (p.categoria_id) {
      conteoCategorias[p.categoria_id] = (conteoCategorias[p.categoria_id] ?? 0) + 1;
    }
  });

  const conteoMarcas: Record<string, number> = {};
  resBrandIds.data?.forEach((p) => {
    if (p.marca_id) {
      conteoMarcas[p.marca_id] = (conteoMarcas[p.marca_id] ?? 0) + 1;
    }
  });

  const conteoProveedores: Record<string, number> = {};
  resProvIds.data?.forEach((p) => {
    if (p.proveedor_id) {
      conteoProveedores[p.proveedor_id] = (conteoProveedores[p.proveedor_id] ?? 0) + 1;
    }
  });

  // Mapear estructuras limpias para los selectores
  const categoriasMap = (resCategorias.data ?? []).map((c) => ({
    id: c.categoria_id,
    nombre: c.nombre,
  }));

  const marcasMap = (resMarcas.data ?? []).map((m) => ({
    id: m.marca_id,
    nombre: m.nombre,
  }));

  const proveedoresMap = (resProveedores.data ?? []).map((p) => ({
    id: p.proveedor_id,
    nombre: p.nombre,
  }));

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <EditorPreciosMasivos
          categorias={categoriasMap}
          marcas={marcasMap}
          proveedores={proveedoresMap}
          conteoTodos={conteoTodos}
          conteoCategorias={conteoCategorias}
          conteoMarcas={conteoMarcas}
          conteoProveedores={conteoProveedores}
        />
      </div>
    </div>
  );
}
