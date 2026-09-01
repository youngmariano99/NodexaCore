"use server";

import { z } from "zod";

import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseAdmin, crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { zTelefonoObligatorio } from "@/lib/validaciones/transformadores";
import { importarAtributosJson } from "@/services/admin/importarAtributosJson";
import {
  type EstadoCrearCliente,
  MODALIDADES_CATALOGO,
  MODULOS_NODEXA,
  type ModalidadCatalogo,
  type ModuloNodexa,
} from "@/services/admin/tipos";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const LIMITE_SKU_INICIAL = 1000;
const CUOTA_IA_INICIAL = 40;
const CODIGO_UNIQUE_VIOLATION_POSTGRES = "23505";

const esquemaCrearCliente = z
  .object({
    nombre_comercio: z
      .string({ message: "El nombre del comercio es obligatorio." })
      .trim()
      .min(1, "El nombre del comercio es obligatorio."),
    slug: z
      .string({ message: "El slug es obligatorio." })
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El slug solo puede tener minúsculas, números y guiones medios."),
    telefono_whatsapp: zTelefonoObligatorio("El teléfono de WhatsApp es obligatorio."),
    limite_sku: z.coerce.number().int().positive().optional(),
    modulos: z.array(z.enum(MODULOS_NODEXA as [ModuloNodexa, ...ModuloNodexa[]])).optional(),
    nombre_dueno: z.string().trim().min(1, "El nombre del dueño es obligatorio.").optional(),
    email: z.string().trim().email("Ingresá un email válido.").optional(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional(),
    modalidad_catalogo: z.enum(MODALIDADES_CATALOGO as [ModalidadCatalogo, ...ModalidadCatalogo[]]).optional(),
    cuota_mensual_ia: z.coerce.number().int().nonnegative().optional(),
    color_primario: z.string().trim().optional(),
    logo_url: z.string().trim().optional(),
    atributos_json: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.email) {
        return Boolean(data.password && data.nombre_dueno);
      }
      return true;
    },
    {
      message: "Si se incluye el usuario dueño, el nombre y la contraseña son obligatorios.",
    },
  );

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

function obtenerStringOIndefinido(valor: FormDataEntryValue | null): string | undefined {
  if (typeof valor !== "string") {
    return undefined;
  }
  const recortado = valor.trim();
  return recortado.length > 0 ? recortado : undefined;
}

interface FilaUsuarioSolicitante {
  usuario_id: string;
  rol: RolUsuario;
}

interface FilaClienteCreado {
  cliente_id: string;
}

interface FilaUsuarioCreado {
  usuario_id: string;
}

interface ErrorPostgres {
  code?: string;
}

function esUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as ErrorPostgres).code === CODIGO_UNIQUE_VIOLATION_POSTGRES;
}

/**
 * Alta comercial integral de comercios (docs/ROLES.md §2, fila "clientes (propio tenant)":
 * C·L·M exclusivo de admin_nodexa).
 *
 * Crea en una sola operación:
 * 1. La cuenta de acceso en Supabase Auth (admin.createUser) si se especifican credenciales de dueño.
 * 2. El registro en la tabla `clientes` con configuracion_plantilla (modalidad de catálogo) y cuota_ia.
 * 3. El registro en la tabla `usuarios` (rol: comerciante) vinculado a Auth y al nuevo cliente_id.
 * 4. Los registros de `tenant_modules` activos iniciales.
 * 5. La `configuracion_bot_whatsapp` por defecto.
 * 6. El registro de auditoría en `auditoria_diffs`.
 */
