"use client";

import { Upload, Camera, X, HelpCircle, Wand2 } from "lucide-react";
import { InputDinero } from "@/components/ui/InputDinero";
import { SelectorRelacionalInline } from "@/components/ui/SelectorRelacionalInline";
import { RecortadorImagen } from "@/components/ui/RecortadorImagen";
import { useState, useRef } from "react";
import { crearCategoria } from "@/services/categorias/crearCategoria";
import { crearMarca } from "@/services/marcas/crearMarca";
import type { Categoria } from "@/services/categorias/obtenerCategorias";
import type { Marca } from "@/services/marcas/obtenerMarcas";

interface Paso1DatosGeneralesProps {
  sku: string;
  setSku: (v: string) => void;
  nombre: string;
  setNombre: (v: string) => void;
  categoria: string;
  setCategoria: (v: string) => void;
  categoriaId: string | null;
  setCategoriaId: (v: string | null) => void;
  marcaId: string | null;
  setMarcaId: (v: string | null) => void;
  precio: number;
  setPrecio: (v: number) => void;
  catalogoWebActivo: boolean;
  imagenPrevisualizacion: string | null;
  manejarImagenRecortada: (blob: Blob, previewUrl: string) => void;
  limpiarImagen: () => void;
  errores: Record<string, string>;
  guiasActivas: boolean;
  alSiguiente: () => void;
  categoriasLista: Categoria[];
  marcasLista: Marca[];
  agregarCategoria: (c: Categoria) => void;
  agregarMarca: (m: Marca) => void;
}

