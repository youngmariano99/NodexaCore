import type { SupabaseClient } from "@supabase/supabase-js";
import {
  contarRepartidoresActivos,
  crearRepartidor as crearRepartidorRepo,
  type RepartidorEntity,
} from "@/repositories/deliverysRepository";

export interface CrearRepartidorInput {
  nombre: string;
  telefono: string;
  pin_acceso: string;
}

export interface ResultadoCrearRepartidor {
  exito: boolean;
  repartidor?: RepartidorEntity;
  error?: string;
}

export const MAXIMO_REPARTIDORES_ACTIVOS = 2;

/**
 * Servicio de creación de cuenta de repartidor.
 * Criterio de Aceptación: Si el comercio intenta registrar un tercer repartidor activo,
 * retorna el código de error `NX-DELIV-001`.
 */
export async function crearRepartidor(
  supabase: SupabaseClient,
  clienteId: string,
  input: CrearRepartidorInput
): Promise<ResultadoCrearRepartidor> {
  // 1. Validar campos requeridos
  if (!input.nombre.trim() || !input.telefono.trim() || !input.pin_acceso.trim()) {
    return {
      exito: false,
      error: "NX-SYS-006",
    };
  }

  // 2. Verificar cupo máximo de 2 repartidores activos (NX-DELIV-001)
  const cantidadActivos = await contarRepartidoresActivos(supabase, clienteId);
  if (cantidadActivos >= MAXIMO_REPARTIDORES_ACTIVOS) {
    return {
      exito: false,
      error: "NX-DELIV-001",
    };
  }

  // 3. Crear el nuevo repartidor en la base de datos
  try {
    const repartidor = await crearRepartidorRepo(supabase, clienteId, input);
    return {
      exito: true,
      repartidor,
    };
  } catch {
    return {
      exito: false,
      error: "NX-SYS-001",
    };
  }
}
