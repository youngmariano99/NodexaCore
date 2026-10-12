import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotFaqCatalogo } from "@/components/catalogoWeb/BotFaqCatalogo";
import { RegistradorVistaVidriera } from "@/components/analytics/registrador-vista-vidriera";
import { armarPreguntasBot } from "@/lib/dominio/botWhatsapp/armarPreguntasBot";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { obtenerConfiguracionBotPublica } from "@/repositories/configuracionBotRepository";
import { obtenerClientePublicoPorSlug } from "@/repositories/clientes";
import { obtenerProductosPublicadosPaginados, PRODUCTOS_PUBLICOS_POR_PAGINA } from "@/repositories/productosRepository";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const COLOR_POR_DEFECTO = "#3B82F6";

/**
 * ISR (docs/BACKLOG.md Paso 1 y 3): la página se regenera en segundo plano
 * como máximo cada 60s — un cambio de publicación/precio se refleja sin
 * rebuild manual (Criterio de Aceptación 2), y entre regeneraciones se sirve
 * desde caché de Edge (`vercel.json`, headers `Cache-Control` con
 * `s-maxage=60, stale-while-revalidate=300` para `/c/:clienteSlug`) sin
 * pegarle a PostgreSQL en cada visita (Criterio de Aceptación 4).
 */
export const revalidate = 60;

interface PageProps {
  params: Promise<{ clienteSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { clienteSlug } = await params;
  const supabase = await crearClienteSupabaseServidor();
  const resultado = await obtenerClientePublicoPorSlug(supabase, clienteSlug);

  if (!resultado.ok) {
    return { title: "Vidriera no disponible — Nodexa Core" };
  }

  return { title: `${resultado.data.nombre_comercio} — Catálogo` };
}

/**
 * Vidriera pública del comercio (docs/SITEMAP.md "/c/[clienteSlug] →
 * Vidriera pública (Catálogo Web)"; docs/ERRORS.md `NX-WEB-004`). Consulta
 * `clientes` vía la política RLS `clientes_lectura_publica` (Paso 2 lo pide
 * para `productos`; acá aplica el mismo criterio para resolver el slug) y,
 * si el comercio no existe o está suspendido, dispara `notFound()` — mismo
 * mensaje genérico para ambos casos, sin filtrar cuál de los dos ocurrió
 * (Criterio de Aceptación 3).
 */
export default async function VidrieraPublica({ params, searchParams }: PageProps) {
  const { clienteSlug } = await params;
  const { page } = await searchParams;
  const paginaActual = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const supabase = await crearClienteSupabaseServidor();

  const resultadoCliente = await obtenerClientePublicoPorSlug(supabase, clienteSlug);

  if (!resultadoCliente.ok) {
    notFound();
  }

  const cliente = resultadoCliente.data;


  const resultadoProductos = await obtenerProductosPublicadosPaginados(supabase, cliente.cliente_id, paginaActual);

  const productos = resultadoProductos.ok ? resultadoProductos.data.productos : [];
  const total = resultadoProductos.ok ? resultadoProductos.data.total : 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PRODUCTOS_PUBLICOS_POR_PAGINA));

  const configuracionBot = await obtenerConfiguracionBotPublica(supabase, cliente.cliente_id);
  const preguntasBot = configuracionBot ? armarPreguntasBot(configuracionBot) : [];

import { SelectorPlantillas } from "@/plantillas/SelectorPlantillas";

  return (
    <div className="flex flex-1 flex-col">
      <RegistradorVistaVidriera clienteId={cliente.cliente_id} />

      {preguntasBot.length > 0 ? (
        <div className="mx-auto w-full max-w-5xl px-6 pt-4">
          <BotFaqCatalogo
            clienteId={cliente.cliente_id}
            nombreComercio={cliente.nombre_comercio}
            numeroWhatsapp={cliente.telefono_whatsapp}
            preguntas={preguntasBot}
            permiteDerivarWhatsapp={configuracionBot?.permite_derivar_whatsapp ?? false}
          />
        </div>
      ) : null}

      <SelectorPlantillas
        plantillaActiva={cliente.plantilla_activa || "basica"}
        cliente={cliente}
        productos={productos}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        clienteSlug={clienteSlug}
      />
    </div>
  );
}
