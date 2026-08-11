import { PackagePlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { WidgetConsumo } from "@/components/facturacion/WidgetConsumo";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { calcularPorcentajeUsoSku } from "@/lib/dominio/productos/calcularPorcentajeUsoSku";
import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerUsoCuotaIA } from "@/repositories/cargasIaRepository";
import { obtenerPorcentajeUsoSku } from "@/repositories/productosRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const metadata: Metadata = {
  title: "Facturación — Nodexa Core",
};

/**
 * `crearClienteSupabaseServidor()` valida todo el entorno server-only antes
 * de `await cookies()`, así que Next puede intentar prerenderizar esta
 * página en build sin este marcador explícito — mismo hallazgo ya aplicado
 * en `dashboard/page.tsx` y `productos/carga-ia/page.tsx`.
 */
export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaModuloCargaIa {
  activo: boolean;
}

/**
 * Vista de consumo actual frente a los límites contratados (docs/SITEMAP.md
 * "/configuracion/facturacion"; docs/ROLES.md fila "Facturación /
 * estado_pago": exclusiva de `comerciante` — a diferencia de `/dashboard` y
 * `/productos/carga-ia`, que permiten también a `empleado`, acá el checklist
 * pide explícitamente bloquear a `empleado` (Criterio de Aceptación 4)). El
 * widget de SKU es Core (siempre visible, sin gate de módulo); el de Cargas
 * con IA solo se muestra si `tenant_modules.carga_ia` está activo, mismo
 * criterio ya usado en `/productos/carga-ia` (Sprint 7).
 */
export default async function FacturacionPage() {
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

  if (!solicitante || !solicitante.cliente_id || solicitante.rol !== "comerciante") {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  const clienteId = solicitante.cliente_id;

  const [usoSku, { data: moduloCargaIa }] = await Promise.all([
    obtenerPorcentajeUsoSku(supabase, clienteId),
    supabase
      .from("tenant_modules")
      .select("activo")
      .eq("cliente_id", clienteId)
      .eq("modulo", "carga_ia")
      .maybeSingle<FilaModuloCargaIa>(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Facturación</h1>
          <p className="text-sm text-slate-400">Uso actual frente a los límites contratados de tu plan.</p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {usoSku.ok ? (
            <WidgetConsumo
              etiqueta="Productos activos"
              usado={usoSku.data.activos}
              limite={usoSku.data.limiteSku}
              porcentaje={usoSku.data.porcentaje}
            />
          ) : (
            <MensajeError codigo={usoSku.error} className="max-w-md" />
          )}

          {moduloCargaIa?.activo ? (
            <SeccionCuotaIa supabase={supabase} clienteId={clienteId} />
          ) : (
            <div className="flex flex-col gap-4 rounded-md border border-slate-700 bg-slate-800 p-6">
              <div className="flex items-center gap-3 text-blue-500">
                <PackagePlus className="h-6 w-6 shrink-0" aria-hidden="true" />
                <p className="text-sm text-slate-400">{obtenerMensajeError("NX-IA-001")}</p>
              </div>
              <Link
                href="/configuracion/modulos"
                className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-blue-500 px-4 text-sm font-medium text-slate-50 transition-colors duration-150 hover:bg-blue-500/90"
              >
                Ver módulos disponibles
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

async function SeccionCuotaIa({
  supabase,
  clienteId,
}: {
  supabase: Awaited<ReturnType<typeof crearClienteSupabaseServidor>>;
  clienteId: string;
}) {
  const uso = await obtenerUsoCuotaIA(supabase, clienteId);

  if (!uso.ok) {
    return <MensajeError codigo={uso.error} className="max-w-md" />;
  }

  const porcentajeUsoIa = calcularPorcentajeUsoSku(uso.data.usadas, uso.data.cuotaMensualIa);

  return (
    <WidgetConsumo
      etiqueta="Cargas con IA usadas este mes"
      usado={uso.data.usadas}
      limite={uso.data.cuotaMensualIa}
      porcentaje={porcentajeUsoIa}
    />
  );
}
