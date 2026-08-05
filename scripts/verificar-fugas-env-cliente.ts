import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local (build en Vercel): las variables ya están en process.env.
}

const secreto = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!secreto) {
  console.log("verificar-fugas-env-cliente: SUPABASE_SERVICE_ROLE_KEY no está definida, nada que auditar.");
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

const archivosConFuga = listarArchivos(directorioCliente)
  .filter((ruta) => /\.(js|mjs|txt|map)$/.test(ruta))
  .filter((ruta) => readFileSync(ruta, "utf8").includes(secreto));

if (archivosConFuga.length > 0) {
  console.error(
    `[NX-SYS-001] Se detectó SUPABASE_SERVICE_ROLE_KEY expuesta en ${archivosConFuga.length} archivo(s) del bundle de cliente (.next/static). No pudimos completar el build de forma segura.`,
  );
  process.exit(1);
}

console.log("verificar-fugas-env-cliente: SUPABASE_SERVICE_ROLE_KEY no aparece en el bundle de cliente. OK.");
