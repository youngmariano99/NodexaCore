import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerSubdominioDesdeHost } from "@/proxy";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const subdominio = obtenerSubdominioDesdeHost(host);

  let nombreComercio = "Nodexa Core — Catálogo Web";
  let colorPrimario = "#16D39A";
  let logoUrl = "/favicon.ico";

  if (subdominio) {
    try {
      const supabase = await crearClienteSupabaseServidor();
      const { data: cliente } = await supabase
        .from("clientes")
        .select("nombre_comercio, color_primario, logo_url")
        .or(`slug.eq.${subdominio},dominio_personalizado.eq.${subdominio}`)
        .eq("estado_pago", true)
        .is("eliminado_en", null)
        .maybeSingle();

      if (cliente) {
        if (cliente.nombre_comercio) {
          nombreComercio = cliente.nombre_comercio;
        }
        if (cliente.color_primario) {
          colorPrimario = cliente.color_primario;
        }
        if (cliente.logo_url) {
          logoUrl = cliente.logo_url;
        }
      }
    } catch {
      // Fallback a configuración Nodexa si falla la consulta
    }
  }

  return {
    name: nombreComercio,
    short_name: nombreComercio.substring(0, 15),
    description: `Catálogo web y pedidos en línea de ${nombreComercio}`,
    start_url: "/",
    display: "standalone",
    background_color: "#090B0B",
    theme_color: colorPrimario,
    icons: [
      {
        src: logoUrl,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: logoUrl,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
