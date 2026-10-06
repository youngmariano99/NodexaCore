import { Metadata } from "next";
import { ConfiguracionGastronomia } from "./ConfiguracionGastronomia";

export const metadata: Metadata = {
  title: "Configuración de Gastronomía | Nodexa",
  description: "Configuración global de costos indirectos y márgenes",
};

export default function GastronomiaPage() {
  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#F3F5F4]">Gastronomía</h1>
        <p className="text-sm text-[#A6AEAA]">
          Administrá tus costos indirectos y el margen de ganancia sugerido para calcular el precio de tus recetas.
        </p>
      </div>
      <ConfiguracionGastronomia />
    </div>
  );
}
