"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, CheckCircle, Percent, DollarSign } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { actualizarPreciosLote } from "@/services/productos/actualizarPreciosLote";
import { ESTADO_ACTUALIZAR_PRECIOS_LOTE_INICIAL } from "@/services/productos/tipos";

interface ItemSelector {
  id: string;
  nombre: string;
}

interface EditorPreciosMasivosProps {
  categorias: ItemSelector[];
  marcas: ItemSelector[];
  proveedores: ItemSelector[];
  conteoTodos: number;
  conteoCategorias: Record<string, number>;
  conteoMarcas: Record<string, number>;
  conteoProveedores: Record<string, number>;
}

export function EditorPreciosMasivos({
  categorias,
  marcas,
  proveedores,
  conteoTodos,
  conteoCategorias,
  conteoMarcas,
  conteoProveedores,
}: EditorPreciosMasivosProps) {
  const router = useRouter();
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "categoria_id" | "marca_id" | "proveedor_id">("todos");
  const [filtroId, setFiltroId] = useState<string>("");
  const [tipoAjuste, setTipoAjuste] = useState<"porcentaje" | "monto">("porcentaje");
  const [valor, setValor] = useState<string>("");
  
  const [confirmarCambios, setConfirmarCambios] = useState<boolean>(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [exitoServidor, setExitoServidor] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Calcular la cantidad de productos afectados según la selección actual
  let cantidadAfectada = 0;
  if (tipoFiltro === "todos") {
    cantidadAfectada = conteoTodos;
  } else if (tipoFiltro === "categoria_id") {
    cantidadAfectada = conteoCategorias[filtroId] ?? 0;
  } else if (tipoFiltro === "marca_id") {
    cantidadAfectada = conteoMarcas[filtroId] ?? 0;
  } else if (tipoFiltro === "proveedor_id") {
    cantidadAfectada = conteoProveedores[filtroId] ?? 0;
  }

  const handleTipoFiltroChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as "todos" | "categoria_id" | "marca_id" | "proveedor_id";
    setTipoFiltro(val);
    setFiltroId("");
    setErrorServidor(null);
    setExitoServidor(null);
  };

  const handleFiltroIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFiltroId(e.target.value);
    setErrorServidor(null);
    setExitoServidor(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorServidor(null);
    setExitoServidor(null);

    const valorNumerico = Number(valor);
    if (isNaN(valorNumerico) || valor === "") {
      setErrorServidor("NX-SYS-006");
      return;
    }

    if (tipoFiltro !== "todos" && !filtroId) {
      setErrorServidor("NX-SYS-006");
      return;
    }

    if (!confirmarCambios) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("tipoFiltro", tipoFiltro);
      if (tipoFiltro !== "todos") {
        formData.append("filtroId", filtroId);
      }
      formData.append("tipoAjuste", tipoAjuste);
      formData.append("valor", valor);

      const resultado = await actualizarPreciosLote(ESTADO_ACTUALIZAR_PRECIOS_LOTE_INICIAL, formData);

      if (resultado.exito) {
        setExitoServidor(resultado.cantidadAfectada ?? 0);
        setValor("");
        setConfirmarCambios(false);
        router.refresh();
      } else {
        setErrorServidor(resultado.error);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl rounded-lg border border-[#222A27] bg-[#111615] p-6 text-slate-50 shadow-xl">
      <div className="border-b border-[#222A27] pb-4 mb-6">
        <h2 className="text-xl font-semibold text-slate-50">Editor Masivo de Precios</h2>
        <p className="text-sm text-slate-400">
          Ajustá el precio de múltiples productos de forma simultánea.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorServidor && <MensajeError codigo={errorServidor} className="w-full" />}

        {exitoServidor !== null && (
          <div className="flex items-center gap-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">
              Se actualizaron los precios de {exitoServidor} productos con éxito.
            </span>
          </div>
        )}

        {/* Tipo de Filtro */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Filtrar productos a modificar
          </label>
          <select
            value={tipoFiltro}
            onChange={handleTipoFiltroChange}
            className="w-full rounded-md border border-[#222A27] bg-[#0D1110] px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 outline-none"
          >
            <option value="todos">Todos los productos</option>
            <option value="categoria_id">Por Categoría</option>
            <option value="marca_id">Por Marca</option>
            <option value="proveedor_id">Por Proveedor</option>
          </select>
        </div>

        {/* Filtro ID (depende del tipo) */}
        {tipoFiltro !== "todos" && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Seleccionar {tipoFiltro === "categoria_id" ? "Categoría" : tipoFiltro === "marca_id" ? "Marca" : "Proveedor"}
            </label>
            <select
              value={filtroId}
              onChange={handleFiltroIdChange}
              required
              className="w-full rounded-md border border-[#222A27] bg-[#0D1110] px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 outline-none"
            >
              <option value="">-- Seleccionar --</option>
              {tipoFiltro === "categoria_id" &&
                categorias.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              {tipoFiltro === "marca_id" &&
                marcas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              {tipoFiltro === "proveedor_id" &&
                proveedores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Tipo de Ajuste */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Tipo de ajuste de precio
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="tipoAjuste"
                value="porcentaje"
                checked={tipoAjuste === "porcentaje"}
                onChange={() => setTipoAjuste("porcentaje")}
                className="accent-emerald-500"
              />
              <span className="flex items-center gap-1 text-slate-200">
                <Percent className="h-4 w-4 text-slate-400" />
                Porcentaje (%)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="tipoAjuste"
                value="monto"
                checked={tipoAjuste === "monto"}
                onChange={() => setTipoAjuste("monto")}
                className="accent-emerald-500"
              />
              <span className="flex items-center gap-1 text-slate-200">
                <DollarSign className="h-4 w-4 text-slate-400" />
                Valor nominal ($)
              </span>
            </label>
          </div>
        </div>

        {/* Valor de Cambio */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Valor de cambio (usar negativo para descontar)
          </label>
          <input
            type="number"
            step="any"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={tipoAjuste === "porcentaje" ? "Ej: 15 o -10" : "Ej: 500 o -250"}
            disabled={isPending}
            required
            className="w-full rounded-md border border-[#222A27] bg-[#0D1110] px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Advertencia Preventiva */}
        <div className="flex items-start gap-3 rounded-md bg-amber-500/10 border border-amber-500/20 p-4 text-amber-400 mt-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Advertencia de seguridad</span>
            <span className="text-xs text-amber-500/90 leading-relaxed">
              Esta operación afectará directamente a <strong className="text-amber-400 font-bold">{cantidadAfectada} productos</strong>. 
              El cálculo e inserción de logs históricos de auditoría se ejecutará de forma atómica y permanente. 
              No se puede deshacer una vez confirmado.
            </span>
          </div>
        </div>

        {/* Confirmación Checkbox (Doble Check) */}
        <div className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            id="confirmarCambios"
            checked={confirmarCambios}
            onChange={(e) => setConfirmarCambios(e.target.checked)}
            disabled={isPending || cantidadAfectada === 0}
            className="h-4.5 w-4.5 accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
          <label
            htmlFor="confirmarCambios"
            className="text-xs text-slate-300 font-medium cursor-pointer select-none"
          >
            Confirmo que deseo aplicar este ajuste de precios a los {cantidadAfectada} productos seleccionados.
          </label>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 border-t border-[#222A27] pt-4 mt-2">
          <button
            type="submit"
            disabled={isPending || !confirmarCambios || cantidadAfectada === 0}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-colors flex items-center justify-center min-w-[150px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Aplicar Ajuste"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
