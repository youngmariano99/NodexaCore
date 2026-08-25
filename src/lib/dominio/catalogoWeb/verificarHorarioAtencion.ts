export interface ResultadoHorarioAtencion {
  estaAbierto: boolean;
  mensajeApertura: string;
}

/**
 * Evalúa si el comercio se encuentra dentro de su horario de atención configurado.
 * Criterio de Aceptación: Fuera del horario de atención, el botón Confirmar Pedido
 * debe reemplazarse por un mensaje indicando el horario de apertura.
 */
export function verificarHorarioAtencion(
  horarioApertura?: string | null,
  horarioCierre?: string | null,
  horarioActivo: boolean = true,
  fechaEvaluar: Date = new Date()
): ResultadoHorarioAtencion {
  if (!horarioActivo || !horarioApertura || !horarioCierre) {
    return {
      estaAbierto: true,
      mensajeApertura: "Abierto las 24 horas",
    };
  }

  const [horaAperturaNum, minAperturaNum] = horarioApertura.split(":").map(Number);
  const [horaCierreNum, minCierreNum] = horarioCierre.split(":").map(Number);

  if (
    horaAperturaNum === undefined ||
    minAperturaNum === undefined ||
    horaCierreNum === undefined ||
    minCierreNum === undefined ||
    Number.isNaN(horaAperturaNum) ||
    Number.isNaN(minAperturaNum) ||
    Number.isNaN(horaCierreNum) ||
    Number.isNaN(minCierreNum)
  ) {
    return {
      estaAbierto: true,
      mensajeApertura: "Abierto",
    };
  }

  const minutosActuales = fechaEvaluar.getHours() * 60 + fechaEvaluar.getMinutes();
  const minutosInicio = horaAperturaNum * 60 + minAperturaNum;
  const minutosFin = horaCierreNum * 60 + minCierreNum;

  let abierto = false;
  if (minutosInicio <= minutosFin) {
    // Horario habitual del mismo día (ej: 09:00 a 21:00)
    abierto = minutosActuales >= minutosInicio && minutosActuales <= minutosFin;
  } else {
    // Horario nocturno que cruza medianoche (ej: 20:00 a 03:00)
    abierto = minutosActuales >= minutosInicio || minutosActuales <= minutosFin;
  }

  if (!abierto) {
    return {
      estaAbierto: false,
      mensajeApertura: `Local actualmente cerrado. Horario de atención: de ${horarioApertura} a ${horarioCierre} hs.`,
    };
  }

  return {
    estaAbierto: true,
    mensajeApertura: `Abierto hoy hasta las ${horarioCierre} hs.`,
  };
}
