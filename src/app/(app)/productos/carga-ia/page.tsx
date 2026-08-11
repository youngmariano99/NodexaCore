import { PackagePlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioCargaIa } from "@/app/(app)/productos/carga-ia/FormularioCargaIa";
import { ContadorCuotaIA } from "@/components/productos/ContadorCuotaIA";
import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { cuotaIaAgotada } from "@/lib/dominio/cargaIa/validarCuotaIa";
import { obtenerMensajeError } from "@/lib/errores/catalogo";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerUsoCuotaIA } from "@/repositories/cargasIaRepository";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const metadata: Metadata = {
  title: "Carga con IA — Nodexa Core",
};

/**
 * `crearClienteSupabaseServidor()` valida todo el entorno server-only antes
 * de `await cookies()`, así que Next puede intentar prerenderizar esta
 * página en build sin ese marcador explícito — mismo hallazgo y mismo fix ya
 * aplicado en `dashboard/page.tsx`, `admin/clientes/page.tsx` y
 * `admin/clientes/[clienteId]/page.tsx`.
 */
export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaModuloCargaIa {
  activo: boolean;
}

interface FilaClienteCuotaIa {
  ia_consultas_usadas: number;
  cuota_mensual_ia: number;
}

/**
 * Página de Carga con IA: contador de cuota (docs/SITEMAP.md "Componente de
 * contador de cuota de IA") + formulario de subida (docs/BACKLOG.md
 * "Bloqueo y oferta de recarga al agotar la cuota de IA", Paso 3-4). Sin el
 * módulo `carga_ia` activo, no se muestra ninguno de los dos — se indica que
 * el módulo no está contratado (`NX-IA-001`), mismo criterio que el gate de
 * `/api/carga-ia` (Route Handler de procesamiento de imagen).
 */
export default async function CargaIaPage() {
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

  const { data: moduloCargaIa } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "carga_ia")
    .maybeSingle<FilaModuloCargaIa>();

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-50">Carga con IA</h1>
          <p className="text-sm text-slate-400">Subí la foto de una etiqueta y completamos el producto por vos.</p>
        </header>

        {!moduloCargaIa?.activo ? (
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
        ) : (
          <CargaIaSeccion supabase={supabase} clienteId={clienteId} />
        )}
      </div>
    </div>
  );
}

async function CargaIaSeccion({
  supabase,
  clienteId,
}: {
  supabase: Awaited<ReturnType<typeof crearClienteSupabaseServidor>>;
  clienteId: string;
}) {
  const [uso, { data: clienteCuota, error: errorClienteCuota }] = await Promise.all([
    obtenerUsoCuotaIA(supabase, clienteId),
    supabase
      .from("clientes")
      .select("ia_consultas_usadas, cuota_mensual_ia")
      .eq("cliente_id", clienteId)
      .single<FilaClienteCuotaIa>(),
  ]);

  if (!uso.ok || errorClienteCuota || !clienteCuota) {
    return <MensajeError codigo={!uso.ok ? uso.error : "NX-SYS-001"} className="max-w-md" />;
  }

  return (
    <>
      <ContadorCuotaIA usadas={uso.data.usadas} cuotaMensualIa={uso.data.cuotaMensualIa} />
      <FormularioCargaIa
        cuotaAgotadaInicial={cuotaIaAgotada(clienteCuota.ia_consultas_usadas, clienteCuota.cuota_mensual_ia)}
      />
    </>
  );
}
