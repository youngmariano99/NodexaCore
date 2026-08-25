const { execSync } = require("child_process");

console.log("==========================================================");
console.log("   Deteniendo Entorno Local de Desarrollo — Nodexa Core   ");
console.log("==========================================================");

// 1. Detener Supabase Local y liberar contenedores de Docker
console.log("\n[1/1] Deteniendo contenedores de Supabase...");
try {
  execSync("npx supabase stop", { stdio: "inherit" });
  console.log("\nServicios de Supabase detenidos con éxito.");
  console.log("Los recursos de Docker han sido liberados.");
} catch (error) {
  console.error("\nERROR: Falló al detener Supabase.");
  process.exit(1);
}
