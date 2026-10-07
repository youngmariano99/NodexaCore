import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerClientePorId } from "@/repositories/clientes";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { FormularioEdicionClienteAdmin } from "./FormularioEdicionClienteAdmin";

export const metadata: Metadata = {
  title: "Editar Comercio — Panel NODEXA",
};

export const dynamic = "force-dynamic";

interface EditarComercioPageProps {
  params: Promise<{ clienteId: string }>;
}

export default async function EditarComercioPage({ params }: EditarComercioPageProps) {
  const { clienteId } = await params;
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
    .single<{ rol: RolUsuario }>();

  if (!solicitante || solicitante.rol !== "admin_nodexa") {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "comerciante"]}?error=NX-SYS-003`);
  }

  const resultado = await obtenerClientePorId(supabase, clienteId);

  if (!resultado.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#090B0B] px-6">
        <MensajeError codigo={resultado.error} className="max-w-md" />
        <Link
          href="/admin/clientes"
          className="inline-flex min-h-11 items-center rounded-md border border-[#222A27] bg-[#111615] px-4 text-sm text-slate-50 transition-colors duration-150 hover:border-[#16D39A] hover:text-[#16D39A]"
        >
          ← Volver al listado
        </Link>
      </div>
    );
  }

  const cliente = resultado.data;

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link href={`/admin/clientes/${clienteId}`} className="inline-flex min-h-11 w-fit items-center text-sm text-slate-400 hover:text-[#16D39A] transition-colors">
          ← Volver al detalle
        </Link>

        <header className="flex flex-col gap-1 border-b border-[#222A27] pb-4">
          <h1 className="text-2xl font-semibold text-slate-50">Editar configuración de {cliente.nombre_comercio}</h1>
        </header>

        <section className="rounded-md border border-[#222A27] bg-[#111615] p-6">
          <FormularioEdicionClienteAdmin clienteId={clienteId} clienteActual={cliente} />
        </section>
      </div>
    </div>
  );
}
