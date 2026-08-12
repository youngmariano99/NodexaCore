import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  crearClienteAnonimo,
  crearClienteServicioLocal,
  iniciarSesionComo,
  TENANT_A,
  TENANT_B,
  verificarSupabaseLocalDisponible,
} from "./helpers/entornoSupabaseLocal";

/**
 * Prueba de integración de aislamiento multi-tenant vía RLS (Paso 2 del
 * checklist, docs/ROLES.md §3.3): autentica usuarios reales de dos tenants
 * distintos contra Supabase local y verifica que ninguna lectura ni
 * escritura cruzada de datos PRIVADOS tenga éxito. A diferencia de las
 * pruebas unitarias de `src/lib/dominio/`, acá no se mockea Supabase: se
 * ejercitan las políticas `CREATE POLICY` reales sobre Postgres, que
 * ninguna prueba unitaria puede cubrir (una unitaria mockea el cliente
 * Supabase, así que nunca invoca RLS de verdad).
 *
 * Hallazgo real durante la construcción de esta suite: `productos` y
 * `clientes` tienen políticas de lectura pública adicionales
 * (`productos_lectura_publica`, `clientes_lectura_publica`, docs/SCHEMA.md
 * §19) que permiten leer filas de OTROS tenants a propósito (vidriera
 * pública, resolución de slug) — combinadas vía `OR` con la política de
 * tenant. Los primeros intentos de esta suite asumían "ningún dato de otro
 * tenant es visible nunca", lo cual es incorrecto para esas dos tablas
 * específicas y hubiera dejado una suite que documenta mal el
 * comportamiento real. Se corrigió usando fixtures explícitamente NO
 * públicas (`publicado = false`) para demostrar el aislamiento real, y se
 * agregó un test que documenta explícitamente el carve-out público
 * (comportamiento intencional, no una fuga).
 */
