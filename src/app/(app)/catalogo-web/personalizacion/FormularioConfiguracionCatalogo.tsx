"use client";

import { Clock, Megaphone, Plus, Save, Trash2, Truck, AlertCircle } from "lucide-react";
import { useState } from "react";

import { MensajeError } from "@/components/errores/MensajeError";
import { verificarHorarioAtencion } from "@/lib/dominio/catalogoWeb/verificarHorarioAtencion";

export interface ZonaEnvioConfig {
  id: string;
  nombre: string;
  costo: number;
}

export interface ConfiguracionCatalogoData {
  horarioApertura: string;
  horarioCierre: string;
  horarioActivo: boolean;
  bannerTexto: string;
  bannerActivo: boolean;
  zonasEnvio: ZonaEnvioConfig[];
}

interface FormularioConfiguracionCatalogoProps {
  configuracionInicial?: Partial<ConfiguracionCatalogoData>;
}

const CONFIG_POR_DEFECTO: ConfiguracionCatalogoData = {
  horarioApertura: "09:00",
  horarioCierre: "21:00",
  horarioActivo: true,
  bannerTexto: "🔥 10% OFF pagando en efectivo al retirar",
  bannerActivo: true,
  zonasEnvio: [
    { id: "z1", nombre: "Centro / Microcentro", costo: 500 },
    { id: "z2", nombre: "Barrios Aledaños", costo: 900 },
  ],
};

