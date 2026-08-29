import type { SupabaseClient } from "@supabase/supabase-js";

import type { ResultadoRepositorio } from "@/repositories/base/tipos";

export interface SituacionCajaYDeuda {
  cajaTotalRecuperada: number;
  totalVendidoCredito: number;
  deudaTotalCalle: number;
  porcentajeFiadoCobrado: number;
}

export interface ControlClientesMetrics {
  totalClientesPadron: number;
  clientesConDeuda: number;
  clientesSuperanLimite: number;
  deudaPromedio: number;
  deudaMasAlta: number;
  deudaMas30Dias: number;
}

export interface SemaforoRiesgoMetrics {
  modoFacturacionEstimada: "automatico" | "manual";
  facturacionManualMonto: number;
  facturacionRealPos30Dias: number;
  facturacionMensualReferencia: number;
  topeDeudaTolerablePct: number;
  deudaSobreFacturacionPct: number;
  montoMaximoRecomendado: number;
  estadoAlertaRiesgo: "saludable" | "precaucion" | "excesivo";
}

export interface TopDeudorItem {
  clienteFinalId: string;
  nombre: string;
  telefono: string | null;
  saldoDeudor: number;
  limiteCredito: number;
  diasSinPagar: number;
}

export interface ClientePadronEnriquecido {
  clienteFinalId: string;
  nombre: string;
  telefono: string | null;
  limiteCredito: number;
  totalComprado: number;
  totalCobrado: number;
  saldoActual: number;
  porcentajeLimiteUsado: number;
  estadoAlerta: "al_dia" | "precaucion" | "excedido" | "suspendido";
  ultimaCompraFecha: string | null;
  diasSinPagar: number;
  ranking: number;
}

export interface MovimientoLibroDiario {
  movimientoCcId: string;
  creadoEn: string;
  clienteFinalId: string;
  nombreCliente: string;
  tipo: "cargo" | "pago" | "anulacion";
  monto: number;
  montoPendiente: number;
  estadoImputacion: "pendiente" | "parcial" | "total";
  comprobanteTipo: string;
  numeroComprobante: string | null;
  metodoPago: string | null;
  esConsistente: boolean;
}

export interface DashboardCuentasCorrientesCompleto {
  situacionCaja: SituacionCajaYDeuda;
  controlClientes: ControlClientesMetrics;
  semaforoRiesgo: SemaforoRiesgoMetrics;
  top5Deudores: TopDeudorItem[];
  padronClientes: ClientePadronEnriquecido[];
  movimientosLibroDiario: MovimientoLibroDiario[];
}

interface FilaMovimientoUnificado {
  movimiento_cc_id: string;
  cliente_final_id: string;
  tipo: "cargo" | "pago" | "anulacion";
  monto: number;
  monto_pendiente: number | null;
  estado_imputacion: "pendiente" | "parcial" | "total" | null;
  comprobante_tipo: string | null;
  numero_comprobante: string | null;
  metodo_pago: string | null;
  creado_en: string;
  clientes_finales: {
    nombre: string;
  } | null;
}

/**
 * Repositorio puro para la agregación del Centro de Control Financiero y de Riesgo
 * de Cuentas Corrientes (Fiados), absorbiendo toda la matemática en el servidor.
 */
