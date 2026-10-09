import React from "react";
import type { PlantillaProps } from "../tipos";
import { CatalogoHero } from "../../components/catalogoWeb/bloques/CatalogoHero";
import { GrillaProductos } from "../../components/catalogoWeb/bloques/GrillaProductos";
import { CatalogoFooter } from "../../components/catalogoWeb/bloques/CatalogoFooter";

export default function PlantillaGourmet({
  cliente,
  productos,
}: PlantillaProps) {
  const colorPrimario = cliente.color_primario || "#D4AF37"; // Gold default for gourmet
  const mostrarPrecios = cliente.configuracion_plantilla?.mostrar_precios !== false;

  const productosMapeados = productos.map(p => ({
    producto_id: p.producto_id,
    nombre: p.nombre,
    precio_venta: p.precio,
    url_imagen: p.imagen_url,
    categoria: p.categoria,
    descripcion: p.descripcion,
  }));

  const contacto = {
    telefono: cliente.telefono_whatsapp,
    email: cliente.configuracion_plantilla?.email as string | undefined,
    direccion: cliente.configuracion_plantilla?.direccion as string | undefined,
    instagram: cliente.configuracion_plantilla?.instagram as string | undefined,
  };

  return (
    <div className="flex min-h-screen flex-col font-serif bg-stone-950 text-stone-50 selection:bg-stone-800 selection:text-stone-50">
      <CatalogoHero
        titulo={cliente.nombre_comercio}
        subtitulo={cliente.configuracion_plantilla?.subtitulo as string | undefined}
        imagenFondo={cliente.configuracion_plantilla?.banner_url as string | undefined}
        colorPrimario={colorPrimario}
      />
      
      <main className="flex-1 bg-stone-950 [&_article]:rounded-2xl [&_article]:border-stone-800 [&_article]:bg-stone-900 [&_article]:shadow-2xl [&_article_*]:text-stone-100 [&_.bg-[#111615]]:bg-stone-900 [&_.text-slate-100]:text-stone-50 [&_.text-white]:text-white [&_.text-slate-400]:text-stone-400 [&_button]:rounded-2xl [&_button]:shadow-lg [&_button]:font-sans [&_input]:font-sans">
        <GrillaProductos
          productos={productosMapeados}
          mostrarPrecios={mostrarPrecios}
          colorPrimario={colorPrimario}
        />
      </main>

      <div className="[&_footer]:bg-stone-900 [&_footer_*]:text-stone-300 [&_footer_svg]:text-stone-500 [&_footer_a:hover]:text-stone-50 border-t border-stone-800">
        <CatalogoFooter
          nombreComercio={cliente.nombre_comercio}
          colorPrimario={colorPrimario}
          contacto={contacto}
        />
      </div>
    </div>
  );
}