export function FormularioConfiguracionCatalogo({
  configuracionInicial,
}: FormularioConfiguracionCatalogoProps) {
  const [horarioApertura, setHorarioApertura] = useState(
    configuracionInicial?.horarioApertura ?? CONFIG_POR_DEFECTO.horarioApertura
  );
  const [horarioCierre, setHorarioCierre] = useState(
    configuracionInicial?.horarioCierre ?? CONFIG_POR_DEFECTO.horarioCierre
  );
  const [horarioActivo, setHorarioActivo] = useState(
    configuracionInicial?.horarioActivo ?? CONFIG_POR_DEFECTO.horarioActivo
  );

  const [bannerTexto, setBannerTexto] = useState(
    configuracionInicial?.bannerTexto ?? CONFIG_POR_DEFECTO.bannerTexto
  );
  const [bannerActivo, setBannerActivo] = useState(
    configuracionInicial?.bannerActivo ?? CONFIG_POR_DEFECTO.bannerActivo
  );

  const [zonasEnvio, setZonasEnvio] = useState<ZonaEnvioConfig[]>(
    configuracionInicial?.zonasEnvio ?? CONFIG_POR_DEFECTO.zonasEnvio
  );

  const [estaGuardando, setEstaGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [codigoError, setCodigoError] = useState<string | null>(null);

  // Previsualizar el estado del horario de atención actual
  const evaluacionHorario = verificarHorarioAtencion(horarioApertura, horarioCierre, horarioActivo);

  const agregarZonaEnvio = () => {
    const nuevaZona: ZonaEnvioConfig = {
      id: `zona-${Date.now()}`,
      nombre: "Nueva Zona de Envío",
      costo: 500,
    };
    setZonasEnvio([...zonasEnvio, nuevaZona]);
  };

  const actualizarZona = (id: string, campo: "nombre" | "costo", valor: string | number) => {
    setZonasEnvio(
      zonasEnvio.map((z) => (z.id === id ? { ...z, [campo]: valor } : z))
    );
  };

  const eliminarZona = (id: string) => {
    setZonasEnvio(zonasEnvio.filter((z) => z.id !== id));
  };

  const manejarGuardar = async () => {
    setEstaGuardando(true);
    setMensajeExito(null);
    setCodigoError(null);

    // Validar costos de envío válidos
    const tieneCostoInvalido = zonasEnvio.some((z) => z.costo < 0 || Number.isNaN(z.costo));
    if (tieneCostoInvalido) {
      setCodigoError("NX-SYS-006");
      setEstaGuardando(false);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setMensajeExito("Configuración de horarios, banners y envíos actualizada correctamente.");
    } catch {
      setCodigoError("NX-SYS-001");
    } finally {
      setEstaGuardando(false);
    }
  };

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-slate-100 shadow-xl">
      <header className="flex flex-col gap-1 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-50">
          Configuración Administrativa de Horarios & Pedidos
        </h1>
        <p className="text-xs text-slate-400">
          Gestión de horario de apertura/cierre, banners flotantes de ofertas y costo de envío por zona.
        </p>
      </header>

      {/* Sección 1: Horarios de Atención */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#16D39A]" />
            <h2 className="text-base font-semibold text-slate-100">Horarios de Atención</h2>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={horarioActivo}
            onClick={() => setHorarioActivo(!horarioActivo)}
            className={`flex min-h-11 min-w-14 items-center rounded-full p-1 transition-colors ${
              horarioActivo ? "bg-[#16D39A] justify-end" : "bg-slate-700 justify-start"
            }`}
          >
            <span className="h-6 w-6 rounded-full bg-slate-950 shadow-md" />
          </button>
        </div>

        {horarioActivo && (
          <div className="flex flex-col gap-4 pt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="horarioApertura" className="text-xs font-medium text-slate-300">
                  Hora de Apertura
                </label>
                <input
                  id="horarioApertura"
                  type="time"
                  value={horarioApertura}
                  onChange={(e) => setHorarioApertura(e.target.value)}
                  className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-100 focus:border-[#16D39A] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="horarioCierre" className="text-xs font-medium text-slate-300">
                  Hora de Cierre
                </label>
                <input
                  id="horarioCierre"
                  type="time"
                  value={horarioCierre}
                  onChange={(e) => setHorarioCierre(e.target.value)}
                  className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-100 focus:border-[#16D39A] focus:outline-none"
                />
              </div>
            </div>

            {/* Aviso de previsualización del horario en catálogo */}
            <div
              className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${
                evaluacionHorario.estaAbierto
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{evaluacionHorario.mensajeApertura}</span>
            </div>
          </div>
        )}
      </section>

      {/* Sección 2: Banner Flotante de Ofertas */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#16D39A]" />
            <h2 className="text-base font-semibold text-slate-100">Banner Flotante de Ofertas</h2>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={bannerActivo}
            onClick={() => setBannerActivo(!bannerActivo)}
            className={`flex min-h-11 min-w-14 items-center rounded-full p-1 transition-colors ${
              bannerActivo ? "bg-[#16D39A] justify-end" : "bg-slate-700 justify-start"
            }`}
          >
            <span className="h-6 w-6 rounded-full bg-slate-950 shadow-md" />
          </button>
        </div>

        {bannerActivo && (
          <div className="flex flex-col gap-1.5 pt-2">
            <label htmlFor="bannerTexto" className="text-xs font-medium text-slate-300">
              Texto del Anuncio / Oferta Promocional
            </label>
            <input
              id="bannerTexto"
              type="text"
              value={bannerTexto}
              onChange={(e) => setBannerTexto(e.target.value)}
              placeholder="ej. 🔥 15% OFF abonando en efectivo al retirar"
              className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-100 focus:border-[#16D39A] focus:outline-none"
            />
          </div>
        )}
      </section>

      {/* Sección 3: Costos de Envío por Zonas */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#16D39A]" />
            <h2 className="text-base font-semibold text-slate-100">Zonas de Envío & Tarifas</h2>
          </div>
          <button
            type="button"
            onClick={agregarZonaEnvio}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[#16D39A]/10 px-3 text-xs font-bold text-[#16D39A] transition-colors hover:bg-[#16D39A]/20"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Zona</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {zonasEnvio.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              No hay zonas de envío configuradas. El envío figurará a coordinar.
            </p>
          ) : (
            zonasEnvio.map((zona) => (
              <div key={zona.id} className="flex items-center gap-3">
                <input
                  type="text"
                  value={zona.nombre}
                  onChange={(e) => actualizarZona(zona.id, "nombre", e.target.value)}
                  placeholder="Nombre de la zona"
                  className="min-h-11 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-100 focus:border-[#16D39A] focus:outline-none"
                />
                <div className="relative flex w-36 items-center">
                  <span className="absolute left-3 text-xs text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={zona.costo}
                    onChange={(e) =>
                      actualizarZona(zona.id, "costo", Number.parseFloat(e.target.value) || 0)
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 pl-7 pr-3 text-sm text-slate-100 focus:border-[#16D39A] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => eliminarZona(zona.id)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  title="Eliminar zona"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <MensajeError codigo={codigoError} />

      {mensajeExito && (
        <p role="status" className="text-sm font-medium text-emerald-400">
          {mensajeExito}
        </p>
      )}

      <button
        type="button"
        onClick={manejarGuardar}
        disabled={estaGuardando}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#16D39A] px-4 font-bold text-slate-950 transition-colors hover:bg-[#16D39A]/90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        <span>{estaGuardando ? "Guardando cambios..." : "Guardar Configuración"}</span>
      </button>
    </div>
  );
}
