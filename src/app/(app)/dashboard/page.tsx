import { Info } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import {
  calcularPorcentajeUsoSku,
  debeMostrarAvisoLimiteSku,
} from "@/lib/dominio/productos/calcularPorcentajeUsoSku";
import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { contarProductosActivos } from "@/repositories/productosRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const metadata: Metadata = {
  title: "Dashboard — Nodexa Core",
};

/**
 * `crearClienteSupabaseServidor()` valida el entorno de servidor completo
 * (`obtenerEntornoServidor()` en src/lib/env.ts) ANTES de llegar a
 * `await cookies()` — es decir, antes de que Next.js pueda detectar por sí
 * solo que la ruta depende de una API dinámica. Sin este `force-dynamic`
 * explícito, Next puede intentar prerenderizar la página en build (según
 * cómo su analizador estático interprete el árbol de imports) y abortar
 * todo el build si faltan variables server-only no relacionadas con esta
 * página (ej. SUPABASE_SERVICE_ROLE_KEY, Upstash) en el entorno de CI, que
 * no carga `.env.local` — reproducido y confirmado en local corriendo
 * `next build` sin ese archivo.
 */
export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaCliente {
  limite_sku: number;
}

/**
 * Resumen operativo (docs/SITEMAP.md "/dashboard → Resumen operativo...
 * alertas de límite"). Esta estación cubre únicamente el cálculo y la banda
 * de aviso de límite de SKU (docs/ERRORS.md NX-PRD-008); el resto del
 * resumen (ventas del día, etc.) corresponde a estaciones futuras del
 * módulo Core Ventas, todavía sin construir.
 */
export default async function DashboardPage() {
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

  if (!solicitante || !solicitante.cliente_id || (solicitante.rol !== "comerciante" && solicitante.rol !== "empleado")) {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  const clienteId = solicitante.cliente_id;

  const [{ data: cliente, error: errorCliente }, conteoActivos] = await Promise.all([
    supabase.from("clientes").select("limite_sku").eq("cliente_id", clienteId).single<FilaCliente>(),
    contarProductosActivos(supabase, clienteId),
  ]);

  if (errorCliente || !cliente || !conteoActivos.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090B0B] px-6">
        <MensajeError codigo={!conteoActivos.ok ? conteoActivos.error : "NX-SYS-001"} className="max-w-md" />
      </div>
    );
  }

  const porcentajeUsoSku = calcularPorcentajeUsoSku(conteoActivos.data, cliente.limite_sku);
  const mostrarAvisoLimiteSku = debeMostrarAvisoLimiteSku(porcentajeUsoSku);

  return (
    <div className="flex flex-1 flex-col bg-[#090B0B] px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Dashboard</h1>
          <p className="text-sm text-slate-400">Resumen operativo de tu comercio.</p>
        </header>

        {mostrarAvisoLimiteSku ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md bg-[#111615] px-4 py-3 text-sm text-slate-400"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{obtenerMensajeError("NX-PRD-008")}</span>
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 rounded-md border border-[#222A27] bg-[#111615] p-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Productos activos</span>
            <span className="font-mono text-base text-slate-50">
              {conteoActivos.data.toLocaleString("es-AR")} / {cliente.limite_sku.toLocaleString("es-AR")}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Uso del catálogo</span>
            <span className="font-mono text-base text-slate-50">{porcentajeUsoSku}%</span>
          </div>
        </section>
      </div>
    </div>
  );
}
