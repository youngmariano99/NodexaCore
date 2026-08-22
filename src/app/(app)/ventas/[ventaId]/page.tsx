import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, RefreshCcw, User, Calendar, Tag } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { RUTA_POR_ROL } from "@/lib/auth/rutas-por-rol";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";
import type { EstadoVenta } from "@/repositories/ventas";

export const metadata: Metadata = {
  title: "Detalle de Venta — Nodexa Core",
};

export const dynamic = "force-dynamic";

const FORMATO_PRECIO = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaVentaDetalle {
  venta_id: string;
  total: number;
  estado: EstadoVenta;
  creado_en: string;
  cliente_id: string;
  clientes_finales: {
    nombre: string;
  } | null;
  usuarios: {
    nombre: string;
  } | null;
}

interface FilaVentaItemDetalle {
  venta_item_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  productos: {
    nombre: string;
    sku: string;
  } | null;
}

function BadgeEstadoVenta({ estado }: { estado: EstadoVenta }) {
  if (estado === "confirmada") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 border border-emerald-500/20">
        Confirmada
      </span>
    );
  }
  if (estado === "devuelta_parcial") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500 border border-amber-500/20">
        Devuelta Parcial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 border border-red-500/20">
      Devuelta Total
    </span>
  );
}

export default async function DetalleVentaPage({
  params,
}: {
  params: Promise<{ ventaId: string }>;
}) {
  const { ventaId } = await params;
  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    redirect("/login?error=NX-SYS-002");
  }

  const { data: solicitante } = await supabase
    .from("usuarios")
    .select("rol, cliente_id")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (!solicitante || (solicitante.rol !== "comerciante" && solicitante.rol !== "empleado") || !solicitante.cliente_id) {
    redirect(`${RUTA_POR_ROL[solicitante?.rol ?? "admin_nodexa"]}?error=NX-SYS-003`);
  }

  const clienteId = solicitante.cliente_id;

  // BOLA / IDOR guard: Fetch sale detail and verify tenant membership
  const { data: venta, error: errorVenta } = await supabase
    .from("ventas")
    .select(
      `
      venta_id,
      total,
      estado,
      creado_en,
      cliente_id,
      clientes_finales (
        nombre
      ),
      usuarios (
        nombre
      )
      `
    )
    .eq("venta_id", ventaId)
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .maybeSingle<FilaVentaDetalle>();

  if (errorVenta || !venta) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-10">
        <MensajeError codigo="NX-SYS-007" className="max-w-md" />
      </div>
    );
  }

  // Cargar los ítems vendidos, precio unitario de persistencia, cantidad y subtotal
  const { data: items, error: errorItems } = await supabase
    .from("venta_items")
    .select(
      `
      venta_item_id,
      cantidad,
      precio_unitario,
      subtotal,
      productos (
        nombre,
        sku
      )
      `
    )
    .eq("venta_id", ventaId)
    .returns<FilaVentaItemDetalle[]>();

  if (errorItems || !items) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-10">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  // Verificar si el módulo de devoluciones está activo
  const { data: moduloDevoluciones } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "devoluciones")
    .maybeSingle<{ activo: boolean }>();

  const mostrarBotonDevolucion = moduloDevoluciones?.activo ?? false;

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <Link
            href="/ventas"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al historial
          </Link>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-slate-50">Detalle de Venta</h1>
            <p className="text-xs font-mono text-slate-500">ID: {venta.venta_id}</p>
          </div>
          {mostrarBotonDevolucion && (
            <div>
              <Link
                href={`/devoluciones/nueva?ventaId=${venta.venta_id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400"
              >
                <RefreshCcw className="h-4 w-4" />
                Iniciar Devolución
              </Link>
            </div>
          )}
        </div>

        {/* Resumen de Datos de Cobro */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4 flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Información de la Venta</h3>
            <div className="flex items-center gap-2.5 text-sm text-slate-200">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Fecha: {FORMATO_FECHA.format(new Date(venta.creado_en))}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-200">
              <User className="h-4 w-4 text-slate-500" />
              <span>Cajero: {venta.usuarios?.nombre || "Sistema"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-200">
              <Tag className="h-4 w-4 text-slate-500" />
              <div className="flex items-center gap-2">
                <span>Estado:</span>
                <BadgeEstadoVenta estado={venta.estado} />
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4 flex flex-col gap-3 justify-between">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliente de Facturación</h3>
              <div className="flex items-center gap-2.5 text-sm text-slate-200">
                <User className="h-4 w-4 text-slate-500" />
                <span>{venta.clientes_finales?.nombre || "Consumidor Final"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-slate-100">
              <span className="text-sm font-medium">Total Cobrado</span>
              <span className="text-lg font-bold text-slate-50">{FORMATO_PRECIO.format(venta.total)}</span>
            </div>
          </div>
        </div>

        {/* Desglose de Items */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Ítems Vendidos</h2>
          <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-900/30">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium text-center">Cant.</th>
                  <th className="px-4 py-3 font-medium text-right">Precio Unit.</th>
                  <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((item) => (
                  <tr key={item.venta_item_id} className="hover:bg-slate-900/45 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">{item.productos?.nombre || "Producto no disponible"}</span>
                        <span className="font-mono text-xs text-slate-500">{item.productos?.sku || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-200 font-mono">
                      {item.cantidad}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200 font-mono">
                      {FORMATO_PRECIO.format(item.precio_unitario)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-100 font-semibold font-mono">
                      {FORMATO_PRECIO.format(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
