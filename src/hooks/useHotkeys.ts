"use client";

import { useEffect, useRef } from "react";

export interface HotkeyOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  allowInInputs?: boolean;
}

export type HotkeyCallback = (event: KeyboardEvent) => void;

export interface EventoTecladoMinimo {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

/**
 * Normaliza nombres de teclas a minúsculas o formatos estándar.
 */
export function normalizarTecla(tecla: string): string {
  const t = tecla.trim().toLowerCase();
  if (t === "esc" || t === "escape") return "escape";
  if (t === "return" || t === "enter") return "enter";
  if (t === "space" || t === "spacebar") return " ";
  if (t === "ctrl" || t === "control") return "ctrl";
  if (t === "cmd" || t === "command" || t === "meta") return "meta";
  if (t === "opt" || t === "option" || t === "alt") return "alt";
  return t;
}

/**
 * Comprueba si un elemento HTML es un campo de formulario editable.
 */
export function esElementoInput(elemento: unknown): boolean {
  if (!elemento || typeof elemento !== "object") return false;
  const el = elemento as { tagName?: string; isContentEditable?: boolean };
  if (!el.tagName) return Boolean(el.isContentEditable);
  const tagName = el.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    Boolean(el.isContentEditable)
  );
}

/**
 * Parsea una combinación de teclas como "ctrl+k", "shift+enter", "f2", "escape", "/".
 */
export function parsearCombinacion(combo: string) {
  const partes = combo.split("+").map(normalizarTecla);
  return {
    ctrl: partes.includes("ctrl"),
    shift: partes.includes("shift"),
    alt: partes.includes("alt"),
    meta: partes.includes("meta"),
    key: partes.find((p) => !["ctrl", "shift", "alt", "meta"].includes(p)) || "",
  };
}

/**
 * Evalúa si un evento de teclado coincide con la combinación esperada.
 */
export function coincideEventoConCombinacion(
  event: EventoTecladoMinimo,
  combo: string
): boolean {
  const parsed = parsearCombinacion(combo);
  const eventKey = normalizarTecla(event.key);

  if (parsed.ctrl && !event.ctrlKey) return false;
  if (parsed.shift && !event.shiftKey) return false;
  if (parsed.alt && !event.altKey) return false;
  if (parsed.meta && !event.metaKey) return false;

  return eventKey === parsed.key;
}

/**
 * Hook modular y declarativo para suscribirse a combinaciones de atajos de teclado (hotkeys).
 *
 * @param keys Tecla o combinación (ej. 'Enter', 'Escape', 'F2', 'ctrl+k', '/') o array de combinaciones.
 * @param callback Función a ejecutar cuando se presiona el atajo.
 * @param options Opciones de configuración (enabled, preventDefault, allowInInputs, etc.).
 */
export function useHotkeys(
  keys: string | string[],
  callback: HotkeyCallback,
  options: HotkeyOptions = {}
): void {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    allowInInputs = false,
  } = options;

  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const listaTeclas = Array.isArray(keys) ? keys : [keys];

    function handleKeyDown(event: KeyboardEvent) {
      const enInput = esElementoInput(event.target);

      // Si está en un input y no se permite explícitamente, ignorar
      if (enInput && !allowInInputs) {
        return;
      }

      for (const combo of listaTeclas) {
        if (coincideEventoConCombinacion(event, combo)) {
          if (preventDefault) {
            event.preventDefault();
          }
          if (stopPropagation) {
            event.stopPropagation();
          }
          callbackRef.current(event);
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [keys, enabled, preventDefault, stopPropagation, allowInInputs]);
}
