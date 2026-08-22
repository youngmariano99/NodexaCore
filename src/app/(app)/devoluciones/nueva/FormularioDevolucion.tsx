"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { registrarDevolucion } from "@/services/devoluciones/registrarDevolucion";
import { ESTADO_REGISTRAR_DEVOLUCION_INICIAL } from "@/services/devoluciones/tipos";

interface ItemVenta {
  venta_item_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  productos: {
    nombre: string;
    sku: string;
  } | null;
}

interface FormularioDevolucionProps {
  ventaId: string;
  itemsVenta: ItemVenta[];
}

export function FormularioDevolucion({ ventaId, itemsVenta }: FormularioDevolucionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [motivo, setMotivo] = useState("");
  // Almacenar selección de ítems: { [ventaItemId]: boolean }
  const [itemsSeleccionados, setItemsSeleccionados] = useState<Record<string, boolean>>(
    itemsVenta.reduce((acc, item) => ({ ...acc, [item.venta_item_id]: false }), {})
  );
  // Almacenar cantidades a devolver: { [ventaItemId]: string }
  const [cantidadesDevolver, setCantidadesDevolver] = useState<Record<string, string>>(
    itemsVenta.reduce((acc, item) => ({ ...acc, [item.venta_item_id]: String(item.cantidad) }), {})
  );

  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleCheckboxChange = (ventaItemId: string) => {
    setItemsSeleccionados((prev) => ({ ...prev, [ventaItemId]: !prev[ventaItemId] }));
  };

  const handleCantidadChange = (ventaItemId: string, valor: string) => {
    setCantidadesDevolver((prev) => ({ ...prev, [ventaItemId]: valor }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    // Filtrar los ítems seleccionados
    const itemsParaEnviar = itemsVenta.filter((item) => itemsSeleccionados[item.venta_item_id]);

    if (itemsParaEnviar.length === 0) {
      setErrorLocal("La devolución necesita al menos un ítem.");
      return;
    }

    if (!motivo.trim()) {
      setErrorLocal("El motivo es obligatorio.");
      return;
    }

    const payloadItems: Array<{ ventaItemId: string; cantidad: number }> = [];

    // Validar cantidades a nivel de cliente (Fail-Fast)
    for (const item of itemsParaEnviar) {
      const cantStr = cantidadesDevolver[item.venta_item_id];
      const cantNum = Number(cantStr);

      if (!cantStr || Number.isNaN(cantNum) || !Number.isInteger(cantNum) || cantNum <= 0) {
        setErrorLocal("La cantidad a devolver debe ser un número entero mayor a cero.");
        return;
      }

      // Dado un intento de devolver más unidades de las compradas originalmente, lanza NX-DEV-002
      if (cantNum > item.cantidad) {
        setErrorLocal("NX-DEV-002");
        return;
      }

      payloadItems.push({
        ventaItemId: item.venta_item_id,
        cantidad: cantNum,
      });
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("venta_id", ventaId);
      formData.append("motivo", motivo);
      formData.append("items", JSON.stringify(payloadItems));

      const resultado = await registrarDevolucion(
        ESTADO_REGISTRAR_DEVOLUCION_INICIAL,
        formData
      );

      if (resultado.exito) {
        router.push("/devoluciones");
        router.refresh();
      } else {
        setErrorLocal(resultado.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errorLocal && (
        <MensajeError codigo={errorLocal} className="w-full" />
      )}

      {/* Motivo de la Devolución */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Motivo de la Devolución
        </label>
        <textarea
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Producto fallado o vencido..."
          required
          disabled={isPending}
          className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
      </div>

      {/* Ítems para seleccionar */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Seleccione los productos a devolver
        </span>
        <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-900/30">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                <th className="px-4 py-3 font-medium w-12 text-center">Sel.</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium text-center">Comprado</th>
                <th className="px-4 py-3 font-medium text-right w-36">Cant. a devolver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {itemsVenta.map((item) => {
                const seleccionado = itemsSeleccionados[item.venta_item_id];
                return (
                  <tr key={item.venta_item_id} className="hover:bg-slate-900/45 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={seleccionado}
                        onChange={() => handleCheckboxChange(item.venta_item_id)}
                        disabled={isPending}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-850 text-emerald-500 focus:ring-emerald-500 outline-none cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">{item.productos?.nombre || "Producto no disponible"}</span>
                        <span className="font-mono text-xs text-slate-500">{item.productos?.sku || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-200 font-mono">
                      {item.cantidad}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min="1"
                        max={item.cantidad}
                        step="1"
                        value={cantidadesDevolver[item.venta_item_id]}
                        onChange={(e) => handleCantidadChange(item.venta_item_id, e.target.value)}
                        disabled={!seleccionado || isPending}
                        className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-right text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-40 disabled:pointer-events-none font-mono"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-11 items-center justify-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors duration-150 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "Confirmar Devolución"
        )}
      </button>
    </form>
  );
}
