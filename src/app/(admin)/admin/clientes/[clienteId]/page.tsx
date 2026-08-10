import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerClientePorId } from "@/repositories/clientes";
import { NOMBRE_MODULO_NODEXA } from "@/services/admin/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const metadata: Metadata = {
  title: "Detalle de comercio — Panel NODEXA",
};

/**
 * Ver app/(app)/dashboard/page.tsx: `crearClienteSupabaseServidor()` valida
 * el entorno de servidor completo antes de `await cookies()`, así que un
 * build sin variables server-only no relacionadas (ej. Upstash) puede
 * abortar en CI si Next intenta prerenderizar esta página.
 */
export const dynamic = "force-dynamic";

interface DetalleComercioPageProps {
  params: Promise<{ clienteId: string }>;
}

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

/**
 * Detalle de un comercio (docs/SITEMAP.md: "Detalle: estado_pago,
 * tenant_modules, limite_sku"). Mismo chequeo de rol en profundidad que el
 * listado — el proxy global ya corta `/admin/:path*` a nivel de middleware.
 */
export default async function DetalleComercioPage({ params }: DetalleComercioPageProps) {
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
    .single<FilaUsuarioSolicitante>();

  if (!solicitante || solicitante.rol !== "admin_nodexa") {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "comerciante"]}?error=NX-SYS-003`);
  }

  const resultado = await obtenerClientePorId(supabase, clienteId);

  if (!resultado.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-950 px-6">
        <MensajeError codigo={resultado.error} className="max-w-md" />
        <Link
          href="/admin/clientes"
          className="inline-flex min-h-11 items-center rounded-md border border-slate-700 px-4 text-sm text-slate-50 transition-colors duration-150 hover:border-blue-500"
        >
          ← Volver al listado
        </Link>
      </div>
    );
  }

  const cliente = resultado.data;

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link href="/admin/clientes" className="inline-flex min-h-11 w-fit items-center text-sm text-slate-400 hover:text-blue-500">
          ← Volver al listado de comercios
        </Link>

        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">{cliente.nombre_comercio}</h1>
          <p className="font-mono text-sm text-slate-400">{cliente.slug}</p>
        </header>

        <section className="grid grid-cols-1 gap-4 rounded-md border border-slate-700 bg-slate-800 p-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Estado de pago</span>
            {cliente.estado_pago ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Al día
              </span>
            ) : (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Pago suspendido
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Límite de SKU</span>
            <span className="font-mono text-base text-slate-50">{cliente.limite_sku.toLocaleString("es-AR")}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Packs de ampliación contratados</span>
            <span className="font-mono text-base text-slate-50">{cliente.packs_sku_contratados}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Teléfono de WhatsApp</span>
            <span className="font-mono text-base text-slate-50">{cliente.telefono_whatsapp}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Dominio personalizado</span>
            <span className="font-mono text-base text-slate-50">{cliente.dominio_personalizado ?? "—"}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Alta en NODEXA</span>
            <span className="text-base text-slate-50">{FORMATO_FECHA.format(new Date(cliente.creado_en))}</span>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-md border border-slate-700 bg-slate-800 p-6">
          <h2 className="text-base font-semibold text-slate-50">Módulos contratados</h2>
          {cliente.tenant_modules.length === 0 ? (
            <p className="text-sm text-slate-400">Este comercio todavía no tiene módulos activados.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cliente.tenant_modules.map((tenantModule) => (
                <li
                  key={tenantModule.modulo}
                  className="flex items-center justify-between rounded-md bg-slate-700 px-4 py-3 text-sm"
                >
                  <span className="text-slate-50">{NOMBRE_MODULO_NODEXA[tenantModule.modulo]}</span>
                  <span
                    className={`font-medium ${tenantModule.activo ? "text-emerald-500" : "text-slate-400"}`}
                  >
                    {tenantModule.activo ? "Activo" : "Desactivado"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
