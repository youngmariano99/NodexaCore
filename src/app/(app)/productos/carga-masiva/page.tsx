import type { Metadata } from "next";

import { CargaMasivaExcel } from "./carga-masiva-excel";

export const metadata: Metadata = {
  title: "Carga masiva — Nodexa Core",
};

export const dynamic = "force-dynamic";

export default function CargaMasivaPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-[#090B0B] px-6 py-10 text-[#F3F5F4]">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#F3F5F4]">Carga masiva por Excel</h1>
          <p className="text-sm text-[#A6AEAA]">
            Subí tu inventario completo de forma masiva utilizando nuestra planilla estructurada.
          </p>
        </header>

        <CargaMasivaExcel />
      </div>
    </div>
  );
}
