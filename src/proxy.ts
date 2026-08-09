import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decodificarClaimsSesion } from "@/lib/auth/decodificar-jwt";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { entornoCliente } from "@/lib/env";

/**
 * Coincide con la duración de JWT configurada en Supabase Auth (CLAUDE.md §4).
 * Se valida explícitamente acá además de confiar en el `exp` del token: si
 * algún día se reconfigura la duración en el dashboard sin avisar, el
 * proxy sigue exigiendo el máximo de 1 hora documentado.
 */
const DURACION_MAXIMA_SESION_SEGUNDOS = 60 * 60;

const PREFIJOS_RUTAS_ADMIN = ["/admin"];

function redirigirALogin(request: NextRequest, codigoError: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?error=${codigoError}`;
  return NextResponse.redirect(url);
}

function redirigirSinPermiso(request: NextRequest, rutaDestino: string) {
  const url = request.nextUrl.clone();
  url.pathname = rutaDestino;
  url.search = "?error=NX-SYS-003";
  return NextResponse.redirect(url);
}

/**
 * Proxy global de sesión (docs/ROLES.md §3.1, SITEMAP.md nota de acceso).
 * Intercepta las rutas de los grupos (app) y (admin): exige sesión Supabase
 * válida con antigüedad ≤ 1 hora y bloquea (admin) a quien no tenga
 * `rol = admin_nodexa`.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    entornoCliente.NEXT_PUBLIC_SUPABASE_URL,
    entornoCliente.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaEstablecer) {
          cookiesParaEstablecer.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesParaEstablecer.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() revalida el token contra el servidor de Supabase Auth (no confía
  // ciegamente en la cookie), refrescando la sesión si corresponde.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirigirALogin(request, "NX-SYS-002");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const claims = session ? decodificarClaimsSesion(session.access_token) : null;
  const ahoraEnSegundos = Math.floor(Date.now() / 1000);
  const sesionExpirada =
    !claims || claims.exp <= ahoraEnSegundos || claims.exp - claims.iat > DURACION_MAXIMA_SESION_SEGUNDOS;

  if (sesionExpirada) {
    return redirigirALogin(request, "NX-SYS-002");
  }

  const esRutaAdmin = PREFIJOS_RUTAS_ADMIN.some((prefijo) => request.nextUrl.pathname.startsWith(prefijo));

  if (esRutaAdmin && claims.rol !== "admin_nodexa") {
    return redirigirSinPermiso(request, RUTA_POR_ROL[claims.rol]);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/mostrador/:path*",
    "/productos/:path*",
    "/stock/:path*",
    "/ventas/:path*",
    "/devoluciones/:path*",
    "/clientes/:path*",
    "/catalogo-web/:path*",
    "/whatsapp-bot/:path*",
    "/configuracion/:path*",
    "/ayuda/:path*",
    "/admin/:path*",
  ],
};
