import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, ShieldAlert, PlusCircle, ArrowRight } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const metadata: Metadata = {
  title: "Panel de Administración — Nodexa",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
}

interface FilaCliente {
  estado_pago: boolean;
}

export default async function AdminDashboardPage() {
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

  // Cargar estadísticas básicas de clientes
  const { data: clientes } = await supabase
    .from("clientes")
    .select("estado_pago")
    .is("eliminado_en", null)
    .returns<FilaCliente[]>();

  const totalComercios = clientes?.length || 0;
  const activos = clientes?.filter((c) => c.estado_pago).length || 0;
  const suspendidos = totalComercios - activos;

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-1 border-b border-[#222A27] pb-4">
          <h1 className="text-2xl font-semibold text-slate-50 font-sans">Panel de Administración</h1>
          <p className="text-sm text-slate-400">
            Centro de operaciones y control administrativo de comercios de la plataforma Nodexa.
          </p>
        </header>

        {/* Tarjetas de Estadísticas */}
        <section className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-[#222A27] bg-[#111615] p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Comercios</span>
            <span className="text-3xl font-bold font-mono text-slate-100">{totalComercios}</span>
          </div>
          <div className="rounded-lg border border-[#222A27] bg-[#111615] p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activos / Regularizados</span>
            <span className="text-3xl font-bold font-mono text-[#16D39A]">{activos}</span>
          </div>
          <div className="rounded-lg border border-[#222A27] bg-[#111615] p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suspendidos / En Mora</span>
            <span className="text-3xl font-bold font-mono text-red-400">{suspendidos}</span>
          </div>
        </section>

        {/* Accesos Directos de Administración */}
        <section className="flex flex-col gap-4 mt-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Herramientas del Sistema</h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Alta de Comercio */}
            <Link
              href="/admin/clientes/nuevo"
              className="flex items-center justify-between p-5 rounded-lg border border-[#222A27] bg-[#111615] hover:bg-[#151c1a] hover:border-[#16D39A]/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#16D39A]/10 text-[#16D39A]">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-[#16D39A] transition-colors">Alta de Comercio</span>
                  <span className="text-xs text-slate-400">Registrar nuevo local y configurar módulos</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-[#16D39A] group-hover:translate-x-1 transition-all" />
            </Link>

            {/* Control de Morosidad */}
            <Link
              href="/admin/morosidad"
              className="flex items-center justify-between p-5 rounded-lg border border-[#222A27] bg-[#111615] hover:bg-[#151c1a] hover:border-red-500/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-500/10 text-red-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-red-400 transition-colors">Control de Morosidad</span>
                  <span className="text-xs text-slate-400">Suspender o reactivar abonos de comercios</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
            </Link>

            {/* Listado General */}
            <Link
              href="/admin/clientes"
              className="flex items-center justify-between p-5 rounded-lg border border-[#222A27] bg-[#111615] hover:bg-[#151c1a] hover:border-[#16D39A]/40 transition-all group sm:col-span-2"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1c2421] text-slate-300">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-[#16D39A] transition-colors">Listado General de Comercios</span>
                  <span className="text-xs text-slate-400">Gestionar límites SKU y acceder a configuraciones de clientes</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-[#16D39A] group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

