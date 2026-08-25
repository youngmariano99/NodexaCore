import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RefreshCcw, ArrowRight } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const metadata: Metadata = {
  title: "Devoluciones — Nodexa Core",
};

export const dynamic = "force-dynamic";

const LIMITE_FILAS_PAGINA = 10;
const FORMATO_MONEDA = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaDevolucionListado {
  devolucion_id: string;
  venta_id: string;
  motivo: string;
  estado: string;
  monto_total: number;
  creado_en: string;
  usuarios: {
    nombre: string;
  } | null;
  notas_credito: {
    numero_comprobante: string;
  } | null;
}

export default async function DevolucionesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const parametros = await searchParams;
  const paginaActual = Math.max(1, Number.parseInt(parametros.page ?? "1", 10) || 1);

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

  // Devoluciones es exclusivo de comerciantes
  if (!solicitante || solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10 text-slate-50">
        <div className="flex w-full max-w-md flex-col gap-4">
          <MensajeError codigo="NX-SYS-003" className="w-full" />
        </div>
      </div>
    );
  }

  const clienteId = solicitante.cliente_id;

  // Verificar módulo de devoluciones activo para este cliente
  const { data: moduloDevoluciones } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "devoluciones")
    .maybeSingle<{ activo: boolean }>();

  if (!moduloDevoluciones?.activo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10 text-slate-50">
        <div className="flex w-full max-w-md flex-col gap-4">
          <MensajeError codigo="NX-DEV-001" className="w-full" />
        </div>
      </div>
    );
  }

  const desde = (paginaActual - 1) * LIMITE_FILAS_PAGINA;
  const hasta = desde + LIMITE_FILAS_PAGINA - 1;

  // Traer listado de devoluciones paginado, uniendo con cajero (usuarios) y nota de crédito
  const { data: devoluciones, error, count } = await supabase
    .from("devoluciones")
    .select(
      `
      devolucion_id,
      venta_id,
      motivo,
      estado,
      monto_total,
      creado_en,
      usuarios (
        nombre
      ),
      notas_credito (
        numero_comprobante
      )
      `,
      { count: "exact" }
    )
    .eq("cliente_id", clienteId)
    .order("creado_en", { ascending: false })
    .order("devolucion_id", { ascending: true })
    .range(desde, hasta);

  if (error || !devoluciones) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / LIMITE_FILAS_PAGINA));

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-row justify-between items-start gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-slate-50">Devoluciones</h1>
            <p className="text-sm text-slate-400">
              {count ?? 0} devolución{count === 1 ? "" : "es"} procesada{count === 1 ? "" : "s"} en tu comercio.
            </p>
          </div>
          <Link
            href="/ventas"
            className="flex min-h-11 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400"
          >
            Nueva Devolución
          </Link>
        </header>

        {devoluciones.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-[#222A27] bg-[#111615] px-6 py-12 text-center">
            <RefreshCcw className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-base text-slate-50">Todavía no se registraron devoluciones.</p>
            <p className="text-sm text-slate-400">
              Para iniciar una devolución, hacé clic en el botón &quot;Nueva Devolución&quot; o buscala en el historial de ventas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#222A27] bg-[#111615]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#222A27] text-slate-400">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Nº Nota de Crédito</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Venta Ref.</th>
                  <th className="px-4 py-3 font-medium">Monto Devuelto</th>
                  <th className="px-4 py-3 font-medium text-right">Detalle Venta</th>
                </tr>
              </thead>
              <tbody>
                {(devoluciones as unknown as FilaDevolucionListado[]).map((devolucion) => (
                  <tr
                    key={devolucion.devolucion_id}
                    className="border-b border-[#222A27] last:border-b-0 hover:bg-slate-750/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {FORMATO_FECHA.format(new Date(devolucion.creado_en))}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-200">
                      {devolucion.notas_credito?.numero_comprobante || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-slate-200 max-w-xs truncate">
                      {devolucion.motivo}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {devolucion.venta_id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {FORMATO_MONEDA.format(devolucion.monto_total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/ventas/${devolucion.venta_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
                      >
                        Ver Venta
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <nav
            className="flex items-center justify-between text-sm text-slate-400"
            aria-label="Paginación de devoluciones"
          >
            <Link
              href={`/devoluciones?page=${Math.max(1, paginaActual - 1)}`}
              aria-disabled={paginaActual <= 1}
              className={`flex min-h-11 items-center rounded-md border border-[#222A27] px-4 transition-colors duration-150 ${
                paginaActual <= 1 ? "pointer-events-none opacity-40" : "hover:border-blue-500 hover:text-slate-50"
              }`}
            >
              ← Anterior
            </Link>
            <span className="font-mono text-xs">
              Página {paginaActual} de {totalPaginas}
            </span>
            <Link
              href={`/devoluciones?page=${Math.min(totalPaginas, paginaActual + 1)}`}
              aria-disabled={paginaActual >= totalPaginas}
              className={`flex min-h-11 items-center rounded-md border border-[#222A27] px-4 transition-colors duration-150 ${
                paginaActual >= totalPaginas ? "pointer-events-none opacity-40" : "hover:border-blue-500 hover:text-slate-50"
              }`}
            >
              Siguiente →
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
