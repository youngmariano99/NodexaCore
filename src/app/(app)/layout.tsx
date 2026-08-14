import { redirect } from "next/navigation";
import { QueryProvider } from "@/components/providers/query-provider";
import { AppLayoutClient } from "@/components/layout/AppLayoutClient";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import type { RolUsuario } from "@/services/autenticacion/tipos";

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
  email: string;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    redirect("/login?error=NX-SYS-002");
  }

  const { data: solicitante } = await supabase
    .from("usuarios")
    .select("rol, cliente_id, email")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (!solicitante || !solicitante.cliente_id || (solicitante.rol !== "comerciante" && solicitante.rol !== "empleado")) {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  // Obtener los datos del comercio
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nombre_comercio")
    .eq("cliente_id", solicitante.cliente_id)
    .single();

  const nombreComercio = cliente?.nombre_comercio || "Mi Comercio";

  // Obtener los módulos activos del comercio
  const { data: modulos } = await supabase
    .from("tenant_modules")
    .select("modulo, activo")
    .eq("cliente_id", solicitante.cliente_id)
    .eq("activo", true);

  const modulosActivos = {
    catalogo_web: modulos?.some((m) => m.modulo === "catalogo_web") ?? false,
    carga_ia: modulos?.some((m) => m.modulo === "carga_ia") ?? false,
    fiados: modulos?.some((m) => m.modulo === "fiados") ?? false,
    devoluciones: modulos?.some((m) => m.modulo === "devoluciones") ?? false,
    bot_whatsapp: modulos?.some((m) => m.modulo === "bot_whatsapp") ?? false,
  };

  return (
    <QueryProvider>
      <AppLayoutClient
        rol={solicitante.rol}
        email={solicitante.email}
        nombreComercio={nombreComercio}
        modulosActivos={modulosActivos}
      >
        {children}
      </AppLayoutClient>
    </QueryProvider>
  );
}

