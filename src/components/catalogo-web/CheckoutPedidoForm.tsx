"use client";

import { CreditCard, MapPin, Phone, Truck, User, Send, Store } from "lucide-react";
import { type FormEvent, useState } from "react";

import { MensajeError } from "@/components/errores/MensajeError";
import { usePersistedForm } from "@/hooks/usePersistedForm";

export interface DatosFormularioCheckout {
  nombre: string;
  telefono: string;
  direccion: string;
  metodoPago: "efectivo" | "transferencia" | "tarjeta" | string;
  opcionEntrega: "envio" | "retiro";
  notas: string;
}

const VALORES_INICIALES: DatosFormularioCheckout = {
  nombre: "",
  telefono: "",
  direccion: "",
  metodoPago: "efectivo",
  opcionEntrega: "envio",
  notas: "",
};

const CLAVE_STORAGE_CHECKOUT = "nodexa_pwa_checkout_cliente";

interface CheckoutPedidoFormProps {
  onConfirmarPedido: (datos: DatosFormularioCheckout) => void;
  estaEnviando?: boolean;
}

export function CheckoutPedidoForm({
  onConfirmarPedido,
  estaEnviando = false,
}: CheckoutPedidoFormProps) {
  const { values, setFieldValue } = usePersistedForm<DatosFormularioCheckout>(
    CLAVE_STORAGE_CHECKOUT,
    VALORES_INICIALES
  );

  const [codigoError, setCodigoError] = useState<string | null>(null);

  const manejarEnvio = (e: FormEvent) => {
    e.preventDefault();
    setCodigoError(null);

    if (!values.nombre.trim()) {
      setCodigoError("NX-SYS-006");
      return;
    }

    if (!values.telefono.trim()) {
      setCodigoError("NX-SYS-006");
      return;
    }

    if (values.opcionEntrega === "envio" && !values.direccion.trim()) {
      setCodigoError("NX-SYS-006");
      return;
    }

    onConfirmarPedido(values);
  };

  return (
    <form
      onSubmit={manejarEnvio}
      className="flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-slate-100 shadow-xl backdrop-blur-md"
    >
      <header className="flex flex-col gap-1 border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold text-slate-50">Datos para la Entrega & Pedido</h2>
        <p className="text-xs text-slate-400">
          Tus datos se guardan en tu dispositivo para agilizar tus próximas compras.
        </p>
      </header>

      {/* Opción de Entrega: Envío a Domicilio vs Retiro en Local */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Modo de Entrega
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFieldValue("opcionEntrega", "envio")}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${
              values.opcionEntrega === "envio"
                ? "border-[#16D39A] bg-[#16D39A]/10 text-slate-50"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
            }`}
          >
            <Truck className="h-4 w-4 text-[#16D39A]" />
            <span>Envío a Domicilio</span>
          </button>

          <button
            type="button"
            onClick={() => setFieldValue("opcionEntrega", "retiro")}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${
              values.opcionEntrega === "retiro"
                ? "border-[#16D39A] bg-[#16D39A]/10 text-slate-50"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
            }`}
          >
            <Store className="h-4 w-4 text-[#16D39A]" />
            <span>Retiro en Local</span>
          </button>
        </div>
      </div>

      {/* Campo: Nombre del Cliente */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <User className="h-4 w-4 text-[#16D39A]" />
          <span>Nombre Completo *</span>
        </label>
        <input
          id="nombre"
          type="text"
          required
          value={values.nombre}
          onChange={(e) => setFieldValue("nombre", e.target.value)}
          placeholder="ej. Juan Pérez"
          className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#16D39A] focus:outline-none"
        />
      </div>

      {/* Campo: Teléfono de Contacto */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="telefono" className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Phone className="h-4 w-4 text-[#16D39A]" />
          <span>Teléfono Celular *</span>
        </label>
        <input
          id="telefono"
          type="tel"
          required
          value={values.telefono}
          onChange={(e) => setFieldValue("telefono", e.target.value)}
          placeholder="ej. 11 2345-6789"
          className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#16D39A] focus:outline-none"
        />
      </div>

      {/* Campo: Dirección de Envío (Si aplica) */}
      {values.opcionEntrega === "envio" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="direccion" className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <MapPin className="h-4 w-4 text-[#16D39A]" />
            <span>Dirección de Entrega *</span>
          </label>
          <input
            id="direccion"
            type="text"
            required
            value={values.direccion}
            onChange={(e) => setFieldValue("direccion", e.target.value)}
            placeholder="ej. Av. San Martín 456, Piso 2 B"
            className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#16D39A] focus:outline-none"
          />
        </div>
      )}

      {/* Campo: Método de Pago */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <CreditCard className="h-4 w-4 text-[#16D39A]" />
          <span>Método de Pago Preferido</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "efectivo", label: "Efectivo", desc: "10% OFF" },
            { id: "transferencia", label: "Transferencia", desc: "Precio Lista" },
            { id: "tarjeta", label: "Tarjeta", desc: "Recargo 5%" },
          ].map((mp) => {
            const activo = values.metodoPago === mp.id;
            return (
              <button
                key={mp.id}
                type="button"
                onClick={() => setFieldValue("metodoPago", mp.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all ${
                  activo
                    ? "border-[#16D39A] bg-[#16D39A]/10 text-slate-50"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                }`}
              >
                <span className="text-xs font-bold">{mp.label}</span>
                <span className="text-2xs text-[#16D39A]">{mp.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campo: Notas Adicionales */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notas" className="text-xs font-medium text-slate-400">
          Aclaraciones / Comentarios para el pedido (Opcional)
        </label>
        <textarea
          id="notas"
          rows={2}
          value={values.notas}
          onChange={(e) => setFieldValue("notas", e.target.value)}
          placeholder="ej. Tocar timbre 2B, entregar antes de las 18hs"
          className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#16D39A] focus:outline-none"
        />
      </div>

      <MensajeError codigo={codigoError} />

      <button
        type="submit"
        disabled={estaEnviando}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#16D39A] px-4 font-bold text-slate-950 transition-colors hover:bg-[#16D39A]/90 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        <span>{estaEnviando ? "Enviando pedido..." : "Confirmar Pedido por WhatsApp"}</span>
      </button>
    </form>
  );
}
