"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { registrarDiff } from "@/lib/auditoria/registrarDiff";
import { crearClienteSupabaseServidor } from "@/lib/supabase/server";
import { zTelefonoObligatorio } from "@/lib/validaciones/transformadores";
import type { RolUsuario } from "@/services/autenticacion/tipos";

const CODIGO_UNIQUE_VIOLATION_POSTGRES = "23505";

const esquemaActualizarCliente = z.object({
  nombre_comercio: z.string().trim().min(1, "El nombre del comercio es obligatorio."),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug inválido."),
  telefono_whatsapp: zTelefonoObligatorio("El teléfono de WhatsApp es obligatorio."),
  limite_sku: z.coerce.number().int().positive(),
  packs_sku_contratados: z.coerce.number().int().nonnegative(),
  cuota_mensual_ia: z.coerce.number().int().nonnegative(),
  dominio_personalizado: z.string().trim().optional().transform(v => v === "" ? null : v),
  modalidad_catalogo: z.enum(['vidriera', 'pedidos_whatsapp', 'comandas_realtime']).optional(),
  estado_pago: z.boolean(),
});

export type EstadoActualizarCliente = {
  error?: string;
  ok?: boolean;
};

export async function actualizarCliente(clienteId: string, _estadoPrevio: EstadoActualizarCliente, formData: FormData): Promise<EstadoActualizarCliente> {
  const supabase = await crearClienteSupabaseServidor();

  // 1. Verificacin de roles
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "NX-SYS-002" };

  const { data: solicitante } = await supabase
    .from("usuarios")
    .select("rol, usuario_id")
    .eq("auth_user_id", user.id)
    .single<{ rol: RolUsuario; usuario_id: string }>();

  if (!solicitante || solicitante.rol !== "admin_nodexa") {
    return { error: "NX-SYS-003" };
  }

  // 2. ValidaciÃƒÂ³n Zod
  const rawData = {
    nombre_comercio: formData.get("nombre_comercio"),
    slug: formData.get("slug"),
    telefono_whatsapp: formData.get("telefono_whatsapp"),
    limite_sku: formData.get("limite_sku"),
    packs_sku_contratados: formData.get("packs_sku_contratados"),
    cuota_mensual_ia: formData.get("cuota_mensual_ia"),
    dominio_personalizado: formData.get("dominio_personalizado"),
    estado_pago: formData.get("estado_pago") === "true" || formData.get("estado_pago") === "on",
    modalidad_catalogo: formData.get("modalidad_catalogo") || undefined,
  };

  const resultado = esquemaActualizarCliente.safeParse(rawData);
  if (!resultado.success) {
    return { error: "NX-SYS-006" }; // Error de validacin
  }

  const payload = resultado.data;

  // 3. Obtener viejo estado para auditora
  const { data: estadoViejo } = await supabase
    .from("clientes")
    .select("*")
    .eq("cliente_id", clienteId)
    .single();

  if (!estadoViejo) {
    return { error: "NX-SYS-004" };
  }

  // 4. Update
    const { error: updateError } = await supabase
    .from("clientes")
    .update({
      nombre_comercio: payload.nombre_comercio,
      slug: payload.slug,
      telefono_whatsapp: payload.telefono_whatsapp,
      limite_sku: payload.limite_sku,
      packs_sku_contratados: payload.packs_sku_contratados,
      cuota_mensual_ia: payload.cuota_mensual_ia,
      dominio_personalizado: payload.dominio_personalizado || null,
      estado_pago: payload.estado_pago,
      configuracion_plantilla: {
        ...estadoViejo.configuracion_plantilla,
        modalidad_catalogo: payload.modalidad_catalogo || "vidriera",
      },
    })
    .eq("cliente_id", clienteId);

  if (updateError) {
    if (updateError.code === CODIGO_UNIQUE_VIOLATION_POSTGRES) {
      if (updateError.message.includes("slug")) return { error: "NX-SYS-007" }; // Slug duplicado
      if (updateError.message.includes("dominio")) return { error: "NX-SYS-007" }; // Dominio duplicado
    }
    return { error: "NX-SYS-001" };
  }

  // 5. AuditorÃ­a
  for (const [key, newValue] of Object.entries(payload)) {
    const oldValue = estadoViejo[key as keyof typeof estadoViejo];
    if (oldValue !== newValue) {
      registrarDiff({
        clienteId: clienteId,
        usuarioId: solicitante.usuario_id,
        tablaAfectada: "clientes",
        registroId: clienteId,
        campoModificado: key,
        valorAnterior: String(oldValue ?? ""),
        valorNuevo: String(newValue ?? ""),
      });
    }
  }

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clienteId}`);
  
  return { ok: true };
}


