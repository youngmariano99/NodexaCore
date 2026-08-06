import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VARS_REQUERIDAS = {
  NEXT_PUBLIC_SUPABASE_URL: "https://ejemplo.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "clave-anonima-de-prueba",
};

const ENV_ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ENV_ORIGINAL };
});

afterEach(() => {
  process.env = { ...ENV_ORIGINAL };
});

describe("entornoCliente", () => {
  it("valida correctamente cuando solo están las variables obligatorias", async () => {
    Object.assign(process.env, VARS_REQUERIDAS);

    const { entornoCliente } = await import("./env");

    expect(entornoCliente.NEXT_PUBLIC_SUPABASE_URL).toBe(VARS_REQUERIDAS.NEXT_PUBLIC_SUPABASE_URL);
    expect(entornoCliente.NEXT_PUBLIC_NN_CLIENT_ID).toBeUndefined();
  });

  it("lanza un error explícito si falta una variable obligatoria", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = VARS_REQUERIDAS.NEXT_PUBLIC_SUPABASE_URL;
    // Se borra explícitamente: en CI, el `env:` global del workflow ya trae un
    // valor placeholder para esta clave, así que "no asignarla" no alcanza para
    // dejarla ausente — hay que eliminarla del entorno heredado a propósito.
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(import("./env")).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("regresión: variables opcionales vacías (`CLAVE=` en .env.local) no deben tumbar el módulo", async () => {
    Object.assign(process.env, VARS_REQUERIDAS, {
      NEXT_PUBLIC_SENTRY_DSN: "",
      NEXT_PUBLIC_NN_CLIENT_ID: "",
      NEXT_PUBLIC_NN_API_KEY: "",
      NEXT_PUBLIC_NN_ENDPOINT: "",
    });

    const { entornoCliente } = await import("./env");

    expect(entornoCliente.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(entornoCliente.NEXT_PUBLIC_NN_CLIENT_ID).toBeUndefined();
  });

  it("propaga las variables opcionales de Nave Nodriza cuando sí están configuradas", async () => {
    Object.assign(process.env, VARS_REQUERIDAS, {
      NEXT_PUBLIC_NN_CLIENT_ID: "nodexa-core",
      NEXT_PUBLIC_NN_API_KEY: "nn_clave_de_prueba",
    });

    const { entornoCliente } = await import("./env");

    expect(entornoCliente.NEXT_PUBLIC_NN_CLIENT_ID).toBe("nodexa-core");
    expect(entornoCliente.NEXT_PUBLIC_NN_API_KEY).toBe("nn_clave_de_prueba");
  });
});
