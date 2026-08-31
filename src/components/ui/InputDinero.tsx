"use client";

import React, { useState, useEffect, forwardRef } from "react";

export interface InputDineroProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> {
  value?: number | string;
  defaultValue?: number | string;
  onValueChange?: (value: number, rawFormatted: string) => void;
  nombre?: string;
}

/**
 * Formatea un número o string a formato moneda local argentino (ej: 1250000 -> 1.250.000).
 */
export function formatearMascaraMoneda(valor: string | number | undefined | null): string {
  if (valor === undefined || valor === null || valor === "") return "";
  const str = String(valor).trim().replace(/^\$\s*/, "");
  if (str === "") return "";

  let parteEntera = "";
  let parteDecimal = "";

  if (str.includes(",")) {
    const partes = str.split(",");
    parteEntera = (partes[0] ?? "").replace(/\D/g, "");
    parteDecimal = partes[1] !== undefined ? partes[1].replace(/\D/g, "").slice(0, 2) : "";
  } else if (str.includes(".")) {
    const partes = str.split(".");
    if (partes.length === 2 && partes[1] !== undefined && partes[1].length <= 2) {
      parteEntera = (partes[0] ?? "").replace(/\D/g, "");
      parteDecimal = partes[1].replace(/\D/g, "").slice(0, 2);
    } else {
      parteEntera = str.replace(/\D/g, "");
    }
  } else {
    parteEntera = str.replace(/\D/g, "");
  }

  if (!parteEntera && !parteDecimal) return "";

  const formateada = parteEntera ? Number(parteEntera).toLocaleString("es-AR") : "0";
  return parteDecimal ? `${formateada},${parteDecimal}` : formateada;
}

/**
 * Convierte el valor con máscara local a un valor numérico real.
 */
export function desformatearMascaraMoneda(valor: string): number {
  if (!valor) return 0;
  const limpio = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpio);
  return isNaN(num) ? 0 : num;
}

export const InputDinero = forwardRef<HTMLInputElement, InputDineroProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      name,
      nombre,
      className = "",
      placeholder = "0,00",
      disabled = false,
      required = false,
      id,
      ...props
    },
    ref
  ) => {
    const inputName = name || nombre;
    const [displayValue, setDisplayValue] = useState<string>(() => {
      const initial = value !== undefined ? value : defaultValue;
      return formatearMascaraMoneda(initial);
    });

    useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(formatearMascaraMoneda(value));
      }
    }, [value]);

    const manejarCambio = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const soloMoneda = rawInput.replace(/[^\d.,]/g, "");

      const partesComa = soloMoneda.split(",");
      let valorLimpio = partesComa[0];
      if (partesComa.length > 1) {
        valorLimpio += "," + partesComa.slice(1).join("").slice(0, 2);
      }

      const formateado = formatearMascaraMoneda(valorLimpio);
      setDisplayValue(formateado);

      const numerico = desformatearMascaraMoneda(formateado);
      if (onValueChange) {
        onValueChange(numerico, formateado);
      }
    };

    return (
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 text-xs font-semibold text-slate-400">
          $
        </span>
        <input
          {...props}
          ref={ref}
          id={id}
          name={inputName}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={displayValue}
          onChange={manejarCambio}
          placeholder={placeholder}
          className={`w-full rounded-md border border-[#222A27] bg-[#111615] pl-7 pr-3 py-2 text-sm text-slate-50 placeholder-slate-500 transition-colors focus:border-[#16D39A] focus:outline-none focus:ring-1 focus:ring-[#16D39A] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
      </div>
    );
  }
);

InputDinero.displayName = "InputDinero";
