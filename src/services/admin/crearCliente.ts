"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseAdmin, crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { type EstadoCrearCliente, MODULOS_NODEXA, type ModuloNodexa } from "@/services/admin/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const LIMITE_SKU_INICIAL = 1000;

const CODIGO_UNIQUE_VIOLATION_POSTGRES = "23505";

const esquemaCrearCliente = z.object({
  nombre_comercio: z
    .string({ message: "El nombre del comercio es obligatorio." })
    .trim()
    .min(1, "El nombre del comercio es obligatorio."),
  slug: z
    .string({ message: "El slug es obligatorio." })
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El slug solo puede tener minúsculas, números y guiones medios."),
  telefono_whatsapp: z
    .string({ message: "El teléfono de WhatsApp es obligatorio." })
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Ingresá el teléfono en formato internacional, ej. +5492920000000."),
  limite_sku: z.coerce.number().int().positive().optional(),
  modulos: z.array(z.enum(MODULOS_NODEXA as [ModuloNodexa, ...ModuloNodexa[]])).optional(),
});

function parsearModulos(valorCrudo: FormDataEntryValue | null): unknown {
  if (typeof valorCrudo !== "string") {
    return null;
  }
  try {
    return JSON.parse(valorCrudo);
  } catch {
    return null;
  }
}

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
}

interface FilaClienteCreado {
  cliente_id: string;
}

interface ErrorPostgres {
  code?: string;
}

function esUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as ErrorPostgres).code === CODIGO_UNIQUE_VIOLATION_POSTGRES;
}

/**
 * Alta comercial de comercios (docs/ROLES.md §2, fila "clientes (propio tenant)":
 * C·L·M exclusivo de admin_nodexa). El INSERT usa el cliente service_role
 * porque `clientes` no tiene política RLS de INSERT (docs/ROLES.md §3.6 solo
 * define SELECT/UPDATE) — el alta de comercios está explícitamente habilitada
 * para service_role en docs/ROLES.md §3.9. El chequeo de rol contra la tabla
 * `usuarios` es la única barrera de autorización posible acá (no hay política
 * de INSERT que actúe como respaldo), por eso se verifica antes de tocar el
 * cliente admin.
 */
export async function crearCliente(
  _estadoPrevio: EstadoCrearCliente,
  formData: FormData,
): Promise<EstadoCrearCliente> {
  const resultado = esquemaCrearCliente.safeParse({
    nombre_comercio: formData.get("nombre_comercio"),
    slug: formData.get("slug"),
    telefono_whatsapp: formData.get("telefono_whatsapp"),
    limite_sku: formData.get("limite_sku") || undefined,
    modulos: parsearModulos(formData.get("modulos")) || undefined,
  });

  if (!resultado.success) {
    return { error: "NX-SYS-006", exito: false };
  }

  const supabase = await crearClienteSupabaseServidor();

  const {
    data: { user: usuarioAutenticado },
  } = await supabase.auth.getUser();

  if (!usuarioAutenticado) {
    return { error: "NX-SYS-002", exito: false };
  }

  const { data: solicitante, error: errorSolicitante } = await supabase
    .from("usuarios")
    .select("usuario_id, rol")
    .eq("auth_user_id", usuarioAutenticado.id)
    .is("eliminado_en", null)
    .single<FilaUsuarioSolicitante>();

  if (errorSolicitante || !solicitante) {
    return { error: "NX-SYS-001", exito: false };
  }

  if (solicitante.rol !== "admin_nodexa") {
    return { error: "NX-SYS-003", exito: false };
  }

  const supabaseAdmin = crearClienteSupabaseAdmin();

  const limiteSkuPersistido = resultado.data.limite_sku || LIMITE_SKU_INICIAL;

  const { data: clienteCreado, error: errorInsercion } = await supabaseAdmin
    .from("clientes")
    .insert({
      nombre_comercio: resultado.data.nombre_comercio,
      slug: resultado.data.slug,
      telefono_whatsapp: resultado.data.telefono_whatsapp,
      estado_pago: true,
      limite_sku: limiteSkuPersistido,
    })
    .select("cliente_id")
    .single<FilaClienteCreado>();

  if (errorInsercion || !clienteCreado) {
    if (esUniqueViolation(errorInsercion)) {
      return { error: "NX-ADM-001", exito: false, clienteId: null };
    }
    return { error: "NX-SYS-001", exito: false, clienteId: null };
  }

  // Si se indicaron módulos activos iniciales, darlos de alta
  if (resultado.data.modulos && resultado.data.modulos.length > 0) {
    const payloadsModulos = resultado.data.modulos.map((modulo) => ({
      cliente_id: clienteCreado.cliente_id,
      modulo,
      activo: true,
    }));
    await supabaseAdmin.from("tenant_modules").insert(payloadsModulos);
  }

  registrarDiff({
    clienteId: clienteCreado.cliente_id,
    usuarioId: solicitante.usuario_id,
    tablaAfectada: "clientes",
    registroId: clienteCreado.cliente_id,
    campoModificado: "alta",
    valorAnterior: null,
    valorNuevo: JSON.stringify({
      nombre_comercio: resultado.data.nombre_comercio,
      slug: resultado.data.slug,
      telefono_whatsapp: resultado.data.telefono_whatsapp,
      estado_pago: true,
      limite_sku: limiteSkuPersistido,
      modulos: resultado.data.modulos || [],
    }),
  });

  return { error: null, exito: true, clienteId: clienteCreado.cliente_id };
}
