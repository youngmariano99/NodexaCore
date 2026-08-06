import { RegistradorVistaVidriera } from "@/components/analytics/registrador-vista-vidriera";

export const revalidate = 60;

export default async function VidrieraPublica({
  params,
}: {
  params: Promise<{ clienteSlug: string }>;
}) {
  const { clienteSlug } = await params;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <RegistradorVistaVidriera clienteId={clienteSlug} />
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Vidriera de {clienteSlug}</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        El catálogo público de este comercio todavía no tiene productos publicados.
      </p>
    </div>
  );
}
