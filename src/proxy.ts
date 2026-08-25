import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decodificarClaimsSesion } from "@/lib/auth/decodificar-jwt";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { entornoCliente } from "@/lib/env";

/**
 * Coincide con la duración de JWT configurada en Supabase Auth (CLAUDE.md §4).
 * Se valida explícitamente acá además de confiar en el `exp` del token.
 */
const DURACION_MAXIMA_SESION_SEGUNDOS = 60 * 60;
const PREFIJOS_RUTAS_ADMIN = ["/admin"];

const DOMINIOS_PRINCIPALES = [
  "localhost",
  "127.0.0.1",
  "nodexa.com",
  "app.nodexa.com",
  "vercel.app",
];

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
 * Extrae el subdominio comercial del header host.
 * Ejemplos:
 * - despensacarlitos.nodexa.com -> despensacarlitos
 * - despensacarlitos.localhost:3000 -> despensacarlitos
 * - localhost:3000 -> null
 */
export function obtenerSubdominioDesdeHost(host: string): string | null {
  const hostSeguro = host ?? "";
  const hostLimpio = hostSeguro.split(":")[0]?.toLowerCase() ?? "";

  if (!hostLimpio || DOMINIOS_PRINCIPALES.includes(hostLimpio)) {
    return null;
  }

  const partes = hostLimpio.split(".");

  if (partes.length > 1) {
    const primerSegmento = partes[0];
    if (primerSegmento && !["www", "app", "admin", "api"].includes(primerSegmento)) {
      return primerSegmento;
    }
  }

  return hostLimpio || null;
}

/**
 * Proxy global de Next.js (docs/ROLES.md §3.1, SITEMAP.md nota de acceso).
 * 1. Resuelve subdominios y dominios personalizados para el Catálogo Web de forma dinámica (rewrite interno a /c/[slug]).
 * 2. Intercepta las rutas del panel de administración y comercio: exige sesión Supabase válida con antigüedad ≤ 1 hora.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;
  const subdominioOHost = obtenerSubdominioDesdeHost(host);

  // 1. Ruteo Dinámico del Catálogo Web por Subdominio / Dominio Personalizado
  if (subdominioOHost && !pathname.startsWith("/c/")) {
    const supabasePublico = createServerClient(
      entornoCliente.NEXT_PUBLIC_SUPABASE_URL,
      entornoCliente.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: cliente, error } = await supabasePublico
      .from("clientes")
      .select("cliente_id, slug, estado_pago, tenant_modules!inner(modulo, activo)")
      .or(`slug.eq.${subdominioOHost},dominio_personalizado.eq.${subdominioOHost}`)
      .eq("estado_pago", true)
      .is("eliminado_en", null)
      .eq("tenant_modules.modulo", "catalogo_web")
      .eq("tenant_modules.activo", true)
      .maybeSingle();

    if (error || !cliente) {
      const urlError = request.nextUrl.clone();
      urlError.pathname = "/404";
      urlError.search = "?error=NX-WEB-004";
      return NextResponse.rewrite(urlError);
    }

    const urlDestino = request.nextUrl.clone();
    urlDestino.pathname = `/c/${cliente.slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(urlDestino);
  }

  // 2. Control de acceso al panel privado y administración
  const RUTAS_PRIVADAS = [
    "/dashboard",
    "/mostrador",
    "/productos",
    "/stock",
    "/ventas",
    "/devoluciones",
    "/clientes",
    "/catalogo-web",
    "/whatsapp-bot",
    "/configuracion",
    "/ayuda",
    "/admin",
  ];

  const esRutaPrivada = RUTAS_PRIVADAS.some((prefijo) => pathname.startsWith(prefijo));

  if (!esRutaPrivada) {
    return NextResponse.next();
  }

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

  if (claims.rol !== "admin_nodexa" && claims.estado_pago === false) {
    return redirigirALogin(request, "NX-ADM-002");
  }

  const esRutaAdmin = PREFIJOS_RUTAS_ADMIN.some((prefijo) => request.nextUrl.pathname.startsWith(prefijo));

  if (esRutaAdmin && claims.rol !== "admin_nodexa") {
    return redirigirSinPermiso(request, RUTA_POR_ROL[claims.rol]);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
