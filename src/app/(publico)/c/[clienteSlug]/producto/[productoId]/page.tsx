import { BotonWhatsappCta } from "@/components/analytics/boton-whatsapp-cta";

export const revalidate = 60;

export default async function FichaProductoPublica({
  params,
}: {
  params: Promise<{ clienteSlug: string; productoId: string }>;
}) {
  const { clienteSlug, productoId } = await params;
  const productoNombre = `Producto ${productoId}`;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{productoNombre}</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        La ficha de producto de {clienteSlug} todavía no tiene datos cargados.
      </p>
      <BotonWhatsappCta
        clienteId={clienteSlug}
        productoId={productoId}
        productoNombre={productoNombre}
        numeroWhatsapp="5492920000000"
      />
    </div>
  );
}
