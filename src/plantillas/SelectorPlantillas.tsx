import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { NombrePlantilla, PlantillaProps } from "./tipos";

export type { ClientePublico, NombrePlantilla, PlantillaProps, ProductoPublico } from "./tipos";

function SkeletonCargaPlantilla() {
  return (
    <div className="flex flex-1 flex-col animate-pulse bg-white p-6">
      <div className="h-32 w-full rounded-lg bg-slate-200" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-48 rounded-md bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

// Imports dinámicos con next/dynamic para Code Splitting estricto por plantilla
const PlantillaBasica = dynamic<PlantillaProps>(
  () => import("./basica/PlantillaBasica"),
  {
    loading: () => <SkeletonCargaPlantilla />,
  }
);

const PlantillaLaMartina = dynamic<PlantillaProps>(
  () => import("./la-martina/PlantillaLaMartina"),
  {
    loading: () => <SkeletonCargaPlantilla />,
  }
);

const PlantillaFilomena = dynamic<PlantillaProps>(
  () => import("./filomena/PlantillaFilomena"),
  {
    loading: () => <SkeletonCargaPlantilla />,
  }
);

const MAPA_PLANTILLAS: Record<string, ComponentType<PlantillaProps>> = {
  basica: PlantillaBasica,
  "la-martina": PlantillaLaMartina,
  filomena: PlantillaFilomena,
};

interface SelectorPlantillasProps extends PlantillaProps {
  plantillaActiva?: NombrePlantilla;
}

/**
 * Componente Ruteador y Selector de Plantillas Públicas del Catálogo Web.
 * Realiza Code Splitting dinámico vía `next/dynamic` descargando únicamente
 * el bundle JavaScript de la plantilla asignada al comercio (`plantilla_activa`).
 */
export function SelectorPlantillas({
  plantillaActiva = "basica",
  ...props
}: SelectorPlantillasProps) {
  const ComponentePlantilla = MAPA_PLANTILLAS[plantillaActiva] ?? PlantillaBasica;
  return <ComponentePlantilla {...props} />;
}
