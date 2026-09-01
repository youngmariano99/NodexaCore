"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
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

interface ImportadorExcelAdminProps {
  clienteId: string;
}

export function ImportadorExcelAdmin({ clienteId }: ImportadorExcelAdminProps) {
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
    formData.append("cliente_id_override", clienteId);

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
    <section className="flex flex-col gap-4 rounded-md border border-[#222A27] bg-[#111615] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#222A27] pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-50 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[#16D39A]" />
            Carga Masiva de Productos (Excel)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Importá productos masivamente a este comercio mediante una planilla Excel con las columnas requeridas (<code className="text-slate-300">sku</code>, <code className="text-slate-300">nombre</code>, <code className="text-slate-300">precio</code>, <code className="text-slate-300">categoria</code>).
          </p>
        </div>

        <a
          href="/api/productos/importar/plantilla"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#222A27] bg-[#090B0B] px-4 text-xs font-semibold text-[#16D39A] hover:border-[#16D39A] hover:text-[#16D39A] transition-colors whitespace-nowrap"
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
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md p-8 cursor-pointer transition-colors text-center ${
          arrastrando
            ? "border-[#16D39A] bg-[#16D39A]/5"
            : "border-[#222A27] bg-[#090B0B] hover:border-[#16D39A]/50"
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
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-[#16D39A] animate-spin" />
            <p className="text-xs text-slate-200 font-medium">Procesando planilla e insertando productos...</p>
            <p className="text-[11px] text-slate-400">Por favor esperá unos segundos.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-slate-400" />
            <p className="text-xs text-slate-200 font-medium">
              Arrastrá la planilla acá o <span className="text-[#16D39A]">hacé clic para examinar</span>
            </p>
            <p className="text-[11px] text-slate-500">Formatos permitidos: .xlsx, .xls</p>
          </div>
        )}
      </div>

      {/* Error Global */}
      {errorGlobal && (
        <div className="flex flex-col gap-2">
          <MensajeError codigo={errorGlobal} />
          {errorGlobal === "NX-PRD-007" && (
            <p className="text-xs text-red-400 font-medium pl-6">
              Asegurate de que las columnas coincidan exactamente con: <code className="bg-[#1c2421] px-1.5 py-0.5 rounded border border-[#222A27] text-slate-200">sku</code>, <code className="bg-[#1c2421] px-1.5 py-0.5 rounded border border-[#222A27] text-slate-200">nombre</code>, <code className="bg-[#1c2421] px-1.5 py-0.5 rounded border border-[#222A27] text-slate-200">precio</code> y <code className="bg-[#1c2421] px-1.5 py-0.5 rounded border border-[#222A27] text-slate-200">categoria</code>.
            </p>
          )}
        </div>
      )}

      {/* Resultados de Importación */}
      {resultado && (
        <div className="flex flex-col gap-4 rounded-md border border-[#222A27] bg-[#090B0B] p-4">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Resultado de la importación</h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded border border-[#222A27] bg-[#111615] p-2.5 text-center">
              <span className="block text-[11px] text-slate-400">Total Filas</span>
              <span className="text-base font-mono font-semibold text-slate-100">{resultado.total}</span>
            </div>
            <div className="rounded border border-[#222A27] bg-[#111615] p-2.5 text-center">
              <span className="block text-[11px] text-slate-400">Exitosas</span>
              <span className="text-base font-mono font-semibold text-[#16D39A]">{resultado.insertados}</span>
            </div>
            <div className="rounded border border-[#222A27] bg-[#111615] p-2.5 text-center">
              <span className="block text-[11px] text-slate-400">Rechazadas</span>
              <span className="text-base font-mono font-semibold text-red-400">{resultado.rechazados}</span>
            </div>
          </div>

          {resultado.rechazados > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              <span className="text-xs font-semibold text-slate-400">Detalle de errores:</span>
              <div className="max-h-48 overflow-y-auto border border-[#222A27] rounded bg-[#111615] divide-y divide-[#222A27]">
                {resultado.filas
                  .filter((f) => !f.insertado)
                  .map((fila, idx) => (
                    <div key={idx} className="p-2.5 text-xs flex justify-between gap-4">
                      <div>
                        <span className="text-slate-500 mr-2">Fila {fila.fila}:</span>
                        <span className="font-mono text-slate-300">{fila.sku ?? "—"}</span>
                      </div>
                      <span className="text-red-400 font-medium">
                        {fila.error ? obtenerMensajeError(fila.error) : "Error"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {resultado.insertados > 0 && resultado.rechazados === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-[#16D39A]/10 border border-[#16D39A]/20 p-3 text-xs text-[#16D39A] font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>¡Importación finalizada con éxito! Todos los productos fueron cargados correctamente.</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
