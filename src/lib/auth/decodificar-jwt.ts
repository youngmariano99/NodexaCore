import type { ClaimsSesion } from "@/services/autenticacion/tipos";

/**
 * Decodifica el payload de un access_token JWT sin verificar la firma.
 * Es seguro porque solo se llama después de que supabase.auth.getUser()
 * ya validó el token contra el servidor de Supabase Auth (middleware.ts).
 * Runtime Edge: se usa atob global en vez de Buffer.
 */
export function decodificarClaimsSesion(accessToken: string): ClaimsSesion | null {
  try {
    const payloadCodificado = accessToken.split(".")[1];
    if (!payloadCodificado) {
      return null;
    }

    const base64 = payloadCodificado.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as Partial<ClaimsSesion>;

    if (!payload.rol || typeof payload.exp !== "number" || typeof payload.iat !== "number") {
      return null;
    }

    return {
      sub: payload.sub ?? "",
      cliente_id: payload.cliente_id ?? null,
      rol: payload.rol,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