export async function crearCliente(
  _estadoPrevio: EstadoCrearCliente,
  formData: FormData,
): Promise<EstadoCrearCliente> {
  const resultado = esquemaCrearCliente.safeParse({
    nombre_comercio: obtenerStringOIndefinido(formData.get("nombre_comercio")),
    slug: obtenerStringOIndefinido(formData.get("slug")),
    telefono_whatsapp: obtenerStringOIndefinido(formData.get("telefono_whatsapp")),
    limite_sku: obtenerStringOIndefinido(formData.get("limite_sku")),
    modulos: parsearModulos(formData.get("modulos")) || undefined,
    nombre_dueno: obtenerStringOIndefinido(formData.get("nombre_dueno")),
    email: obtenerStringOIndefinido(formData.get("email")),
    password: obtenerStringOIndefinido(formData.get("password")),
    modalidad_catalogo: obtenerStringOIndefinido(formData.get("modalidad_catalogo")),
    cuota_mensual_ia: obtenerStringOIndefinido(formData.get("cuota_mensual_ia")),
    color_primario: obtenerStringOIndefinido(formData.get("color_primario")),
    logo_url: obtenerStringOIndefinido(formData.get("logo_url")),
    atributos_json: obtenerStringOIndefinido(formData.get("atributos_json")),
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

  // Paso 2: Si se especificaron credenciales del dueño, crear usuario en Supabase Auth
  let usuarioAuthId: string | null = null;
  if (resultado.data.email && resultado.data.password && resultado.data.nombre_dueno) {
    const { data: altaAuth, error: errorAltaAuth } = await supabaseAdmin.auth.admin.createUser({
      email: resultado.data.email,
      password: resultado.data.password,
      email_confirm: true,
      user_metadata: {
        nombre: resultado.data.nombre_dueno,
      },
    });

    if (errorAltaAuth || !altaAuth.user) {
      return { error: "NX-SYS-001", exito: false, clienteId: null };
    }
    usuarioAuthId = altaAuth.user.id;
  }

  const limiteSkuPersistido = resultado.data.limite_sku || LIMITE_SKU_INICIAL;
  const cuotaIaPersistida = resultado.data.cuota_mensual_ia ?? CUOTA_IA_INICIAL;
  const modalidadCatalogo = resultado.data.modalidad_catalogo ?? "vidriera";

  // Paso 3: Insertar en la tabla clientes
  const { data: clienteCreado, error: errorInsercionCliente } = await supabaseAdmin
    .from("clientes")
    .insert({
      nombre_comercio: resultado.data.nombre_comercio,
      slug: resultado.data.slug,
      telefono_whatsapp: resultado.data.telefono_whatsapp,
      estado_pago: true,
      limite_sku: limiteSkuPersistido,
      cuota_mensual_ia: cuotaIaPersistida,
      color_primario: resultado.data.color_primario ?? null,
      logo_url: resultado.data.logo_url ?? null,
      configuracion_plantilla: {
        modalidad_catalogo: modalidadCatalogo,
      },
    })
    .select("cliente_id")
    .single<FilaClienteCreado>();

  if (errorInsercionCliente || !clienteCreado) {
    // Si falló el insert del cliente, revertir la creación en Auth para no dejar usuarios huérfanos
    if (usuarioAuthId) {
      await supabaseAdmin.auth.admin.deleteUser(usuarioAuthId);
    }
    if (esUniqueViolation(errorInsercionCliente)) {
      return { error: "NX-ADM-001", exito: false, clienteId: null };
    }
    return { error: "NX-SYS-001", exito: false, clienteId: null };
  }

  // Paso 4: Insertar en la tabla usuarios vinculando auth_user_id y cliente_id
  if (usuarioAuthId && resultado.data.email && resultado.data.nombre_dueno) {
    const { data: usuarioCreado, error: errorInsercionUsuario } = await supabaseAdmin
      .from("usuarios")
      .insert({
        auth_user_id: usuarioAuthId,
        cliente_id: clienteCreado.cliente_id,
        rol: "comerciante",
        nombre: resultado.data.nombre_dueno,
        email: resultado.data.email,
      })
      .select("usuario_id")
      .single<FilaUsuarioCreado>();

    if (errorInsercionUsuario || !usuarioCreado) {
      // Revertir usuario de Auth y tenant creado
      await supabaseAdmin.auth.admin.deleteUser(usuarioAuthId);
      await supabaseAdmin.from("clientes").delete().eq("cliente_id", clienteCreado.cliente_id);
      return { error: "NX-SYS-001", exito: false, clienteId: null };
    }
  }

  // Si se indicaron módulos activos iniciales, darlos de alta en tenant_modules
  if (resultado.data.modulos && resultado.data.modulos.length > 0) {
    const payloadsModulos = resultado.data.modulos.map((modulo) => ({
      cliente_id: clienteCreado.cliente_id,
      modulo,
      activo: true,
    }));
    await supabaseAdmin.from("tenant_modules").insert(payloadsModulos);
  }

  // Paso 5: Insertar en configuracion_bot_whatsapp la configuración por defecto
  const tieneModuloBot = resultado.data.modulos?.includes("bot_whatsapp") ?? false;
  await supabaseAdmin.from("configuracion_bot_whatsapp").insert({
    cliente_id: clienteCreado.cliente_id,
    activo: tieneModuloBot,
    permite_derivar_whatsapp: true,
  });

  // Paso 6: Sembrado inicial de atributos desde JSON (Fail-Safe)
  let atributosResumen: { marcas: number; categorias: number } | null = null;
  if (resultado.data.atributos_json) {
    const resAtributos = await importarAtributosJson(
      supabaseAdmin,
      clienteCreado.cliente_id,
      resultado.data.atributos_json,
    );
    if (resAtributos.ok) {
      atributosResumen = {
        marcas: resAtributos.marcasInsertadas,
        categorias: resAtributos.categoriasInsertadas,
      };
    }
  }

  // Paso 7: Registrar diff unificado en auditoria_diffs
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
      cuota_mensual_ia: cuotaIaPersistida,
      modalidad_catalogo: modalidadCatalogo,
      modulos: resultado.data.modulos || [],
      dueno_email: resultado.data.email ?? null,
      dueno_nombre: resultado.data.nombre_dueno ?? null,
      atributos_iniciales: atributosResumen,
    }),
  });

  return { error: null, exito: true, clienteId: clienteCreado.cliente_id };
}

