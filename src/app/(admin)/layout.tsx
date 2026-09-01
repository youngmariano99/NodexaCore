import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Users, ShieldAlert, PlusCircle, LayoutDashboard } from "lucide-react";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (!solicitante || solicitante.rol !== "admin_nodexa") {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "comerciante"]}?error=NX-SYS-003`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#090B0B] text-slate-50 font-sans">
      <header className="sticky top-0 z-30 border-b border-[#222A27] bg-[#111615]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-100 hover:text-[#16D39A] transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#16D39A]/10 text-[#16D39A]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>NODEXA <span className="text-xs text-[#16D39A] font-mono font-normal">ADMIN</span></span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-slate-300 hover:bg-[#1c2421] hover:text-[#16D39A] transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Resumen
              </Link>
              <Link
                href="/admin/clientes"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-slate-300 hover:bg-[#1c2421] hover:text-[#16D39A] transition-colors"
              >
                <Users className="h-4 w-4" />
                Comercios
              </Link>
              <Link
                href="/admin/morosidad"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-slate-300 hover:bg-[#1c2421] hover:text-[#16D39A] transition-colors"
              >
                <ShieldAlert className="h-4 w-4" />
                Morosidad
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/clientes/nuevo"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#16D39A] px-4 text-xs font-semibold text-slate-950 hover:bg-[#14be8b] transition-colors duration-150"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nuevo Comercio</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
