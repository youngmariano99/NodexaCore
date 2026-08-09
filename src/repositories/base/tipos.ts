export type ResultadoRepositorio<T> = { ok: true; data: T } | { ok: false; error: string };
