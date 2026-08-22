"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { actualizarConfiguracionBot } from "@/services/botWhatsapp/actualizarConfiguracionBot";
import { ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL } from "@/services/botWhatsapp/tipos";

interface ConfigBot {
  activo: boolean;
  mensajeHorarios: string;
  mensajeUbicacion: string;
  mensajeCatalogo: string;
  permiteDerivarWhatsapp: boolean;
}

interface FormularioConfiguracionBotProps {
  configInicial: ConfigBot;
}

export function FormularioConfiguracionBot({ configInicial }: FormularioConfiguracionBotProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activo, setActivo] = useState(configInicial.activo);
  const [mensajeHorarios, setMensajeHorarios] = useState(configInicial.mensajeHorarios);
  const [mensajeUbicacion, setMensajeUbicacion] = useState(configInicial.mensajeUbicacion);
  const [mensajeCatalogo, setMensajeCatalogo] = useState(configInicial.mensajeCatalogo);
  const [permiteDerivarWhatsapp, setPermiteDerivarWhatsapp] = useState(configInicial.permiteDerivarWhatsapp);

  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);
    setExito(false);

    // Paso 4: Validar que si el bot se activa, al menos uno de los tres mensajes informativos esté relleno
    if (activo) {
      const tieneHorarios = mensajeHorarios.trim().length > 0;
      const tieneUbicacion = mensajeUbicacion.trim().length > 0;
      const tieneCatalogo = mensajeCatalogo.trim().length > 0;

      if (!tieneHorarios && !tieneUbicacion && !tieneCatalogo) {
        setErrorForm("NX-BOT-002");
        return;
      }
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("activo", activo ? "true" : "false");
      formData.append("mensaje_horarios", mensajeHorarios);
      formData.append("mensaje_ubicacion", mensajeUbicacion);
      formData.append("mensaje_catalogo", mensajeCatalogo);
      formData.append("permite_derivar_whatsapp", permiteDerivarWhatsapp ? "true" : "false");

      const resultado = await actualizarConfiguracionBot(
        ESTADO_ACTUALIZAR_CONFIGURACION_BOT_INICIAL,
        formData
      );

      if (resultado.exito) {
        setExito(true);
        router.refresh();
      } else {
        setErrorForm(resultado.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {errorForm && (
        <MensajeError codigo={errorForm} className="w-full" />
      )}

      {exito && (
        <div className="rounded-md border border-emerald-500 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          Configuración del bot guardada con éxito.
        </div>
      )}

      {/* Switch Activo */}
      <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-100">Estado del Bot</span>
          <span className="text-xs text-slate-400">Activá o desactivá el bot in-app de tu vidriera.</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          disabled={isPending}
          onClick={() => setActivo(!activo)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
            activo ? "bg-emerald-500" : "bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              activo ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Mensaje Horarios */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Mensaje de Horarios
        </label>
        <textarea
          rows={3}
          value={mensajeHorarios}
          onChange={(e) => setMensajeHorarios(e.target.value)}
          placeholder="Ej: Lunes a viernes de 9:00 a 18:00 hs. Sábados de 9:00 a 13:00 hs."
          className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
      </div>

      {/* Mensaje Ubicación */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Mensaje de Ubicación
        </label>
        <textarea
          rows={3}
          value={mensajeUbicacion}
          onChange={(e) => setMensajeUbicacion(e.target.value)}
          placeholder="Ej: Estamos en Av. Corrientes 1234, CABA."
          className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
      </div>

      {/* Mensaje Catálogo */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Mensaje de Catálogo
        </label>
        <textarea
          rows={3}
          value={mensajeCatalogo}
          onChange={(e) => setMensajeCatalogo(e.target.value)}
          placeholder="Ej: Podés ver todos nuestros productos actualizados en esta misma vidriera."
          className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
      </div>

      {/* Switch Derivación WhatsApp */}
      <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-100">Derivación a WhatsApp</span>
          <span className="text-xs text-slate-400">Permitir a los clientes chatear directamente por WhatsApp.</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={permiteDerivarWhatsapp}
          disabled={isPending}
          onClick={() => setPermiteDerivarWhatsapp(!permiteDerivarWhatsapp)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
            permiteDerivarWhatsapp ? "bg-emerald-500" : "bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              permiteDerivarWhatsapp ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Botón de envío */}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 flex min-h-11 items-center justify-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors duration-150 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "Guardar Configuración"
        )}
      </button>
    </form>
  );
}
