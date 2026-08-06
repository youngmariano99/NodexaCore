"use client";

import { useEffect } from "react";

import { registrarConversionCatalogo } from "@/lib/analytics/eventos";

interface RegistradorVistaVidrieraProps {
  clienteId: string;
}

/**
 * Componente sin render: dispara conversion_catalogo una vez al montar la
 * vidriera pública. Vive aparte de la page.tsx (Server Component) porque
 * necesita useEffect + localStorage/sessionStorage, exclusivos de cliente.
 */
export function RegistradorVistaVidriera({ clienteId }: RegistradorVistaVidrieraProps) {
  useEffect(() => {
    registrarConversionCatalogo({ clienteId });
  }, [clienteId]);

  return null;
}
