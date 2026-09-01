import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { listarClientesPaginado } from "@/repositories/clientes";
import { NOMBRE_MODULO_NODEXA } from "@/services/admin/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const metadata: Metadata = {
  title: "Comercios — Panel NODEXA",
};

/**
 * `crearClienteSupabaseServidor()` valida el entorno de servidor completo
 * antes de llegar a `await cookies()`, antes de que Next pueda detectar por
 * sí solo que la ruta depende de una API dinámica — sin este marcador
 * explícito, un build sin las variables server-only no relacionadas con
 * esta página (ej. Upstash) puede abortar en CI. Ver detalle en
 * app/(app)/dashboard/page.tsx, donde se reprodujo y confirmó el problema.
 */
export const dynamic = "force-dynamic";

interface AdminClientesPageProps {
  searchParams: Promise<{ page?: string }>;
}

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
}

/**
 * Listado paginado de comercios (docs/SITEMAP.md: "/admin/clientes → Listado
 * de comercios dados de alta"). El proxy global (src/proxy.ts) ya bloquea
 * `/admin/:path*` a quien no tenga `rol = admin_nodexa`, redirigiendo con
 * `?error=NX-SYS-003`; el chequeo acá es defensa en profundidad
 * (docs/ROLES.md §3.8), mismo criterio que las Server Actions de
 * src/services/admin/.
 */
export default async function AdminClientesPage({ searchParams }: AdminClientesPageProps) {
  const { page } = await searchParams;
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

  const paginaActual = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const resultado = await listarClientesPaginado(supabase, paginaActual);

  if (!resultado.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6">
        <MensajeError codigo={resultado.error} className="max-w-md" />
      </div>
    );
  }

  const { clientes, total, porPagina } = resultado.data;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1 border-b border-[#222A27] pb-4">
          <h1 className="text-2xl font-semibold text-slate-50">Comercios</h1>
          <p className="text-sm text-slate-400">
            {total} comercio{total === 1 ? "" : "s"} registrado{total === 1 ? "" : "s"} en NODEXA.
          </p>
        </header>

        {clientes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[#222A27] bg-[#111615] px-6 py-12 text-center">
            <p className="text-base text-slate-50">Todavía no hay comercios dados de alta.</p>
            <p className="text-sm text-slate-400">
              Los comercios que se registren van a aparecer acá, ej. Almacén Don Pedro.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#222A27] bg-[#111615]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#222A27] text-slate-400 bg-[#151c1a]">
                  <th className="px-4 py-3 font-medium">Comercio</th>
                  <th className="px-4 py-3 font-medium">Estado de pago</th>
                  <th className="px-4 py-3 font-medium">Límite de SKU</th>
                  <th className="px-4 py-3 font-medium">Módulos activos</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => {
                  const modulosActivos = cliente.tenant_modules.filter((tenantModule) => tenantModule.activo);

                  return (
                    <tr key={cliente.cliente_id} className="border-b border-[#222A27] last:border-b-0 hover:bg-[#151c1a] transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/clientes/${cliente.cliente_id}`}
                          className="inline-flex min-h-11 items-center font-medium text-slate-50 underline-offset-4 hover:text-[#16D39A] hover:underline"
                        >
                          {cliente.nombre_comercio}
                        </Link>
                        <p className="font-mono text-xs text-slate-400">{cliente.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        {cliente.estado_pago ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                            Al día
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Pago suspendido
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-50">
                        {cliente.limite_sku.toLocaleString("es-AR")}
                      </td>
                      <td className="px-4 py-3">
                        {modulosActivos.length === 0 ? (
                          <span className="text-slate-400">Sin módulos activos</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {modulosActivos.map((tenantModule) => (
                              <span
                                key={tenantModule.modulo}
                                className="rounded-full border border-[#222A27] bg-[#1c2421] px-2.5 py-1 text-xs text-slate-200"
                              >
                                {NOMBRE_MODULO_NODEXA[tenantModule.modulo]}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 ? (
          <nav className="flex items-center justify-between text-sm text-slate-400" aria-label="Paginación de comercios">
            <Link
              href={`/admin/clientes?page=${Math.max(1, paginaActual - 1)}`}
              aria-disabled={paginaActual <= 1}
              className={`flex min-h-11 items-center rounded-md border border-[#222A27] bg-[#111615] px-4 transition-colors duration-150 ${
                paginaActual <= 1 ? "pointer-events-none opacity-40" : "hover:border-[#16D39A] hover:text-[#16D39A]"
              }`}
            >
              ← Anterior
            </Link>
            <span className="font-mono">
              Página {paginaActual} de {totalPaginas}
            </span>
            <Link
              href={`/admin/clientes?page=${Math.min(totalPaginas, paginaActual + 1)}`}
              aria-disabled={paginaActual >= totalPaginas}
              className={`flex min-h-11 items-center rounded-md border border-[#222A27] bg-[#111615] px-4 transition-colors duration-150 ${
                paginaActual >= totalPaginas
                  ? "pointer-events-none opacity-40"
                  : "hover:border-[#16D39A] hover:text-[#16D39A]"
              }`}
            >
              Siguiente →
            </Link>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

