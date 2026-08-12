// Stub de "server-only" para la suite de integración.
//
// El paquete real (`node_modules/server-only/index.js`) lanza una excepción
// incondicional al importarse: en producción, Next.js sustituye ese módulo
// por un no-op vía alias de webpack cuando bundlea para el runtime de
// servidor (docs: la excepción real solo la produce el bundler al detectar
// una importación desde un Client Component). Fuera de Next.js — como acá,
// Vitest ejecutando Node puro — no existe ese bundler, así que el paquete
// real revienta al importarse aunque el código en cuestión nunca se ejecute
// desde un contexto de cliente. Este stub reproduce exactamente el
// comportamiento que Next.js ya le da en el runtime de servidor real: un
// módulo sin efecto.
export {};
