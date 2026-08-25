"use client";

import { Check, Eye, EyeOff, Layout, Palette, Save, Smartphone, Monitor } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SubidorImagen } from "@/components/catalogoWeb/SubidorImagen";
import { MensajeError } from "@/components/errores/MensajeError";
import { COLORES_PRIMARIOS_PERMITIDOS } from "@/services/catalogoWeb/coloresPrimariosPermitidos";

interface EditorPersonalizacionDisenoProps {
  clienteSlug: string;
  configuracionInicial?: {
    plantillaActiva?: string;
    colorPrimario?: string;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    mensajeHero?: string;
    mostrarPrecios?: boolean;
  };
}

const COLOR_DEFECTO = "#16D39A";

export function EditorPersonalizacionDiseno({
  clienteSlug,
  configuracionInicial,
}: EditorPersonalizacionDisenoProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [plantillaActiva, setPlantillaActiva] = useState(
    configuracionInicial?.plantillaActiva ?? "basica"
  );
  const [colorPrimario, setColorPrimario] = useState(
    configuracionInicial?.colorPrimario ?? COLOR_DEFECTO
  );
  const [mensajeHero, setMensajeHero] = useState(
    configuracionInicial?.mensajeHero ?? "¡Bienvenidos a nuestro catálogo oficial!"
  );
  const [mostrarPrecios, setMostrarPrecios] = useState(
    configuracionInicial?.mostrarPrecios ?? true
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(
    configuracionInicial?.logoUrl ?? null
  );
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    configuracionInicial?.bannerUrl ?? null
  );

  const [estaGuardando, setEstaGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [codigoError, setCodigoError] = useState<string | null>(null);
  const [modoDispositivo, setModoDispositivo] = useState<"desktop" | "mobile">("desktop");

  /**
   * Envía las actualizaciones del formulario al simulador (iframe) mediante postMessage con latencia cero.
   * Criterio de Aceptación: El simulador recibe los cambios sin recargar la página completa.
   */
  const transmitirCambiosLivePreview = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;

    const payload = {
      type: "NODEXA_UPDATE_PREVIEW",
      payload: {
        plantillaActiva,
        colorPrimario,
        mensajeHero,
        mostrarPrecios,
        logoUrl,
        bannerUrl,
      },
    };

    iframeRef.current.contentWindow.postMessage(payload, "*");
  }, [plantillaActiva, colorPrimario, mensajeHero, mostrarPrecios, logoUrl, bannerUrl]);

  useEffect(() => {
    transmitirCambiosLivePreview();
  }, [transmitirCambiosLivePreview]);

  const manejarGuardarCambios = async () => {
    setEstaGuardando(true);
    setMensajeExito(null);
    setCodigoError(null);

    try {
      // Simular la persistencia de cambios en la base de datos
      await new Promise((resolve) => setTimeout(resolve, 600));
      setMensajeExito("Diseño y configuración guardados correctamente.");
    } catch {
      setCodigoError("NX-SYS-001");
    } finally {
      setEstaGuardando(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100">
      {/* Columna Izquierda: Formulario de Edición de Campos */}
      <div className="flex w-full flex-col gap-6 border-b border-slate-800 p-6 lg:w-1/2 lg:border-b-0 lg:border-r overflow-y-auto">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-50">Editor de Diseño & Vidriera Web</h1>
          <p className="text-xs text-slate-400">
            Personalizá la plantilla, colores y visibilidad de tu catálogo público en tiempo real.
          </p>
        </header>

        {/* Sección 1: Selección de Plantilla */}
        <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-[#16D39A]" />
            <h2 className="text-sm font-semibold text-slate-100">Plantilla Visual Activa</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "basica", nombre: "Básica", desc: "Minimalista & limpia" },
              { id: "la-martina", nombre: "La Martina", desc: "Boutique & exclusiva" },
              { id: "filomena", nombre: "Filomena", desc: "Fresca & moderna" },
            ].map((p) => {
              const activa = plantillaActiva === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlantillaActiva(p.id)}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
                    activa
                      ? "border-[#16D39A] bg-[#16D39A]/10 text-slate-50"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs font-bold">{p.nombre}</span>
                  <span className="text-2xs text-slate-400">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sección 2: Selector de Color Primario */}
        <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#16D39A]" />
            <h2 className="text-sm font-semibold text-slate-100">Color Primario de Marca</h2>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color principal">
            {COLORES_PRIMARIOS_PERMITIDOS.map((color) => {
              const seleccionado = color === colorPrimario;
              return (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={seleccionado}
                  aria-label={color}
                  onClick={() => setColorPrimario(color)}
                  style={{ backgroundColor: color }}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border-2 transition-colors ${
                    seleccionado ? "border-slate-50" : "border-transparent hover:border-slate-400"
                  }`}
                >
                  {seleccionado ? <Check className="h-4 w-4 text-slate-950" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Sección 3: Switch para Ocultar / Exponer Precios en Catálogo */}
        <section className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-slate-100">Exhibir Precios en Vidriera</span>
            <span className="text-xs text-slate-400">
              {mostrarPrecios
                ? "Los precios de tus productos son visibles para todos los visitantes."
                : "Los precios permanecen ocultos en la vidriera pública."}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={mostrarPrecios}
            onClick={() => setMostrarPrecios(!mostrarPrecios)}
            className={`flex min-h-11 min-w-14 items-center rounded-full p-1 transition-colors ${
              mostrarPrecios ? "bg-[#16D39A] justify-end" : "bg-slate-700 justify-start"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-slate-100 shadow-md">
              {mostrarPrecios ? <Eye className="h-3.5 w-3.5 text-[#16D39A]" /> : <EyeOff className="h-3.5 w-3.5 text-slate-400" />}
            </span>
          </button>
        </section>

        {/* Sección 4: Mensaje Hero de Bienvenida */}
        <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <label htmlFor="mensajeHero" className="text-sm font-semibold text-slate-100">
            Mensaje de Bienvenida (Hero Banner)
          </label>
          <input
            id="mensajeHero"
            type="text"
            value={mensajeHero}
            onChange={(e) => setMensajeHero(e.target.value)}
            className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#16D39A] focus:outline-none"
            placeholder="ej. ¡Bienvenidos a nuestro catálogo oficial!"
          />
        </section>

        {/* Sección 5: Subida de Banner y Logo a Cloudinary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SubidorImagen
            label="Logo Comercial"
            imagenUrlActual={logoUrl}
            onImagenCargada={(url) => setLogoUrl(url)}
            onImagenEliminada={() => setLogoUrl(null)}
          />
          <SubidorImagen
            label="Banner de Portada"
            imagenUrlActual={bannerUrl}
            onImagenCargada={(url) => setBannerUrl(url)}
            onImagenEliminada={() => setBannerUrl(null)}
          />
        </section>

        <MensajeError codigo={codigoError} />

        {mensajeExito ? (
          <p role="status" className="text-sm font-medium text-emerald-400">
            {mensajeExito}
          </p>
        ) : null}

        <button
          type="button"
          onClick={manejarGuardarCambios}
          disabled={estaGuardando}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#16D39A] px-4 font-semibold text-slate-950 transition-colors hover:bg-[#16D39A]/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{estaGuardando ? "Guardando..." : "Guardar Cambios"}</span>
        </button>
      </div>

      {/* Columna Derecha: Simulador Live Preview en Tiempo Real (iframe) */}
      <div className="flex w-full flex-col bg-slate-900/50 p-6 lg:w-1/2">
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Simulador Live Preview
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setModoDispositivo("desktop")}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                modoDispositivo === "desktop" ? "bg-slate-800 text-[#16D39A]" : "text-slate-400"
              }`}
              title="Vista de Escritorio"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setModoDispositivo("mobile")}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                modoDispositivo === "mobile" ? "bg-slate-800 text-[#16D39A]" : "text-slate-400"
              }`}
              title="Vista Móvil"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-6">
          <div
            className={`relative overflow-hidden rounded-2xl border-4 border-slate-800 bg-slate-950 shadow-2xl transition-all duration-300 ${
              modoDispositivo === "mobile" ? "h-[640px] w-[360px]" : "h-[640px] w-full"
            }`}
          >
            <iframe
              ref={iframeRef}
              src={`/c/${clienteSlug}?preview=true`}
              title="Previsualización del Catálogo Web"
              className="h-full w-full border-0 bg-white"
              onLoad={transmitirCambiosLivePreview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
