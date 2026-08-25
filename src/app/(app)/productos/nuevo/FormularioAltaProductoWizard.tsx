"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { z } from "zod";

import { crearProducto } from "@/services/productos/crearProducto";
import { ModalBloqueoSku } from "@/components/productos/ModalBloqueoSku";
import { generarMatrizCombinaciones } from "@/lib/dominio/productos/generarMatrizCombinaciones";

import { Paso1DatosGenerales } from "./Paso1DatosGenerales";
import { Paso2Dimensiones } from "./Paso2Dimensiones";
import { Paso3MatrizStock } from "./Paso3MatrizStock";

interface FormularioAltaProductoWizardProps {
  catalogoWebActivo: boolean;
}

interface Dimension {
  id: string;
  nombre: string;
  valores: string[];
}

interface VarianteMatriz {
  combinacion: Record<string, string>;
  sku: string;
  stock: number;
  precio: number;
}

const esquemaPaso1 = z.object({
  sku: z.string().trim().min(1, "El SKU es obligatorio."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  categoria: z.string().trim().min(1, "La categoría es obligatoria."),
  precio: z.number().min(0, "El precio no puede ser negativo."),
});

export function FormularioAltaProductoWizard({ catalogoWebActivo }: FormularioAltaProductoWizardProps) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [guiasActivas, setGuiasActivas] = useState(true);

  // Paso 1: Datos Generales
  const [sku, setSku] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precio, setPrecio] = useState<number>(0);
  const [imagen, setImagen] = useState<File | null>(null);
  const [imagenPrevisualizacion, setImagenPrevisualizacion] = useState<string | null>(null);
  const [erroresPaso1, setErroresPaso1] = useState<Record<string, string>>({});

  // Paso 2: Dimensiones de Variantes
  const [dimensiones, setDimensiones] = useState<Dimension[]>([]);
  const [nuevaDimensionNombre, setNuevaDimensionNombre] = useState("");
  const [nuevoValorInputs, setNuevoValorInputs] = useState<Record<string, string>>({});
  const [errorPaso2, setErrorPaso2] = useState<string | null>(null);

  // Paso 3: Matriz de variantes y stock
  const [matrizVariantes, setMatrizVariantes] = useState<VarianteMatriz[]>([]);
  const [estaEnviando, setEstaEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [modalBloqueoAbierto, setModalBloqueoAbierto] = useState(false);
  const [exito, setExito] = useState(false);

  const manejarImagen = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (archivo) {
      setImagen(archivo);
      const url = URL.createObjectURL(archivo);
      setImagenPrevisualizacion(url);
    }
  };

  const limpiarImagen = () => {
    setImagen(null);
    setImagenPrevisualizacion(null);
  };

  const validarPaso1 = (): boolean => {
    const validacion = esquemaPaso1.safeParse({
      sku,
      nombre,
      categoria,
      precio,
    });

    if (!validacion.success) {
      const mapeoErrores: Record<string, string> = {};
      validacion.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          mapeoErrores[issue.path[0].toString()] = issue.message;
        }
      });
      setErroresPaso1(mapeoErrores);
      return false;
    }

    setErroresPaso1({});
    return true;
  };

  const irAlPaso3 = () => {
    if (dimensiones.length > 0) {
      const dimensionesIncompletas = dimensiones.some((d) => d.valores.length === 0);
      if (dimensionesIncompletas) {
        setErrorPaso2("Cargá al menos una opción para cada dimensión agregada.");
        return;
      }
    }

    setErrorPaso2(null);
    const nuevaMatriz = generarMatrizCombinaciones(dimensiones, sku, precio, 10);
    setMatrizVariantes(nuevaMatriz);
    setPaso(3);
  };

  const manejarGuardadoFinal = async () => {
    setEstaEnviando(true);
    setErrorServidor(null);

    try {
      const formData = new FormData();
      formData.set("sku", sku);
      formData.set("nombre", nombre);
      formData.set("categoria", categoria);
      formData.set("precio", precio.toString());
      if (imagen) {
        formData.set("imagen", imagen);
      }

      if (dimensiones.length > 0) {
        formData.set("dimensiones", JSON.stringify(dimensiones));
        formData.set("variantes", JSON.stringify(matrizVariantes));
      }

      const resultado = await crearProducto({ error: null, exito: false }, formData);

      if (resultado.exito) {
        setExito(true);
      } else {
        if (resultado.error === "NX-PRD-001") {
          setModalBloqueoAbierto(true);
        } else {
          setErrorServidor(resultado.error);
        }
      }
    } catch {
      setErrorServidor("NX-SYS-001");
    } finally {
      setEstaEnviando(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-row justify-between items-center bg-[#0D1110] border border-[#222A27] px-4 py-3 rounded-md">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-[#16D39A]" />
          <span className="text-sm font-medium text-slate-300">Guías y Consejos</span>
        </div>
        <button
          onClick={() => setGuiasActivas(!guiasActivas)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            guiasActivas ? "bg-[#16D39A]" : "bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-[#090B0B] transition-transform duration-200 ${
              guiasActivas ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              paso >= 1 ? "bg-[#16D39A] text-[#090B0B]" : "bg-slate-800 text-slate-400"
            }`}
          >
            1
          </span>
          <span className="text-xs font-semibold text-slate-300">Datos Generales</span>
        </div>
        <div className="h-px flex-1 bg-[#222A27] mx-4" />
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              paso >= 2 ? "bg-[#16D39A] text-[#090B0B]" : "bg-slate-800 text-slate-400"
            }`}
          >
            2
          </span>
          <span className="text-xs font-semibold text-slate-300">Dimensiones</span>
        </div>
        <div className="h-px flex-1 bg-[#222A27] mx-4" />
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              paso >= 3 ? "bg-[#16D39A] text-[#090B0B]" : "bg-slate-800 text-slate-400"
            }`}
          >
            3
          </span>
          <span className="text-xs font-semibold text-slate-300">Matriz de Stock</span>
        </div>
      </div>

      {paso === 1 && (
        <Paso1DatosGenerales
          sku={sku}
          setSku={setSku}
          nombre={nombre}
          setNombre={setNombre}
          categoria={categoria}
          setCategoria={setCategoria}
          precio={precio}
          setPrecio={setPrecio}
          catalogoWebActivo={catalogoWebActivo}
          imagenPrevisualizacion={imagenPrevisualizacion}
          manejarImagen={manejarImagen}
          limpiarImagen={limpiarImagen}
          errores={erroresPaso1}
          guiasActivas={guiasActivas}
          alSiguiente={() => {
            if (validarPaso1()) setPaso(2);
          }}
        />
      )}

      {paso === 2 && (
        <Paso2Dimensiones
          dimensiones={dimensiones}
          setDimensiones={setDimensiones}
          nuevaDimensionNombre={nuevaDimensionNombre}
          setNuevaDimensionNombre={setNuevaDimensionNombre}
          nuevoValorInputs={nuevoValorInputs}
          setNuevoValorInputs={setNuevoValorInputs}
          errorPaso2={errorPaso2}
          setErrorPaso2={setErrorPaso2}
          guiasActivas={guiasActivas}
          alAtras={() => setPaso(1)}
          alSiguiente={irAlPaso3}
        />
      )}

      {paso === 3 && (
        <Paso3MatrizStock
          matrizVariantes={matrizVariantes}
          setMatrizVariantes={setMatrizVariantes}
          errorServidor={errorServidor}
          exito={exito}
          estaEnviando={estaEnviando}
          guiasActivas={guiasActivas}
          alAtras={() => setPaso(2)}
          guardar={manejarGuardadoFinal}
        />
      )}

      <ModalBloqueoSku abierto={modalBloqueoAbierto} onCerrar={() => setModalBloqueoAbierto(false)} />
    </div>
  );
}
