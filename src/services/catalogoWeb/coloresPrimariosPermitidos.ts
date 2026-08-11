/**
 * Paleta permitida para `clientes.color_primario` (docs/BACKLOG.md
 * "Server Action actualizarIdentidadVisual", Paso 2; docs/DESIGN.md §5
 * "Directrices de Negación": "NO usar el color púrpura, violeta o índigo de
 * Tailwind"). Se excluye también `fuchsia` — no nombrado literalmente, pero
 * de la misma familia visual que esa directriz busca evitar. Tonos 500
 * estándar de Tailwind; `#3B82F6` es el mismo Acento Core que ya usa la UI
 * interna de NODEXA (docs/DESIGN.md §2) y el valor que ya trae el seed de
 * los 3 tenants demo (docs/SEED.md §1).
 *
 * Vive en su propio módulo (sin `"use server"`) porque
 * `actualizarIdentidadVisual.ts` sí lo tiene: un archivo `"use server"` solo
 * puede exportar funciones async (Server Actions) — exportar una constante
 * desde ahí rompe en el bundle de cliente, que es justamente donde
 * `FormularioIdentidadVisual.tsx` necesita esta lista para pintar los
 * swatches.
 */
export const COLORES_PRIMARIOS_PERMITIDOS = [
  "#EF4444", // red-500
  "#F97316", // orange-500
  "#F59E0B", // amber-500
  "#EAB308", // yellow-500
  "#84CC16", // lime-500
  "#22C55E", // green-500
  "#10B981", // emerald-500
  "#14B8A6", // teal-500
  "#06B6D4", // cyan-500
  "#0EA5E9", // sky-500
  "#3B82F6", // blue-500
  "#EC4899", // pink-500
  "#F43F5E", // rose-500
  "#64748B", // slate-500
] as const;
