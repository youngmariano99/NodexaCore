"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearCliente } from "@/services/admin/crearCliente";
import { ESTADO_CREAR_CLIENTE_INICIAL, type ModuloNodexa, NOMBRE_MODULO_NODEXA } from "@/services/admin/tipos";

export function FormularioAltaClienteAdmin() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [limiteSku, setLimiteSku] = useState("1000");
  const [modulosSeleccionados, setModulosSeleccionados] = useState<Record<ModuloNodexa, boolean>>({
    catalogo_web: false,
    carga_ia: false,
    fiados: false,
    devoluciones: false,
    bot_whatsapp: false,
  });

  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCheckboxChange = (modulo: ModuloNodexa) => {
    setModulosSeleccionados((prev) => ({ ...prev, [modulo]: !prev[modulo] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!nombre.trim()) {
      setErrorLocal("El nombre del comercio es obligatorio.");
      return;
    }

    if (!slug.trim()) {
      setErrorLocal("El slug es obligatorio.");
      return;
    }

    if (!whatsapp.trim()) {
      setErrorLocal("El teléfono de WhatsApp es obligatorio.");
      return;
    }

    const cantSku = Number(limiteSku);
    if (Number.isNaN(cantSku) || !Number.isInteger(cantSku) || cantSku <= 0) {
      setErrorLocal("El límite SKU debe ser un número entero positivo.");
      return;
    }

    // Filtrar módulos seleccionados
    const modulosArray = (Object.keys(modulosSeleccionados) as ModuloNodexa[]).filter(
      (m) => modulosSeleccionados[m]
    );

    startTransition(async () => {
      const formData = new FormData();
      formData.append("nombre_comercio", nombre.trim());
      formData.append("slug", slug.trim().toLowerCase());
      formData.append("telefono_whatsapp", whatsapp.trim());
      formData.append("limite_sku", String(cantSku));
      formData.append("modulos", JSON.stringify(modulosArray));

      const res = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, formData);

      if (res.exito) {
        router.push("/admin/clientes");
        router.refresh();
      } else {
        setErrorLocal(res.error);
      }
    });
  };

  const listadoModulos = Object.keys(NOMBRE_MODULO_NODEXA) as ModuloNodexa[];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
      {errorLocal && (
        <MensajeError codigo={errorLocal} className="w-full" />
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
          placeholder="Ej: Tienda de Calzados"
          className="min-h-11 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Slug de la Vidriera
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          disabled={isPending}
          placeholder="Ej: tienda-calzados"
          className="min-h-11 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
        />
        <p className="text-[11px] text-slate-500 leading-normal">
          Solo minúsculas, números y guiones medios (ej. almacen-pedro).
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Teléfono de WhatsApp
        </label>
        <input
          type="text"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          required
          disabled={isPending}
          placeholder="Ej: +5492920000000"
          className="min-h-11 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Límite SKU Inicial
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={limiteSku}
          onChange={(e) => setLimiteSku(e.target.value)}
          required
          disabled={isPending}
          placeholder="Ej: 1000"
          className="min-h-11 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
        />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Módulos Activos Iniciales
        </span>
        <div className="grid gap-3 sm:grid-cols-2 rounded-md border border-slate-800 bg-slate-900/30 p-4">
          {listadoModulos.map((modulo) => (
            <label
              key={modulo}
              className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={modulosSeleccionados[modulo]}
                onChange={() => handleCheckboxChange(modulo)}
                disabled={isPending}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 outline-none"
              />
              <span>{NOMBRE_MODULO_NODEXA[modulo]}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-11 items-center justify-center rounded-md bg-blue-500 px-4 text-sm font-semibold text-slate-50 hover:bg-blue-400 transition-colors duration-150 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "Crear Comercio"
        )}
      </button>
    </form>
  );
}
