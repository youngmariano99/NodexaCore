import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";
import type { EstadoVenta } from "@/repositories/ventas";

export const metadata: Metadata = {
  title: "Historial de Ventas — Nodexa Core",
};

export const dynamic = "force-dynamic";

const LIMITE_FILAS_PAGINA = 10;
const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaVentaListado {
  venta_id: string;
  total: number;
  estado: EstadoVenta;
  creado_en: string;
  clientes_finales: {
    nombre: string;
  } | null;
}

function BadgeEstadoVenta({ estado }: { estado: EstadoVenta }) {
  if (estado === "confirmada") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
        Confirmada
      </span>
    );
  }
  if (estado === "devuelta_parcial") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
        Devuelta Parcial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
      Devuelta Total
    </span>
  );
}

export default async function HistorialVentasPage({
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

  if (!solicitante || (solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  const clienteId = solicitante.cliente_id;
  const desde = (paginaActual - 1) * LIMITE_FILAS_PAGINA;
  const hasta = desde + LIMITE_FILAS_PAGINA - 1;

  // Traer listado de ventas ordenado cronológicamente de forma paginada
  const { data: ventas, error, count } = await supabase
    .from("ventas")
    .select(
      `
      venta_id,
      total,
      estado,
      creado_en,
      clientes_finales (
        nombre
      )
      `,
      { count: "exact" }
    )
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false })
    .order("venta_id", { ascending: true })
    .range(desde, hasta);

  if (error || !ventas) {
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
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Historial de Ventas</h1>
          <p className="text-sm text-slate-400">
            {count ?? 0} venta{count === 1 ? "" : "s"} registrada{count === 1 ? "" : "s"} en tu comercio.
          </p>
        </header>

        {ventas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-[#222A27] bg-[#111615] px-6 py-12 text-center">
            <ShoppingBag className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-base text-slate-50">Todavía no registraste ninguna venta.</p>
            <p className="text-sm text-slate-400">
              Las ventas que confirmes en el Mostrador van a aparecer listadas acá.
            </p>
            <Link
              href="/mostrador"
              className="mt-2 flex min-h-11 items-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400"
            >
              Ir al Mostrador
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#222A27] bg-[#111615]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#222A27] text-slate-400">
                  <th className="px-4 py-3 font-medium">Fecha y Hora</th>
                  <th className="px-4 py-3 font-medium">ID Venta</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {(ventas as unknown as FilaVentaListado[]).map((venta) => (
                  <tr
                    key={venta.venta_id}
                    className="border-b border-[#222A27] last:border-b-0 hover:bg-slate-750/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {FORMATO_FECHA.format(new Date(venta.creado_en))}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {venta.venta_id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {venta.clientes_finales?.nombre || "Consumidor Final"}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeEstadoVenta estado={venta.estado} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-50">
                      {FORMATO_PRECIO.format(venta.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/ventas/${venta.venta_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
                      >
                        Ver desglose
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
            aria-label="Paginación del historial de ventas"
          >
            <Link
              href={`/ventas?page=${Math.max(1, paginaActual - 1)}`}
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
              href={`/ventas?page=${Math.min(totalPaginas, paginaActual + 1)}`}
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
