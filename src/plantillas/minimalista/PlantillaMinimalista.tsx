import React from "react";
import type { PlantillaProps } from "../tipos";
import { CatalogoHero } from "../../components/catalogoWeb/bloques/CatalogoHero";
import { GrillaProductos } from "../../components/catalogoWeb/bloques/GrillaProductos";
import { CatalogoFooter } from "../../components/catalogoWeb/bloques/CatalogoFooter";

export default function PlantillaMinimalista({
  cliente,
  productos,
}: PlantillaProps) {
  const colorPrimario = cliente.color_primario || "#000000";
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
    <div className="flex min-h-screen flex-col font-sans bg-white text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      <CatalogoHero
        titulo={cliente.nombre_comercio}
        subtitulo={cliente.configuracion_plantilla?.subtitulo as string | undefined}
        imagenFondo={cliente.configuracion_plantilla?.banner_url as string | undefined}
        colorPrimario={colorPrimario}
      />
      
      <main className="flex-1 bg-white [&_article]:rounded-none [&_article]:border-slate-200 [&_article]:bg-white [&_article_*]:text-slate-900 [&_.bg-[#111615]]:bg-white [&_.text-slate-100]:text-slate-900 [&_.text-white]:text-slate-900 [&_.text-slate-400]:text-slate-600 [&_button]:rounded-none">
        <GrillaProductos
          productos={productosMapeados}
          mostrarPrecios={mostrarPrecios}
          colorPrimario={colorPrimario}
        />
      </main>

      <div className="[&_footer]:bg-slate-50 [&_footer_*]:text-slate-900 [&_footer_svg]:text-slate-600 [&_footer_a:hover]:text-slate-900 border-t border-slate-200">
        <CatalogoFooter
          nombreComercio={cliente.nombre_comercio}
          colorPrimario={colorPrimario}
          contacto={contacto}
        />
      </div>
    </div>
  );
}
