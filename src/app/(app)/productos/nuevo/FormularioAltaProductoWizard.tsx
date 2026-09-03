"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import Link from "next/link";

import { crearProducto } from "@/services/productos/crearProducto";
import { ModalBloqueoSku } from "@/components/productos/ModalBloqueoSku";
import { generarMatrizCombinaciones } from "@/lib/dominio/productos/generarMatrizCombinaciones";

import { Paso1DatosGenerales } from "./Paso1DatosGenerales";
import { Paso2Dimensiones } from "./Paso2Dimensiones";
import { Paso3MatrizStock } from "./Paso3MatrizStock";
import { Paso4Resumen } from "./Paso4Resumen";

import { obtenerCategorias, type Categoria } from "@/services/categorias/obtenerCategorias";
import { obtenerMarcas, type Marca } from "@/services/marcas/obtenerMarcas";

interface FormularioAltaProductoWizardProps {
  catalogoWebActivo: boolean;
}

interface Dimension {
  id: string;
  nombre: string;
  valores: string[];
}

export interface VarianteMatriz {
  combinacion: Record<string, string>;
  sku: string;
  stock: number;
  precio: number;
}

export function FormularioAltaProductoWizard({ catalogoWebActivo }: FormularioAltaProductoWizardProps) {
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [guiasActivas, setGuiasActivas] = useState(true);

  // Paso 1: Datos Generales
  const [sku, setSku] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [marcaId, setMarcaId] = useState<string | null>(null);
  const [precio, setPrecio] = useState<number>(0);
  const [imagen, setImagen] = useState<File | Blob | null>(null);
  const [imagenPrevisualizacion, setImagenPrevisualizacion] = useState<string | null>(null);
  const [erroresPaso1, setErroresPaso1] = useState<Record<string, string>>({});

  // Datos maestros
  const [categoriasLista, setCategoriasLista] = useState<Categoria[]>([]);
  const [marcasLista, setMarcasLista] = useState<Marca[]>([]);

  useEffect(() => {
    let montado = true;
    async function cargarMaestros() {
      const [cats, marcs] = await Promise.all([obtenerCategorias(), obtenerMarcas()]);
      if (montado) {
        setCategoriasLista(cats);
        setMarcasLista(marcs);
      }
    }
    cargarMaestros();
    return () => { montado = false; };
  }, []);

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

  const manejarImagenRecortada = (blob: Blob, url: string) => {
    setImagen(blob);
    setImagenPrevisualizacion(url);
  };

  const limpiarImagen = () => {
    setImagen(null);
    setImagenPrevisualizacion(null);
  };

  const validarPaso1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!sku.trim()) errs.sku = "Obligatorio";
    if (!nombre.trim()) errs.nombre = "Obligatorio";
    if (!categoria.trim()) errs.categoria = "Obligatorio";
    if (precio < 0) errs.precio = "Debe ser positivo";

    if (Object.keys(errs).length > 0) {
      setErroresPaso1(errs);
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

  const irAlPaso4 = () => {
    setPaso(4);
  };

  const manejarGuardadoFinal = async (cargarOtro: boolean = false) => {
    setEstaEnviando(true);
    setErrorServidor(null);

    try {
      const formData = new FormData();
      formData.set("sku", sku);
      formData.set("nombre", nombre);
      formData.set("categoria", categoria);
      if (categoriaId) formData.set("categoria_id", categoriaId);
      if (marcaId) formData.set("marca_id", marcaId);
      formData.set("precio", precio.toString());
      if (imagen) {
        formData.set("imagen", imagen, "foto.jpg");
      }

      if (dimensiones.length > 0) {
        formData.set("dimensiones", JSON.stringify(dimensiones));
        formData.set("variantes", JSON.stringify(matrizVariantes));
      }

      const resultado = await crearProducto({ error: null, exito: false }, formData);

      if (resultado.exito) {
        if (cargarOtro) {
          // Resetear form para cargar otro
          setSku("");
          setNombre("");
          setPrecio(0);
          limpiarImagen();
          setDimensiones([]);
          setMatrizVariantes([]);
          setPaso(1);
          window.scrollTo(0, 0);
        } else {
          setExito(true);
        }
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

  if (exito) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-6 rounded-lg bg-[#0D1110] border border-[#222A27] p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#16D39A]/20">
          <HelpCircle className="h-8 w-8 text-[#16D39A] opacity-0 absolute" />
          <svg className="h-8 w-8 text-[#16D39A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-slate-50">¡Producto guardado exitosamente!</h2>
          <p className="text-slate-400">Tu producto ya forma parte de tu catálogo.</p>
        </div>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => {
              setExito(false);
              setSku("");
              setNombre("");
              setPrecio(0);
              limpiarImagen();
              setDimensiones([]);
              setMatrizVariantes([]);
              setPaso(1);
            }}
            className="rounded-md border border-[#222A27] bg-[#111615] px-6 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5"
          >
            Cargar otro producto
          </button>
          <Link
            href="/productos"
            className="rounded-md bg-[#16D39A] px-6 py-2 text-sm font-semibold text-[#090B0B] hover:bg-[#16D39A]/90"
          >
            Volver al Listado
          </Link>
        </div>
      </div>
    );
  }

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
          categoriaId={categoriaId}
          setCategoriaId={setCategoriaId}
          marcaId={marcaId}
          setMarcaId={setMarcaId}
          precio={precio}
          setPrecio={setPrecio}
          catalogoWebActivo={catalogoWebActivo}
          imagenPrevisualizacion={imagenPrevisualizacion}
          manejarImagenRecortada={manejarImagenRecortada}
          limpiarImagen={limpiarImagen}
          errores={erroresPaso1}
          guiasActivas={guiasActivas}
          categoriasLista={categoriasLista}
          marcasLista={marcasLista}
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
          alAtras={() => setPaso(2)}
          alFinalizar={irAlPaso4}
          estaEnviando={estaEnviando}
          guiasActivas={guiasActivas}
        />
      )}

      {paso === 4 && (
        <Paso4Resumen
          sku={sku}
          nombre={nombre}
          categoria={categoria}
          precio={precio}
          imagenPrevisualizacion={imagenPrevisualizacion}
          matrizVariantes={matrizVariantes}
          alCargarOtro={() => manejarGuardadoFinal(true)}
          alFinalizar={() => manejarGuardadoFinal(false)}
          estaEnviando={estaEnviando}
          errorServidor={errorServidor}
        />
      )}

      <ModalBloqueoSku abierto={modalBloqueoAbierto} onCerrar={() => setModalBloqueoAbierto(false)} />
    </div>
  );
}
