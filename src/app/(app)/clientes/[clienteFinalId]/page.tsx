import { ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import {
  obtenerMovimientosCuentaCorrientePaginados,
  type TipoMovimientoCuenta,
} from "@/repositories/movimientosCuentaCorrienteRepository";
import { verificarPertenenciaTenant } from "@/repositories/base/verificarPertenenciaTenant";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const metadata: Metadata = {
  title: "Estado de cuenta — Nodexa Core",
};

/**
 * `crearClienteSupabaseServidor()` valida el entorno de servidor completo
 * antes de `await cookies()`, así que un build sin variables server-only no
 * relacionadas con esta página puede abortar en CI si Next intenta
 * prerenderizarla — mismo hallazgo ya documentado en `dashboard/page.tsx`.
 */
export const dynamic = "force-dynamic";

interface EstadoCuentaCorrientePageProps {
  params: Promise<{ clienteFinalId: string }>;
  searchParams: Promise<{ page?: string }>;
}

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaClienteFinalDetalle {
  nombre: string;
  telefono: string | null;
  saldo_deudor: number;
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });
const FORMATO_MONEDA = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function EtiquetaTipoMovimiento({ tipo }: { tipo: TipoMovimientoCuenta }) {
  if (tipo === "pago") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
        Pago
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-400">
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      Cargo
    </span>
  );
}

/**
 * Estado de cuenta corriente de un cliente final (docs/SITEMAP.md
 * "/clientes/[clienteFinalId] → Historial de movimientos"; docs/ROLES.md §2
 * fila "clientes_finales": `L` para comerciante y empleado). Guard IDOR/BOLA
 * (Criterio de Aceptación 4) vía `verificarPertenenciaTenant` antes de leer
 * nada del cliente final o sus movimientos: un `cliente_final_id` de otro
 * comercio corta acá con `NX-SYS-007` sin distinguir "no existe" de "es
 * ajeno" (docs/ROLES.md §3.8) — la política RLS de `SELECT` (vía
 * subconsulta a `clientes_finales`) sigue siendo la autoridad real de todas
 * formas.
 *
 * `saldo_deudor` (Paso 3, Criterio de Aceptación 2) se muestra tal cual
 * viene de `clientes_finales`, sin recalcularlo sumando/restando los
 * movimientos acá: por construcción ya es el resultado exacto de esa cuenta
 * — `fn_incrementar_saldo_deudor` y `fn_registrar_pago_cuenta_corriente`
 * (estaciones anteriores) lo actualizan atómicamente junto con cada
 * movimiento, nunca por separado. Recalcularlo en esta vista sería una
 * fuente de verdad duplicada, no una verificación real.
 */
export default async function EstadoCuentaCorrientePage({ params, searchParams }: EstadoCuentaCorrientePageProps) {
  const { clienteFinalId } = await params;
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
    .select("usuario_id, rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (!solicitante || !solicitante.cliente_id || (solicitante.rol !== "comerciante" && solicitante.rol !== "empleado")) {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  const verificacion = await verificarPertenenciaTenant(clienteFinalId, solicitante.cliente_id, {
    supabase,
    tabla: "clientes_finales",
    usuarioId: solicitante.usuario_id,
  });

  if (!verificacion.perteneceAlTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-950 px-6">
        <MensajeError codigo={verificacion.error ?? "NX-SYS-007"} className="max-w-md" />
        <Link
          href="/clientes"
          className="inline-flex min-h-11 items-center rounded-md border border-slate-700 px-4 text-sm text-slate-50 transition-colors duration-150 hover:border-blue-500"
        >
          ← Volver al listado de clientes
        </Link>
      </div>
    );
  }

  const { data: clienteFinal, error: errorClienteFinal } = await supabase
    .from("clientes_finales")
    .select("nombre, telefono, saldo_deudor")
    .eq("cliente_final_id", clienteFinalId)
    .single<FilaClienteFinalDetalle>();

  if (errorClienteFinal || !clienteFinal) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6">
        <MensajeError codigo="NX-FIA-002" className="max-w-md" />
      </div>
    );
  }

  const paginaActual = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const resultado = await obtenerMovimientosCuentaCorrientePaginados(supabase, clienteFinalId, paginaActual);

  if (!resultado.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6">
        <MensajeError codigo={resultado.error} className="max-w-md" />
      </div>
    );
  }

  const { movimientos, total, porPagina } = resultado.data;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Link
          href="/clientes"
          className="inline-flex min-h-11 w-fit items-center text-sm text-slate-400 hover:text-blue-500"
        >
          ← Volver al listado de clientes
        </Link>

        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">{clienteFinal.nombre}</h1>
          <p className="text-sm text-slate-400">{clienteFinal.telefono ?? "Sin teléfono registrado"}</p>
        </header>

        <section className="flex flex-col gap-1 rounded-md border border-slate-700 bg-slate-800 p-6">
          <span className="text-xs text-slate-400">Saldo deudor actual</span>
          <span className="font-mono text-3xl text-slate-50">${FORMATO_MONEDA.format(clienteFinal.saldo_deudor)}</span>
        </section>

        {movimientos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-slate-700 bg-slate-800 px-6 py-12 text-center">
            <Receipt className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-base text-slate-50">Todavía no hay movimientos de cuenta corriente.</p>
            <p className="text-sm text-slate-400">Los cargos por venta y los pagos que registres van a aparecer acá.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-700 bg-slate-800">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Movimiento</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((movimiento) => (
                  <tr
                    key={movimiento.movimiento_cc_id}
                    className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {FORMATO_FECHA.format(new Date(movimiento.creado_en))}
                    </td>
                    <td className="px-4 py-3">
                      <EtiquetaTipoMovimiento tipo={movimiento.tipo} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-50">
                      {movimiento.tipo === "pago" ? "−" : "+"}${FORMATO_MONEDA.format(movimiento.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 ? (
          <nav
            className="flex items-center justify-between text-sm text-slate-400"
            aria-label="Paginación de movimientos de cuenta corriente"
          >
            <Link
              href={`/clientes/${clienteFinalId}?page=${Math.max(1, paginaActual - 1)}`}
              aria-disabled={paginaActual <= 1}
              className={`flex min-h-11 items-center rounded-md border border-slate-700 px-4 transition-colors duration-150 ${
                paginaActual <= 1 ? "pointer-events-none opacity-40" : "hover:border-blue-500 hover:text-slate-50"
              }`}
            >
              ← Anterior
            </Link>
            <span className="font-mono">
              Página {paginaActual} de {totalPaginas}
            </span>
            <Link
              href={`/clientes/${clienteFinalId}?page=${Math.min(totalPaginas, paginaActual + 1)}`}
              aria-disabled={paginaActual >= totalPaginas}
              className={`flex min-h-11 items-center rounded-md border border-slate-700 px-4 transition-colors duration-150 ${
                paginaActual >= totalPaginas
                  ? "pointer-events-none opacity-40"
                  : "hover:border-blue-500 hover:text-slate-50"
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
