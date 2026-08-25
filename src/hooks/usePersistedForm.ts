"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook personalizado para persistir datos de formulario en localStorage en tiempo real.
 * Criterio de Aceptación: Pre-carga los datos ingresados en la próxima visita del cliente.
 */
export function usePersistedForm<T extends object>(
  key: string,
  initialValues: T
) {
  const [values, setValues] = useState<T>(() => {
    if (typeof window === "undefined") return initialValues;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...initialValues, ...parsed };
      }
    } catch {
      // Ignorar errores de lectura de storage
    }
    return initialValues;
  });

  // Persistir en localStorage ante cualquier cambio
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(values));
    } catch {
      // Ignorar cuota excedida
    }
  }, [key, values]);

  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignorar
      }
    }
  }, [initialValues, key]);

  return {
    values,
    setValues,
    setFieldValue,
    resetForm,
  };
}