export async function obtenerDashboardCuentasCorrientes(
  supabase: SupabaseClient,
  clienteId: string
): Promise<ResultadoRepositorio<DashboardCuentasCorrientesCompleto>> {
  try {
    // 1. Obtener datos de configuración del comercio (cliente)
    const { data: tenantConfig, error: errorTenant } = await supabase
      .from("clientes")
      .select("modo_facturacion_estimada, facturacion_manual_monto, tope_deuda_tolerable_pct")
      .eq("cliente_id", clienteId)
      .maybeSingle();

    if (errorTenant) {
      return { ok: false, error: "NX-SYS-001" };
    }

    const modoFacturacionEstimada = (tenantConfig?.modo_facturacion_estimada === "manual" ? "manual" : "automatico") as "automatico" | "manual";
    const facturacionManualMonto = Number(tenantConfig?.facturacion_manual_monto) || 0;
    const topeDeudaTolerablePct = Number(tenantConfig?.tope_deuda_tolerable_pct) || 30.0;

    // 2. Obtener ventas confirmadas de los últimos 30 días para la facturación real automática POS
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const { data: ventas30Dias } = await supabase
      .from("ventas")
      .select("total")
      .eq("cliente_id", clienteId)
      .eq("estado", "confirmada")
      .gte("creado_en", hace30Dias.toISOString());

    const facturacionRealPos30Dias = (ventas30Dias ?? []).reduce((acc, v) => acc + Number(v.total || 0), 0);

    const facturacionMensualReferencia =
      modoFacturacionEstimada === "manual" ? facturacionManualMonto : facturacionRealPos30Dias;

    // 3. Obtener clientes finales del tenant
    const { data: clientesFinales, error: errorClientes } = await supabase
      .from("clientes_finales")
      .select("cliente_final_id, nombre, telefono, limite_credito, saldo_deudor, estado, creado_en")
      .eq("cliente_id", clienteId)
      .is("eliminado_en", null);

    if (errorClientes || !clientesFinales) {
      return { ok: false, error: "NX-SYS-001" };
    }

    // 4. Obtener todos los movimientos de cuenta corriente del tenant
    const { data: movimientosRaw, error: errorMovs } = await supabase
      .from("movimientos_cuenta_corriente")
      .select("movimiento_cc_id, cliente_final_id, tipo, monto, monto_pendiente, estado_imputacion, comprobante_tipo, numero_comprobante, metodo_pago, creado_en, clientes_finales(nombre)")
      .eq("cliente_id", clienteId)
      .order("creado_en", { ascending: false });

    if (errorMovs) {
      return { ok: false, error: "NX-SYS-001" };
    }

    const movimientos = (movimientosRaw ?? []) as unknown as FilaMovimientoUnificado[];

    // 5. Cálculos de Situación de Caja y Deuda
    let cajaTotalRecuperada = 0;
    let totalVendidoCredito = 0;

    for (const mov of movimientos) {
      const montoNum = Number(mov.monto) || 0;
      if (mov.tipo === "pago") {
        cajaTotalRecuperada += montoNum;
      } else if (mov.tipo === "cargo") {
        totalVendidoCredito += montoNum;
      }
    }

    const deudaTotalCalle = clientesFinales.reduce((acc, c) => acc + (Number(c.saldo_deudor) || 0), 0);
    const porcentajeFiadoCobrado =
      totalVendidoCredito > 0
        ? Number(((cajaTotalRecuperada / totalVendidoCredito) * 100).toFixed(1))
        : 0;

    // 6. Métricas de Control de Clientes
    const totalClientesPadron = clientesFinales.length;
    const clientesConDeuda = clientesFinales.filter((c) => (Number(c.saldo_deudor) || 0) > 0).length;
    const clientesSuperanLimite = clientesFinales.filter(
      (c) => (Number(c.saldo_deudor) || 0) > (Number(c.limite_credito) || 0) && (Number(c.limite_credito) || 0) > 0
    ).length;

    const deudaPromedio = clientesConDeuda > 0 ? Number((deudaTotalCalle / clientesConDeuda).toFixed(2)) : 0;
    const deudaMasAlta = clientesFinales.reduce((max, c) => Math.max(max, Number(c.saldo_deudor) || 0), 0);

    // Deuda acumulada con más de 30 días sin pago
    const fechaLimite30Dias = new Date();
    fechaLimite30Dias.setDate(fechaLimite30Dias.getDate() - 30);

    let deudaMas30Dias = 0;
    for (const mov of movimientos) {
      if (mov.tipo === "cargo" && (Number(mov.monto_pendiente) || 0) > 0) {
        const fechaMov = new Date(mov.creado_en);
        if (fechaMov < fechaLimite30Dias) {
          deudaMas30Dias += Number(mov.monto_pendiente) || 0;
        }
      }
    }

    // 7. Semáforo de Riesgo Comercial
    const deudaSobreFacturacionPct =
      facturacionMensualReferencia > 0
        ? Number(((deudaTotalCalle / facturacionMensualReferencia) * 100).toFixed(1))
        : 0;

    const montoMaximoRecomendado = Number(
      (facturacionMensualReferencia * (topeDeudaTolerablePct / 100)).toFixed(2)
    );

    let estadoAlertaRiesgo: "saludable" | "precaucion" | "excesivo" = "saludable";
    if (montoMaximoRecomendado > 0) {
      if (deudaTotalCalle > montoMaximoRecomendado) {
        estadoAlertaRiesgo = "excesivo";
      } else if (deudaTotalCalle >= montoMaximoRecomendado * 0.8) {
        estadoAlertaRiesgo = "precaucion";
      }
    }

    // 8. Construcción del Padrón Enriquecido y Top 5 Deudores
    // Agrupar movimientos por cliente
    const movsPorCliente = new Map<string, FilaMovimientoUnificado[]>();
    for (const mov of movimientos) {
      const lista = movsPorCliente.get(mov.cliente_final_id) ?? [];
      lista.push(mov);
      movsPorCliente.set(mov.cliente_final_id, lista);
    }

    // Ordenar clientes por saldo deudor descendente para asignar Ranking
    const clientesOrdenados = [...clientesFinales].sort(
      (a, b) => (Number(b.saldo_deudor) || 0) - (Number(a.saldo_deudor) || 0)
    );

    const padronClientes: ClientePadronEnriquecido[] = clientesOrdenados.map((c, index) => {
      const listaMovs = movsPorCliente.get(c.cliente_final_id) ?? [];
      const saldoActual = Number(c.saldo_deudor) || 0;
      const limiteCredito = Number(c.limite_credito) || 0;

      let totalComprado = 0;
      let totalCobrado = 0;
      let ultimaCompraFecha: string | null = null;
      let ultimoPagoFecha: string | null = null;

      for (const mov of listaMovs) {
        const m = Number(mov.monto) || 0;
        if (mov.tipo === "cargo") {
          totalComprado += m;
          if (!ultimaCompraFecha || new Date(mov.creado_en) > new Date(ultimaCompraFecha)) {
            ultimaCompraFecha = mov.creado_en;
          }
        } else if (mov.tipo === "pago") {
          totalCobrado += m;
          if (!ultimoPagoFecha || new Date(mov.creado_en) > new Date(ultimoPagoFecha)) {
            ultimoPagoFecha = mov.creado_en;
          }
        }
      }

      const porcentajeLimiteUsado =
        limiteCredito > 0 ? Number(((saldoActual / limiteCredito) * 100).toFixed(1)) : 0;

      // Evaluar estado de alerta individual del cliente
      let estadoAlerta: "al_dia" | "precaucion" | "excedido" | "suspendido" = "al_dia";

      if (c.estado === "suspendido") {
        estadoAlerta = "suspendido";
      } else if (limiteCredito > 0 && saldoActual > limiteCredito) {
        estadoAlerta = "excedido";
      } else if (limiteCredito > 0 && saldoActual >= limiteCredito * 0.8) {
        estadoAlerta = "precaucion";
      }

      // Calcular días sin pagar (desde la fecha del último pago o de la primera venta fiada sin saldar)
      let diasSinPagar = 0;
      if (saldoActual > 0) {
        const fechaReferencia = ultimoPagoFecha ? new Date(ultimoPagoFecha) : (ultimaCompraFecha ? new Date(ultimaCompraFecha) : new Date());
        const diffTiempo = Math.abs(new Date().getTime() - fechaReferencia.getTime());
        diasSinPagar = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
      }

      return {
        clienteFinalId: c.cliente_final_id,
        nombre: c.nombre,
        telefono: c.telefono,
        limiteCredito,
        totalComprado,
        totalCobrado,
        saldoActual,
        porcentajeLimiteUsado,
        estadoAlerta,
        ultimaCompraFecha,
        diasSinPagar,
        ranking: index + 1,
      };
    });

    // Top 5 Deudores
    const top5Deudores: TopDeudorItem[] = padronClientes
      .filter((c) => c.saldoActual > 0)
      .slice(0, 5)
      .map((c) => ({
        clienteFinalId: c.clienteFinalId,
        nombre: c.nombre,
        telefono: c.telefono,
        saldoDeudor: c.saldoActual,
        limiteCredito: c.limiteCredito,
        diasSinPagar: c.diasSinPagar,
      }));

    // 9. Libro Diario de Movimientos
    const movimientosLibroDiario: MovimientoLibroDiario[] = movimientos.map((m) => ({
      movimientoCcId: m.movimiento_cc_id,
      creadoEn: m.creado_en,
      clienteFinalId: m.cliente_final_id,
      nombreCliente: m.clientes_finales?.nombre ?? "Cliente",
      tipo: m.tipo,
      monto: Number(m.monto) || 0,
      montoPendiente: Number(m.monto_pendiente) || 0,
      estadoImputacion: m.estado_imputacion ?? (m.tipo === "pago" ? "total" : "pendiente"),
      comprobanteTipo: m.comprobante_tipo ?? (m.tipo === "cargo" ? "factura" : "recibo_cobro"),
      numeroComprobante: m.numero_comprobante,
      metodoPago: m.metodo_pago,
      esConsistente: true,
    }));

    return {
      ok: true,
      data: {
        situacionCaja: {
          cajaTotalRecuperada,
          totalVendidoCredito,
          deudaTotalCalle,
          porcentajeFiadoCobrado,
        },
        controlClientes: {
          totalClientesPadron,
          clientesConDeuda,
          clientesSuperanLimite,
          deudaPromedio,
          deudaMasAlta,
          deudaMas30Dias,
        },
        semaforoRiesgo: {
          modoFacturacionEstimada,
          facturacionManualMonto,
          facturacionRealPos30Dias,
          facturacionMensualReferencia,
          topeDeudaTolerablePct,
          deudaSobreFacturacionPct,
          montoMaximoRecomendado,
          estadoAlertaRiesgo,
        },
        top5Deudores,
        padronClientes,
        movimientosLibroDiario,
      },
    };
  } catch {
    return { ok: false, error: "NX-SYS-001" };
  }
}