describe("RLS multi-tenant: productos", () => {
  let clienteA: SupabaseClient;
  let productoNoPublicadoTenantB: string;
  let productoPublicadoTenantB: string;

  beforeAll(async () => {
    await verificarSupabaseLocalDisponible();

    clienteA = await iniciarSesionComo(TENANT_A.email);

    const servicio = crearClienteServicioLocal();

    const { data: filaPrivada, error: errorPrivada } = await servicio
      .from("productos")
      .select("producto_id")
      .eq("cliente_id", TENANT_B.clienteId)
      .eq("publicado", false)
      .is("eliminado_en", null)
      .limit(1)
      .single();
    if (errorPrivada || !filaPrivada) {
      throw new Error(`No se encontró ningún producto NO publicado de fixture para el tenant B: ${errorPrivada?.message}`);
    }
    productoNoPublicadoTenantB = filaPrivada.producto_id;

    const { data: filaPublica, error: errorPublica } = await servicio
      .from("productos")
      .select("producto_id")
      .eq("cliente_id", TENANT_B.clienteId)
      .eq("publicado", true)
      .is("eliminado_en", null)
      .limit(1)
      .single();
    if (errorPublica || !filaPublica) {
      throw new Error(`No se encontró ningún producto publicado de fixture para el tenant B: ${errorPublica?.message}`);
    }
    productoPublicadoTenantB = filaPublica.producto_id;
  });

  it("un comerciante lee sus propios productos (publicados o no) cuando filtra por su cliente_id, mismo criterio que usa toda consulta real de la app", async () => {
    const { data, error } = await clienteA
      .from("productos")
      .select("producto_id, cliente_id, publicado")
      .eq("cliente_id", TENANT_A.clienteId)
      .limit(50);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((fila) => fila.cliente_id === TENANT_A.clienteId)).toBe(true);
  });

  it("un comerciante NO lee un producto NO publicado de otro tenant, ni filtrando por su cliente_id ni por ID directo", async () => {
    const porClienteId = await clienteA
      .from("productos")
      .select("producto_id")
      .eq("cliente_id", TENANT_B.clienteId)
      .eq("publicado", false);
    expect(porClienteId.error).toBeNull();
    expect(porClienteId.data).toEqual([]);

    const porId = await clienteA.from("productos").select("producto_id").eq("producto_id", productoNoPublicadoTenantB);
    expect(porId.error).toBeNull();
    expect(porId.data).toEqual([]);
  });

  it("carve-out intencional: un comerciante SÍ puede leer un producto PUBLICADO de otro tenant (vidriera pública, no es una fuga)", async () => {
    const { data, error } = await clienteA.from("productos").select("producto_id").eq("producto_id", productoPublicadoTenantB);

    expect(error).toBeNull();
    expect(data).toEqual([{ producto_id: productoPublicadoTenantB }]);
  });

  it("no se puede insertar un producto con el cliente_id de otro tenant (WITH CHECK de productos_insert_tenant)", async () => {
    const { error } = await clienteA.from("productos").insert({
      cliente_id: TENANT_B.clienteId,
      sku: `RLS-TEST-${randomUUID().slice(0, 8)}`,
      nombre: "Intento de alta cruzada",
      precio: 100,
      categoria: "Test",
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/row-level security/i);
  });

  it("un UPDATE dirigido a un producto no publicado de otro tenant no modifica ninguna fila", async () => {
    const { data, error } = await clienteA
      .from("productos")
      .update({ nombre: "Modificado por tenant ajeno" })
      .eq("producto_id", productoNoPublicadoTenantB)
      .select("producto_id");

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const servicio = crearClienteServicioLocal();
    const { data: filaReal } = await servicio
      .from("productos")
      .select("nombre")
      .eq("producto_id", productoNoPublicadoTenantB)
      .single();
    expect(filaReal!.nombre).not.toBe("Modificado por tenant ajeno");
  });

  it("un UPDATE dirigido a un producto PUBLICADO de otro tenant tampoco lo modifica (la lectura pública no otorga escritura)", async () => {
    const { data, error } = await clienteA
      .from("productos")
      .update({ nombre: "Modificado por tenant ajeno" })
      .eq("producto_id", productoPublicadoTenantB)
      .select("producto_id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("un cliente sin sesión (anónimo) no lee un producto NO publicado de ningún tenant", async () => {
    const anonimo = crearClienteAnonimo();

    const { data, error } = await anonimo.from("productos").select("producto_id").eq("producto_id", productoNoPublicadoTenantB);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("un cliente sin sesión (anónimo) sí lee un producto publicado (vidriera pública, comportamiento esperado)", async () => {
    const anonimo = crearClienteAnonimo();

    const { data, error } = await anonimo.from("productos").select("producto_id").eq("producto_id", productoPublicadoTenantB);

    expect(error).toBeNull();
    expect(data).toEqual([{ producto_id: productoPublicadoTenantB }]);
  });
});

describe("RLS multi-tenant: ventas (sin carve-out público)", () => {
  let clienteA: SupabaseClient;
  let ventaIdTenantB: string;

  beforeAll(async () => {
    await verificarSupabaseLocalDisponible();

    clienteA = await iniciarSesionComo(TENANT_A.email);

    const servicio = crearClienteServicioLocal();
    const { data: filaVenta, error } = await servicio
      .from("ventas")
      .select("venta_id")
      .eq("cliente_id", TENANT_B.clienteId)
      .limit(1)
      .single();
    if (error || !filaVenta) throw new Error(`No se encontró ninguna venta de fixture para el tenant B: ${error?.message}`);
    ventaIdTenantB = filaVenta.venta_id;
  });

  it("un comerciante no puede leer ventas de otro tenant por ID", async () => {
    const { data, error } = await clienteA.from("ventas").select("venta_id").eq("venta_id", ventaIdTenantB);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("un comerciante lee únicamente sus propias ventas al listar sin filtro (ventas no tiene lectura pública)", async () => {
    const { data, error } = await clienteA.from("ventas").select("venta_id, cliente_id").limit(20);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((fila) => fila.cliente_id === TENANT_A.clienteId)).toBe(true);
  });

  it("un cliente sin sesión (anónimo) no lee ninguna venta de ningún tenant", async () => {
    const anonimo = crearClienteAnonimo();

    const { data, error } = await anonimo.from("ventas").select("venta_id").eq("venta_id", ventaIdTenantB);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("RLS multi-tenant: clientes", () => {
  it("un comerciante no puede modificar estado_pago de su propia fila (exclusivo de admin_nodexa, clientes_update_admin)", async () => {
    await verificarSupabaseLocalDisponible();
    const clienteA = await iniciarSesionComo(TENANT_A.email);

    const { data, error } = await clienteA
      .from("clientes")
      .update({ estado_pago: false })
      .eq("cliente_id", TENANT_A.clienteId)
      .select("cliente_id");

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const servicio = crearClienteServicioLocal();
    const { data: filaReal } = await servicio.from("clientes").select("estado_pago").eq("cliente_id", TENANT_A.clienteId).single();
    expect(filaReal!.estado_pago).toBe(true);
  });

  it("un comerciante no puede modificar limite_sku de su propia fila (exclusivo de admin_nodexa)", async () => {
    const clienteA = await iniciarSesionComo(TENANT_A.email);

    const { data, error } = await clienteA
      .from("clientes")
      .update({ limite_sku: 999999 })
      .eq("cliente_id", TENANT_A.clienteId)
      .select("cliente_id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("carve-out intencional documentado: clientes_lectura_publica expone la fila completa de otro tenant con estado_pago=true (mitigado a nivel de aplicación seleccionando solo columnas seguras, no por RLS)", async () => {
    const clienteA = await iniciarSesionComo(TENANT_A.email);

    const { data, error } = await clienteA
      .from("clientes")
      .select("cliente_id, limite_sku")
      .eq("cliente_id", TENANT_B.clienteId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.cliente_id).toBe(TENANT_B.clienteId);
  });
});
