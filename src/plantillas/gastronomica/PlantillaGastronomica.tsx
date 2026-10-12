"use client";

import React, { useMemo, useState } from "react";
import type { PlantillaProps } from "../tipos";

const formatoPrecio = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47a9.4 9.4 0 0 1 6.7 2.78 9.42 9.42 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.53A11.33 11.33 0 0 0 12.04.62C5.76.62.64 5.73.64 12.02c0 2.01.52 3.97 1.52 5.7L.55 23.62l6.04-1.58a11.37 11.37 0 0 0 5.45 1.39h.01c6.28 0 11.4-5.11 11.4-11.4 0-3.05-1.19-5.91-3.35-8.06z" />
  </svg>
);

interface ConfigGastronomica {
  mostrar_precios?: boolean;
  banner_url?: string;
  subtitulo?: string;
  direccion?: string;
}

export default function PlantillaGastronomica({ cliente, productos }: PlantillaProps) {
  const primario = cliente.color_primario || "#D07B5E";
  const config = (cliente.configuracion_plantilla as ConfigGastronomica | null) || {};
  const mostrarPrecios = config.mostrar_precios !== false;

const categorias = useMemo<string[]>(() => {
  const orden: string[] = [];
  productos.forEach((p) => {
    const c = p.categoria || "Otros";
    if (!orden.includes(c)) orden.push(c);
  });
  return orden;
}, [productos]);

  const [activa, setActiva] = useState<string>("Todos");
  const visibles = activa === "Todos" ? categorias : categorias.filter((c) => c === activa);

  const waLink = (texto: string) =>
    cliente.telefono_whatsapp
      ? `https://wa.me/${cliente.telefono_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`
      : "#";

  const irAlMenu = () => {
    if (typeof document !== "undefined") {
      document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const slug = (s: string) => "cat-" + s.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="min-h-screen bg-[#F9F5EB] font-sans pb-28 text-stone-800 antialiased">
      {/* HERO */}
      <header className="relative overflow-hidden">
        {config.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        )}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#D07B5E]/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#7A9A6E]/10" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pt-12 pb-16 text-center">
          {cliente.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cliente.logo_url}
              alt={`Logo de ${cliente.nombre_comercio}`}
              className="h-40 w-40 rounded-full shadow-[0_12px_40px_-12px_rgba(208,123,94,0.5)] ring-4 ring-white/70 sm:h-48 sm:w-48 object-cover"
            />
          )}
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.35em] text-[#6B8A5E]">
            Comida Casera
          </p>
          <h1 className="mt-2 font-serif text-5xl font-bold leading-tight sm:text-6xl" style={{ color: primario }}>
            {cliente.nombre_comercio}
          </h1>
          {config.subtitulo && (
            <p className="mt-3 max-w-md font-serif text-lg italic text-stone-600">{config.subtitulo}</p>
          )}
          {config.direccion && (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#7A9A6E]/30 bg-white/60 px-4 py-1.5 text-sm text-[#5A7A4E]">
              <span className="h-2 w-2 rounded-full bg-[#7A9A6E]" /> {config.direccion}
            </span>
          )}
          <button
            type="button"
            onClick={irAlMenu}
            className="mt-8 rounded-full px-8 py-3.5 text-base font-bold uppercase tracking-widest text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            style={{ backgroundColor: primario }}
          >
            Ver Menú
          </button>
        </div>
      </header>

      {/* NAV PILLS */}
      <nav id="menu" className="sticky top-0 z-30 border-y border-[#D07B5E]/15 bg-[#F9F5EB]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {["Todos", ...categorias].map((c) => {
            const on = c === activa;
            return (
              <button
                type="button"
                key={c}
                onClick={() => setActiva(c)}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider transition ${
                  on ? "text-white shadow-md" : "border border-[#D07B5E]/30 bg-white/70 text-[#B5654A] hover:bg-white"
                }`}
                style={on ? { backgroundColor: primario } : undefined}
              >
                {c}
              </button>
            );
          })}
        </div>
      </nav>

      {/* PRODUCTOS */}
      <main className="mx-auto max-w-3xl px-4 pt-8">
        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#D07B5E]/30 bg-white/60 px-6 py-16 text-center">
            <p className="text-base font-medium text-stone-800">Todavía no hay platos publicados en el menú.</p>
            <p className="text-sm text-stone-500">Volvé a visitarnos pronto.</p>
          </div>
        ) : (
          visibles.map((cat) => {
            const platosCategoria = productos.filter((p) => (p.categoria || "Otros") === cat);
            if (platosCategoria.length === 0) return null;

            return (
              <section key={cat} id={slug(cat)} className="mb-10 scroll-mt-20">
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-serif text-3xl font-bold" style={{ color: primario }}>{cat}</h2>
                  <span className="h-px flex-1 bg-gradient-to-r from-[#7A9A6E]/50 to-transparent" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {platosCategoria.map((p) => (
                    <article
                      key={p.producto_id}
                      className="group flex overflow-hidden rounded-2xl border border-[#D07B5E]/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative w-28 shrink-0 overflow-hidden bg-[#F1E6D6] sm:w-32">
                        {p.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imagen_url}
                            alt={p.nombre}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-serif text-4xl font-bold text-[#D07B5E]/40">
                            {p.nombre.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col p-4">
                        <h3 className="text-lg font-bold leading-tight text-stone-800">{p.nombre}</h3>
                        {p.descripcion && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{p.descripcion}</p>}
                        <div className="mt-auto flex items-center justify-between pt-3">
                          {mostrarPrecios ? (
                            <span className="text-lg font-bold" style={{ color: primario }}>{formatoPrecio(p.precio)}</span>
                          ) : <span />}
                          {cliente.telefono_whatsapp && (
                            <a
                              href={waLink(`Hola ${cliente.nombre_comercio}! Quiero pedir: ${p.nombre}`)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-[#7A9A6E]/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#4F6B44] transition hover:bg-[#7A9A6E] hover:text-white"
                            >
                              + Pedir
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* FOOTER */}
      <footer className="mx-auto max-w-3xl px-6 py-10 text-center">
        <p className="font-serif text-xl italic" style={{ color: primario }}>Hecho con amor, como en casa.</p>
        <p className="mt-2 text-xs text-stone-400">© {new Date().getFullYear()} {cliente.nombre_comercio}</p>
      </footer>

      {/* CTA FLOTANTE */}
      {cliente.telefono_whatsapp && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center bg-gradient-to-t from-[#F9F5EB] via-[#F9F5EB]/80 to-transparent px-4 pt-6 pb-5">
          <a
            href={waLink(`Hola ${cliente.nombre_comercio}! Quiero hacer un pedido.`)}
            target="_blank"
            rel="noreferrer"
            className="flex w-full max-w-md items-center justify-center gap-3 rounded-full bg-[#25D366] px-6 py-4 text-lg font-bold uppercase tracking-wider text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition hover:-translate-y-0.5 hover:bg-[#1EBE5A]"
          >
            <WhatsAppIcon className="h-6 w-6" /> Hacer pedido
          </a>
        </div>
      )}
    </div>
  );
}
