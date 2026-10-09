import React from "react";
import { AtSign, Mail, MapPin, Phone } from "lucide-react";

export interface DatosContacto {
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  instagram?: string | null;
}

interface CatalogoFooterProps {
  nombreComercio: string;
  colorPrimario: string;
  contacto?: DatosContacto;
}

export function CatalogoFooter({
  nombreComercio,
  colorPrimario,
  contacto,
}: CatalogoFooterProps) {
  const anioActual = new Date().getFullYear();

  return (
    <footer
      className="mt-auto border-t border-slate-800 bg-slate-950 py-12 text-slate-300"
      style={
        {
          "--color-primario": colorPrimario,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Columna 1: Marca */}
          <div className="flex flex-col gap-4">
            <h2
              className="text-xl font-bold tracking-tight text-white"
              style={{ color: "var(--color-primario)" }}
            >
              {nombreComercio}
            </h2>
            <p className="text-sm text-slate-400">
              Gracias por elegirnos. Nuestro catálogo se actualiza constantemente
              para ofrecerte los mejores productos.
            </p>
          </div>

          {/* Columna 2: Contacto */}
          <div className="flex flex-col gap-4 lg:col-start-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Contacto
            </h3>
            <ul className="flex flex-col gap-3 text-sm">
              {contacto?.telefono ? (
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <a
                    href={`https://wa.me/${contacto.telefono.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    {contacto.telefono}
                  </a>
                </li>
              ) : null}

              {contacto?.email ? (
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <a
                    href={`mailto:${contacto.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {contacto.email}
                  </a>
                </li>
              ) : null}

              {contacto?.direccion ? (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span className="leading-snug text-slate-300">
                    {contacto.direccion}
                  </span>
                </li>
              ) : null}

              {contacto?.instagram ? (
                <li className="flex items-start gap-3">
                  <AtSign className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <a
                    href={`https://instagram.com/${contacto.instagram.replace(
                      "@",
                      ""
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    {contacto.instagram}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        {/* Marca de agua de plataforma */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 sm:flex-row">
          <p className="text-xs text-slate-500">
            &copy; {anioActual} {nombreComercio}. Todos los derechos reservados.
          </p>
          <a
            href="https://nodexa.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            <span>Impulsado por</span>
            <span className="font-semibold text-white group-hover:text-[#16D39A] transition-colors">
              Nodexa
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
