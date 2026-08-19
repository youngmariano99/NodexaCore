"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { MensajeError } from "@/components/errores/MensajeError";
import { obtenerMensajeError } from "@/lib/errores/catalogo";

interface FilaReporte {
  fila: number;
  sku: string | null;
  insertado: boolean;
  error: string | null;
}

interface ResultadoImportacion {
  total: number;
  insertados: number;
  rechazados: number;
  filas: FilaReporte[];
}

export function CargaMasivaExcel() {
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = () => {
    setArrastrando(false);
  };

  const procesarArchivo = async (file: File) => {
    if (!file) return;
    setCargando(true);
    setErrorGlobal(null);
    setResultado(null);

    const formData = new FormData();
    formData.append("archivo", file);

    try {
      const res = await fetch("/api/productos/importar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorGlobal(data.codigo ?? "NX-SYS-001");
      } else {
        setResultado(data);
      }
    } catch {
      setErrorGlobal("NX-SYS-001");
    } finally {
      setCargando(false);
      setArrastrando(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
  };

  const triggerSelectFile = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      {/* Botón Volver */}
      <div className="flex">
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#A6AEAA] hover:text-[#F3F5F4] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>
      </div>

      {/* Descarga de Plantilla */}
      <div className="rounded-md border border-[#222A27] bg-[#111615] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-6 w-6 text-[#16D39A] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[#F3F5F4]">Plantilla oficial de importación</h3>
            <p className="text-xs text-[#A6AEAA] mt-1">
              Descargá la plantilla Excel estructurada con las columnas requeridas (sku, nombre, precio, categoria).
            </p>
          </div>
        </div>
        <a
          href="/api/productos/importar/plantilla"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#222A27] bg-[#0D1110] px-4 text-xs font-semibold text-[#16D39A] hover:border-[#16D39A] hover:text-[#F3F5F4] transition-colors whitespace-nowrap"
        >
          Descargar plantilla
        </a>
      </div>

      {/* Area Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerSelectFile}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md p-10 cursor-pointer transition-colors text-center ${
          arrastrando
            ? "border-[#16D39A] bg-[#16D39A]/5"
            : "border-[#222A27] bg-[#111615] hover:border-[#16D39A]/50"
        }`}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls"
          className="hidden"
        />

        {cargando ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-[#16D39A] animate-spin" />
            <p className="text-sm text-[#F3F5F4] font-medium">Procesando planilla Excel...</p>
            <p className="text-xs text-[#A6AEAA]">Esto puede tardar unos segundos, por favor no cierres la pantalla.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-[#A6AEAA]" />
            <p className="text-sm text-[#F3F5F4] font-medium">
              Arrastrá tu archivo Excel acá o <span className="text-[#16D39A]">hacé clic para examinar</span>
            </p>
            <p className="text-xs text-[#737C78]">Formatos permitidos: .xlsx, .xls</p>
          </div>
        )}
      </div>

      {/* Error Global */}
      {errorGlobal && (
        <div className="flex flex-col gap-3">
          <MensajeError codigo={errorGlobal} />
          {errorGlobal === "NX-PRD-007" && (
            <p className="text-xs text-[#EF4444] font-medium pl-6">
              Asegurate de que las columnas coincidan exactamente con: <code className="bg-[#151A18] px-1.5 py-0.5 rounded border border-[#222A27] text-[#F3F5F4]">sku</code>, <code className="bg-[#151A18] px-1.5 py-0.5 rounded border border-[#222A27] text-[#F3F5F4]">nombre</code>, <code className="bg-[#151A18] px-1.5 py-0.5 rounded border border-[#222A27] text-[#F3F5F4]">precio</code> y <code className="bg-[#151A18] px-1.5 py-0.5 rounded border border-[#222A27] text-[#F3F5F4]">categoria</code>.
            </p>
          )}
        </div>
      )}

      {/* Resultados de Importación */}
      {resultado && (
        <div className="flex flex-col gap-4 rounded-md border border-[#222A27] bg-[#111615] p-6">
          <h3 className="text-sm font-semibold text-[#F3F5F4]">Resultado de la importación</h3>
          
          <div className="grid grid-cols-3 gap-4 my-2">
            <div className="rounded border border-[#222A27] bg-[#0D1110] p-3 text-center">
              <span className="block text-xs text-[#A6AEAA]">Total Filas</span>
              <span className="text-lg font-mono font-semibold text-[#F3F5F4]">{resultado.total}</span>
            </div>
            <div className="rounded border border-[#222A27] bg-[#0D1110] p-3 text-center">
              <span className="block text-xs text-[#A6AEAA]">Exitosas</span>
              <span className="text-lg font-mono font-semibold text-[#16D39A]">{resultado.insertados}</span>
            </div>
            <div className="rounded border border-[#222A27] bg-[#0D1110] p-3 text-center">
              <span className="block text-xs text-[#A6AEAA]">Rechazadas</span>
              <span className="text-lg font-mono font-semibold text-[#EF4444]">{resultado.rechazados}</span>
            </div>
          </div>

          {resultado.rechazados > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-xs font-semibold text-[#A6AEAA]">Detalle de errores detectados:</span>
              <div className="max-h-60 overflow-y-auto border border-[#222A27] rounded bg-[#0D1110] divide-y divide-[#222A27]">
                {resultado.filas
                  .filter((f) => !f.insertado)
                  .map((fila, idx) => (
                    <div key={idx} className="p-3 text-xs flex justify-between gap-4">
                      <div>
                        <span className="text-[#737C78] mr-2">Fila {fila.fila}:</span>
                        <span className="font-mono text-[#A6AEAA]">{fila.sku ?? "—"}</span>
                      </div>
                      <span className="text-[#EF4444] font-medium">
                        {fila.error ? obtenerMensajeError(fila.error) : "Error desconocido"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {resultado.insertados > 0 && resultado.rechazados === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-[#16D39A]/10 border border-[#16D39A]/20 p-3 text-xs text-[#16D39A] font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>¡Importación finalizada con éxito! Todos los registros fueron procesados correctamente.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
