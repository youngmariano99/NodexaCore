"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";

import { registrarUsoModulo } from "@/lib/analytics/eventos";
import type { PreguntaBot } from "@/lib/dominio/botWhatsapp/armarPreguntasBot";

interface BotFaqCatalogoProps {
  clienteId: string;
  nombreComercio: string;
  numeroWhatsapp: string;
  preguntas: PreguntaBot[];
  permiteDerivarWhatsapp: boolean;
}

/**
 * FAQ estático del Módulo Bot de WhatsApp dentro de la vidriera pública
 * (docs/ROLES.md §2: `cliente_final` tiene `L (respuesta automática, sin ver
 * config)` sobre `configuracion_bot_whatsapp`). No hay ningún webhook ni
 * proveedor externo de WhatsApp involucrado: las preguntas y respuestas ya
 * llegan resueltas server-side (`obtenerConfiguracionBotPublica` +
 * `armarPreguntasBot`), este componente solo despliega la respuesta elegida
 * in-app (acordeón). El fallback a WhatsApp real (`permite_derivar_whatsapp`,
 * columna nueva de esta estación) reutiliza el mismo enlace `wa.me` que
 * `BotonWhatsappCta` de la ficha de producto, pero con un mensaje genérico
 * de comercio (no de producto) y su propio evento de analítica.
 */
export function BotFaqCatalogo({
  clienteId,
  nombreComercio,
  numeroWhatsapp,
  preguntas,
  permiteDerivarWhatsapp,
}: BotFaqCatalogoProps) {
  const [preguntaAbierta, setPreguntaAbierta] = useState<string | null>(null);

  if (preguntas.length === 0) return null;

  function alternarPregunta(pregunta: PreguntaBot) {
    const yaEstabaAbierta = preguntaAbierta === pregunta.clave;
    setPreguntaAbierta(yaEstabaAbierta ? null : pregunta.clave);

    if (!yaEstabaAbierta) {
      registrarUsoModulo({ clienteId, modulo: "bot_whatsapp", accion: `pregunta_${pregunta.clave}` });
    }
  }

  const enlaceWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(
    `Hola, tengo una consulta sobre ${nombreComercio}`,
  )}`;

  return (
    <section aria-label="Preguntas frecuentes" className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
      <h2 className="text-base font-semibold text-slate-900">Preguntas frecuentes</h2>

      <ul className="flex flex-col gap-2">
        {preguntas.map((pregunta) => {
          const estaAbierta = preguntaAbierta === pregunta.clave;

          return (
            <li key={pregunta.clave} className="overflow-hidden rounded-md border border-slate-200">
              <button
                type="button"
                aria-expanded={estaAbierta}
                onClick={() => alternarPregunta(pregunta)}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm font-medium text-slate-900"
              >
                {pregunta.etiqueta}
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
                    estaAbierta ? "rotate-180" : ""
                  }`}
                />
              </button>
              {estaAbierta ? (
                <p className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">{pregunta.respuesta}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {permiteDerivarWhatsapp ? (
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
          <p className="text-sm text-slate-600">¿No encontraste lo que buscabas?</p>
          <a
            href={enlaceWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => registrarUsoModulo({ clienteId, modulo: "bot_whatsapp", accion: "derivar_whatsapp" })}
            className="flex min-h-11 w-fit items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-emerald-600"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Seguir por WhatsApp
          </a>
        </div>
      ) : null}
    </section>
  );
}