export function Paso1DatosGenerales({
  sku,
  setSku,
  nombre,
  setNombre,
  categoria,
  setCategoria,
  categoriaId,
  setCategoriaId,
  marcaId,
  setMarcaId,
  precio,
  setPrecio,
  catalogoWebActivo,
  imagenPrevisualizacion,
  manejarImagenRecortada,
  limpiarImagen,
  errores,
  guiasActivas,
  alSiguiente,
  categoriasLista,
  marcasLista,
  agregarCategoria,
  agregarMarca,
}: Paso1DatosGeneralesProps) {
  const [imagenSinRecortar, setImagenSinRecortar] = useState<string | null>(null);
  
  // Referencias para inputs nativos
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const inputCamaraRef = useRef<HTMLInputElement>(null);

  const CLASES_CAMPO_BASE =
    "min-h-11 w-full rounded-md border bg-[#111615] border-[#222A27] px-4 text-base text-slate-50 placeholder:text-slate-500 outline-none transition-colors duration-150 focus:border-[#16D39A]";

  const procesarSeleccionImagen = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (archivo) {
      const url = URL.createObjectURL(archivo);
      setImagenSinRecortar(url);
    }
    // Limpiar input para permitir seleccionar la misma de nuevo si se canceló
    evento.target.value = "";
  };

  const generarSKU = () => {
    let prefijo = "";
    if (categoria) prefijo += categoria.substring(0, 3).toUpperCase() + "-";
    const marca = marcasLista.find((m) => m.marca_id === marcaId);
    if (marca) prefijo += marca.nombre.substring(0, 3).toUpperCase() + "-";
    if (nombre) prefijo += nombre.substring(0, 4).toUpperCase().replace(/\s/g, "") + "-";
    
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setSku(prefijo ? `${prefijo}${randomSuffix}` : `PRD-${randomSuffix}`);
  };

  const saltarAlSiguiente = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Pequeño hack: hacer tab para ir al siguiente input interactivo
      const form = e.currentTarget.form;
      if (form) {
        const index = Array.prototype.indexOf.call(form, e.currentTarget);
        (form.elements[index + 1] as HTMLElement)?.focus();
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {imagenSinRecortar && (
        <RecortadorImagen
          imagenSrc={imagenSinRecortar}
          onCancelar={() => setImagenSinRecortar(null)}
          onCompletado={(blob, url) => {
            manejarImagenRecortada(blob, url);
            setImagenSinRecortar(null);
          }}
        />
      )}

      {guiasActivas && (
        <div className="bg-[#111615] border border-[#222A27] p-4 rounded-md text-sm text-slate-300 flex gap-2">
          <HelpCircle className="h-5 w-5 text-[#16D39A] shrink-0" />
          <p>
            <strong>Consejo:</strong> Cargá un SKU único y descriptivo para el producto. El <strong>Precio base</strong> servirá como referencia para las variantes que generes en el último paso.
          </p>
        </div>
      )}

      {catalogoWebActivo && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Foto Principal</span>
          
          {imagenPrevisualizacion ? (
            <div className="relative h-32 w-32 overflow-hidden rounded-md border border-[#222A27]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagenPrevisualizacion} alt="Previsualización" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  limpiarImagen();
                }}
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => inputArchivoRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-dashed border-[#222A27] bg-[#111615] hover:border-[#16D39A]/60 p-4 transition-colors duration-150 text-slate-400 hover:text-slate-200"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Subir archivo</span>
              </button>
              
              <button
                type="button"
                onClick={() => inputCamaraRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-dashed border-[#222A27] bg-[#111615] hover:border-[#16D39A]/60 p-4 transition-colors duration-150 text-slate-400 hover:text-slate-200"
              >
                <Camera className="h-6 w-6" />
                <span className="text-sm font-medium">Tomar foto</span>
              </button>
            </div>
          )}

          <input ref={inputArchivoRef} type="file" accept="image/*" className="hidden" onChange={procesarSeleccionImagen} />
          <input ref={inputCamaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={procesarSeleccionImagen} />
        </div>
      )}

      <div className="flex flex-col gap-2 relative">
        <label htmlFor="nombre" className="text-sm font-medium text-slate-300">Nombre</label>
        <input
          id="nombre"
          type="text"
          autoFocus
          placeholder="ej. Helado Premium"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={saltarAlSiguiente}
          className={CLASES_CAMPO_BASE}
        />
        {errores.nombre && <span className="text-xs text-red-500">{errores.nombre}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectorRelacionalInline
          label="Categoría"
          placeholder="Seleccionar categoría..."
          items={categoriasLista.map((c) => ({ id: c.categoria_id, nombre: c.nombre }))}
          valorSeleccionado={categoriaId}
          error={errores.categoria}
          onSeleccionar={(id, nom) => {
            setCategoriaId(id);
            setCategoria(nom);
          }}
          onCrearNuevo={async (nom) => {
            const res = await crearCategoria(nom);
            if (res.exito && res.categoria) {
              agregarCategoria(res.categoria);
              return { exito: true, item: { id: res.categoria.categoria_id, nombre: res.categoria.nombre } };
            }
            return { exito: false, error: res.error };
          }}
        />

        <SelectorRelacionalInline
          label="Marca (Opcional)"
          placeholder="Seleccionar marca..."
          items={marcasLista.map((m) => ({ id: m.marca_id, nombre: m.nombre }))}
          valorSeleccionado={marcaId}
          onSeleccionar={(id) => setMarcaId(id)}
          onCrearNuevo={async (nom) => {
            const res = await crearMarca(nom);
            if (res.exito && res.marca) {
              agregarMarca(res.marca);
              return { exito: true, item: { id: res.marca.marca_id, nombre: res.marca.nombre } };
            }
            return { exito: false, error: res.error };
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="sku" className="text-sm font-medium text-slate-300 flex justify-between">
          <span>SKU</span>
          <button 
            type="button"
            onClick={generarSKU} 
            className="flex items-center gap-1 text-xs text-[#16D39A] hover:text-[#16D39A]/80 transition-colors"
          >
            <Wand2 className="h-3 w-3" />
            Generar inteligente
          </button>
        </label>
        <input
          id="sku"
          type="text"
          placeholder="ej. HEL-1KG-001"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          onKeyDown={saltarAlSiguiente}
          className={CLASES_CAMPO_BASE}
        />
        {errores.sku && <span className="text-xs text-red-500">{errores.sku}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="precio" className="text-sm font-medium text-slate-300">Precio base ($)</label>
        <InputDinero
          id="precio"
          placeholder="0,00"
          value={precio || ""}
          onValueChange={(val) => setPrecio(val)}
        />
        {errores.precio && <span className="text-xs text-red-500">{errores.precio}</span>}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={alSiguiente}
          className="flex min-h-11 items-center gap-2 rounded-md bg-[#16D39A] px-5 text-sm font-semibold text-[#090B0B] transition-colors duration-150 hover:bg-[#16D39A]/90"
        >
          Siguiente: Dimensiones
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
