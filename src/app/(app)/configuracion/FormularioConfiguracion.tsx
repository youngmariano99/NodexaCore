"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { actualizarDatosComercio } from "@/services/configuracion/actualizarDatosComercio";

interface FormularioConfiguracionProps {
  nombreInicial: string;
  whatsappInicial: string;
  logoInicial: string | null;
}

export function FormularioConfiguracion({
  nombreInicial,
  whatsappInicial,
  logoInicial,
}: FormularioConfiguracionProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [whatsapp, setWhatsapp] = useState(whatsappInicial);
  const [logo, setLogo] = useState(logoInicial || "");

  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);
    setExito(false);

    if (!nombre.trim()) {
      setErrorLocal("El nombre del comercio es obligatorio.");
      return;
    }

    if (!whatsapp.trim()) {
      setErrorLocal("El número de WhatsApp es obligatorio.");
      return;
    }

    startTransition(async () => {
      const res = await actualizarDatosComercio(
        nombre,
        whatsapp,
        logo.trim() === "" ? null : logo
      );

      if (res.ok) {
        setExito(true);
        router.refresh();
      } else {
        setErrorLocal(res.error || "NX-SYS-001");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
      {errorLocal && (
        <MensajeError codigo={errorLocal} className="w-full" />
      )}

      {exito && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Configuración guardada correctamente.</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Nombre del Comercio
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          disabled={isPending}
          placeholder="Ej: Almacén Don Pedro"
          className="min-h-11 rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Teléfono WhatsApp
        </label>
        <input
          type="text"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          required
          disabled={isPending}
          placeholder="Ej: 5491122334455"
          className="min-h-11 rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
        />
        <p className="text-[11px] text-slate-500 leading-normal">
          Ingresá el número con código de país, sin espacios ni caracteres especiales (ej. 549...).
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          URL del Logo
        </label>
        <input
          type="url"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          disabled={isPending}
          placeholder="Ej: https://misitio.com/logo.png"
          className="min-h-11 rounded-md border border-[#222A27] bg-[#111615] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-11 items-center justify-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors duration-150 disabled:opacity-50"
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
