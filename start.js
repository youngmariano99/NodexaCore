const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("==========================================================");
console.log("   Iniciando Entorno Local de Desarrollo — Nodexa Core    ");
console.log("==========================================================");

// 1. Verificar si Docker está en ejecución
console.log("\n[1/4] Verificando Docker Daemon...");
try {
  execSync("docker info", { stdio: "ignore" });
  console.log("Docker está en ejecución. OK.");
} catch (error) {
  console.error("\nERROR: El demonio de Docker no se está ejecutando.");
  console.error("Por favor, iniciá Docker Desktop en Windows y volvé a intentar.");
  process.exit(1);
}

// 2. Iniciar Supabase Local
console.log("\n[2/4] Iniciando servicios locales de Supabase (PostgreSQL, Auth, Storage)...");
try {
  execSync("npx supabase start", { stdio: "inherit" });
} catch (error) {
  console.error("\nERROR: Falló el inicio de Supabase Local.");
  process.exit(1);
}

// 3. Verificar Variables de Entorno
console.log("\n[3/4] Verificando variables de entorno local (.env.local)...");
const envPath = path.join(__dirname, ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("ADVERTENCIA: No se encontró el archivo .env.local.");
  console.log("Creando una plantilla .env.local inicial con credenciales de Supabase local...");

  try {
    const statusOutput = execSync("npx supabase status --output json", { encoding: "utf8" });
    const statusJson = JSON.parse(statusOutput);
    
    const template = `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${statusJson.anonKey}
SUPABASE_SERVICE_ROLE_KEY=${statusJson.serviceRoleKey}
OPENAI_API_KEY=mock-key-para-desarrollo-local
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=mock-token-redis
CLOUDINARY_API_KEY=mock-cloudinary-key
CLOUDINARY_API_SECRET=mock-cloudinary-secret
`;

    fs.writeFileSync(envPath, template, "utf8");
    console.log(".env.local generado exitosamente.");
  } catch (error) {
    console.error("ADVERTENCIA: No se pudo obtener el estado de Supabase para autogenerar .env.local.");
  }
} else {
  console.log(".env.local existente. OK.");
}

// 4. Iniciar Servidor de Desarrollo Next.js
console.log("\n[4/4] Levantando servidor de desarrollo Next.js...");
console.log("El sitio estará disponible en http://localhost:3000 o http://localhost:3101\n");

try {
  execSync("npm run dev", { stdio: "inherit" });
} catch (error) {
  console.error("\nERROR: Falló el inicio del servidor Next.js.");
  process.exit(1);
}
