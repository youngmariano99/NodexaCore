"use client";

import { entornoCliente } from "@/lib/env";

const ENDPOINT_POR_DEFECTO = "https://nave-nodriza-catalogo.vercel.app/api/telemetry/traffic";

const CLAVE_VISITANTE = "_nn_vid";
const CLAVE_SESION = "_nn_sid";

export type MetadataEventoNodriza = Record<string, string | number | boolean | null>;

function generarId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function obtenerOCrearId(storage: Storage, clave: string): string {
  const existente = storage.getItem(clave);
  if (existente) {
    return existente;
  }
  const nuevo = generarId();
  storage.setItem(clave, nuevo);
  return nuevo;
}

function estaActivo(): boolean {
  return Boolean(entornoCliente.NEXT_PUBLIC_NN_CLIENT_ID && entornoCliente.NEXT_PUBLIC_NN_API_KEY);
}

/**
 * Envía un evento a Nave Nodriza (telemetría externa de AppyStudio vía HTTP,
 * nunca escribe en el PostgreSQL de Nodexa Core — es un fetch a un servicio hermano).
 *
 * No-op silencioso (sin console.error/warn) cuando faltan las variables de entorno
 * o cuando se ejecuta en el servidor: cumple el criterio de que la app no debe
 * fallar ni loguear errores si Nave Nodriza está desactivada por configuración.
 */
export function enviarEventoNodriza(tipoEvento: string, metadata: MetadataEventoNodriza = {}): void {
  if (typeof window === "undefined" || !estaActivo()) {
    return;
  }

  const payload = {
    client_id: entornoCliente.NEXT_PUBLIC_NN_CLIENT_ID,
    event_type: tipoEvento,
    path: window.location.pathname,
    referrer: document.referrer || null,
    session_id: obtenerOCrearId(sessionStorage, CLAVE_SESION),
    visitor_id: obtenerOCrearId(localStorage, CLAVE_VISITANTE),
    user_agent: navigator.userAgent,
    metadata,
  };

  fetch(entornoCliente.NEXT_PUBLIC_NN_ENDPOINT ?? ENDPOINT_POR_DEFECTO, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${entornoCliente.NEXT_PUBLIC_NN_API_KEY}`,
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[nave-nodriza] no se pudo enviar el evento "${tipoEvento}"`);
    }
  });
}
