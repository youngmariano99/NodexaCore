import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local (build en Vercel): las variables ya están en process.env.
}

const SECRETOS_A_AUDITAR = ["SUPABASE_SERVICE_ROLE_KEY", "UPSTASH_REDIS_REST_TOKEN"] as const;

type SecretoAAuditar = (typeof SECRETOS_A_AUDITAR)[number];

const secretosPresentes = SECRETOS_A_AUDITAR.map((nombre) => ({ nombre, valor: process.env[nombre] })).filter(
  (secreto): secreto is { nombre: SecretoAAuditar; valor: string } => Boolean(secreto.valor),
);

if (secretosPresentes.length === 0) {
  console.log("verificar-fugas-env-cliente: ningún secreto server-only está definido, nada que auditar.");
  process.exit(0);
}

const directorioCliente = join(process.cwd(), ".next", "static");

if (!existsSync(directorioCliente)) {
  console.log("verificar-fugas-env-cliente: no existe .next/static, se omite (¿se corrió npm run build?).");
  process.exit(0);
}

function listarArchivos(directorio: string): string[] {
  return readdirSync(directorio).flatMap((entrada) => {
    const ruta = join(directorio, entrada);
    return statSync(ruta).isDirectory() ? listarArchivos(ruta) : [ruta];
  });
}

const archivosCliente = listarArchivos(directorioCliente).filter((ruta) => /\.(js|mjs|txt|map)$/.test(ruta));

const fugas = secretosPresentes.flatMap(({ nombre, valor }) => {
  const archivosConFuga = archivosCliente.filter((ruta) => readFileSync(ruta, "utf8").includes(valor));
  return archivosConFuga.map((ruta) => ({ nombre, ruta }));
});

if (fugas.length > 0) {
  const detalle = fugas.map(({ nombre, ruta }) => `  - ${nombre} en ${ruta}`).join("\n");
  console.error(
    `[NX-SYS-001] Se detectaron secretos server-only expuestos en el bundle de cliente (.next/static). No pudimos completar el build de forma segura:\n${detalle}`,
  );
  process.exit(1);
}

console.log(
  `verificar-fugas-env-cliente: ${secretosPresentes.map((s) => s.nombre).join(", ")} no aparecen en el bundle de cliente. OK.`,
);
