import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/services/autenticacion/tipos";

import { FormularioDevolucion } from "./FormularioDevolucion";

export const metadata: Metadata = {
  title: "Registrar Devolución — Nodexa Core",
};

export const dynamic = "force-dynamic";

interface FilaUsuarioSolicitante {
  rol: RolUsuario;
  cliente_id: string | null;
}

interface FilaVentaVerificacion {
  venta_id: string;
  cliente_id: string;
  total: number;
}

interface FilaVentaItem {
  venta_item_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  productos: {
    nombre: string;
    sku: string;
  } | null;
}

export default async function NuevaDevolucionPage({
  searchParams,
}: {
  searchParams: Promise<{ ventaId?: string }>;
}) {
  const parametros = await searchParams;
  const ventaId = parametros.ventaId;

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

  // Devoluciones es exclusivo de comerciantes
  if (!solicitante || solicitante.rol !== "comerciante" || !solicitante.cliente_id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-10 text-slate-50">
        <div className="flex w-full max-w-md flex-col gap-4">
          <MensajeError codigo="NX-SYS-003" className="w-full" />
        </div>
      </div>
    );
  }

  const clienteId = solicitante.cliente_id;

  // Verificar módulo de devoluciones activo para este cliente
  const { data: moduloDevoluciones } = await supabase
    .from("tenant_modules")
    .select("activo")
    .eq("cliente_id", clienteId)
    .eq("modulo", "devoluciones")
    .maybeSingle<{ activo: boolean }>();

  if (!moduloDevoluciones?.activo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-10 text-slate-50">
        <div className="flex w-full max-w-md flex-col gap-4">
          <MensajeError codigo="NX-DEV-001" className="w-full" />
        </div>
      </div>
    );
  }

  if (!ventaId) {
    return (
      <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50 items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-slate-700 bg-slate-800 px-6 py-12 text-center max-w-md">
          <ShoppingBag className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="text-base text-slate-50">No seleccionaste ninguna venta.</p>
          <p className="text-sm text-slate-400">
            Para iniciar una devolución, primero debés buscar la venta correspondiente en el historial de ventas.
          </p>
          <Link
            href="/ventas"
            className="mt-2 flex min-h-11 items-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors duration-150 hover:bg-emerald-400"
          >
            Ver historial de ventas
          </Link>
        </div>
      </div>
    );
  }

  // BOLA / IDOR protection: Verificar pertenencia de la venta al tenant
  const { data: venta, error: errorVenta } = await supabase
    .from("ventas")
    .select("venta_id, cliente_id, total")
    .eq("venta_id", ventaId)
    .eq("cliente_id", clienteId)
    .is("eliminado_en", null)
    .maybeSingle<FilaVentaVerificacion>();

  if (errorVenta || !venta) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-10">
        <MensajeError codigo="NX-SYS-007" className="max-w-md" />
      </div>
    );
  }

  // Cargar ítems comprados
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
    .returns<FilaVentaItem[]>();

  if (errorItems || !items) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-10">
        <MensajeError codigo="NX-SYS-001" className="max-w-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <Link
            href={`/ventas/${ventaId}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al detalle de la venta
          </Link>
        </div>

        <header className="flex flex-col gap-1 border-b border-slate-800 pb-4">
          <h1 className="text-xl font-bold text-slate-50">Registrar Devolución</h1>
          <p className="text-xs text-slate-400">
            Venta ID: <span className="font-mono text-slate-300">{venta.venta_id}</span>
          </p>
        </header>

        <FormularioDevolucion ventaId={ventaId} itemsVenta={items} />
      </div>
    </div>
  );
}
