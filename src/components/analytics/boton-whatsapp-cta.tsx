"use client";

import { registrarClicWhatsapp } from "@/lib/analytics/eventos";

interface BotonWhatsappCtaProps {
  clienteId: string;
  productoId: string;
  productoNombre: string;
  precio?: number;
  numeroWhatsapp: string;
  mensaje?: string;
  className?: string;
}

export function BotonWhatsappCta({
  clienteId,
  productoId,
  productoNombre,
  precio,
  numeroWhatsapp,
  mensaje,
  className,
}: BotonWhatsappCtaProps) {
  const textoMensaje = mensaje ?? `Hola, quiero consultar por ${productoNombre}`;
  const enlaceWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(textoMensaje)}`;

  return (
    <a
      href={enlaceWhatsapp}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      }
      onClick={() => {
        registrarClicWhatsapp({ clienteId, productoId, productoNombre, precio });
      }}
    >
      Consultar por WhatsApp
    </a>
  );
}
