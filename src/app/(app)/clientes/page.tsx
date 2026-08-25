import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, ArrowRight } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { FormularioCrearClienteFinal } from "./FormularioCrearClienteFinal";

export const metadata: Metadata = {
  title: "Cuentas Corrientes — Nodexa Core",
};

export const dynamic = "force-dynamic";

const LIMITE_FILAS_PAGINA = 10;
const FORMATO_MONEDA = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaClienteListado {
  cliente_final_id: string;
  nombre: string;
  telefono: string | null;
  saldo_deudor: number;
}

export default async function ClientesPage({
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

  // Verificar que el módulo fiados está activo para este cliente
  const { data: moduloFiados } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "fiados")
    .maybeSingle<{ activo: boolean }>();

  if (!moduloFiados?.activo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6 py-10 text-slate-50">
        <div className="flex w-full max-w-md flex-col gap-4">
          <MensajeError codigo="NX-FIA-001" className="w-full" />
        </div>
      </div>
    );
  }

  const desde = (paginaActual - 1) * LIMITE_FILAS_PAGINA;
  const hasta = desde + LIMITE_FILAS_PAGINA - 1;

  // Traer listado de clientes final paginado
  const { data: clientes, error, count } = await supabase
    .from("clientes_finales")
    .select("cliente_final_id, nombre, telefono, saldo_deudor", { count: "exact" })
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .order("nombre", { ascending: true })
    .range(desde, hasta);

  if (error || !clientes) {
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
            <h1 className="text-2xl font-semibold text-slate-50">Cuentas Corrientes</h1>
            <p className="text-sm text-slate-400">
              {count ?? 0} cliente{count === 1 ? "" : "s"} registrado{count === 1 ? "" : "s"} en el sistema de fiados.
            </p>
          </div>
          <FormularioCrearClienteFinal />
        </header>

        {clientes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-[#222A27] bg-[#111615] px-6 py-12 text-center">
            <Users className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-base text-slate-50">No hay clientes registrados en cuentas corrientes.</p>
            <p className="text-sm text-slate-400">
              Registrá tus clientes recurrentes para permitirles realizar compras fiadas a cuenta corriente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#222A27] bg-[#111615]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#222A27] text-slate-400">
                  <th className="px-4 py-3 font-medium">Nombre completo</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Saldo deudor</th>
                  <th className="px-4 py-3 font-medium text-right">Estado de cuenta</th>
                </tr>
              </thead>
              <tbody>
                {(clientes as unknown as FilaClienteListado[]).map((cliente) => (
                  <tr
                    key={cliente.cliente_final_id}
                    className="border-b border-[#222A27] last:border-b-0 hover:bg-slate-750/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-200 font-medium">
                      {cliente.nombre}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {cliente.telefono || "Sin teléfono"}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${cliente.saldo_deudor > 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {FORMATO_MONEDA.format(cliente.saldo_deudor)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/clientes/${cliente.cliente_final_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
                      >
                        Ver movimientos
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
            aria-label="Paginación del listado de clientes"
          >
            <Link
              href={`/clientes?page=${Math.max(1, paginaActual - 1)}`}
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
              href={`/clientes?page=${Math.min(totalPaginas, paginaActual + 1)}`}
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
