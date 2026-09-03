"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";

interface Item {
  id: string;
  nombre: string;
}

interface SelectorRelacionalInlineProps {
  label: string;
  placeholder?: string;
  items: Item[];
  valorSeleccionado: string | null;
  onSeleccionar: (id: string, nombre: string) => void;
  onCrearNuevo: (nombre: string) => Promise<{ exito: boolean; item?: Item; error?: string }>;
  error?: string;
  onEnterPulsado?: () => void;
}

export function SelectorRelacionalInline({
  label,
  placeholder = "Buscar o crear...",
  items,
  valorSeleccionado,
  onSeleccionar,
  onCrearNuevo,
  error,
  onEnterPulsado,
}: SelectorRelacionalInlineProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const nombreSeleccionado = items.find((i) => i.id === valorSeleccionado)?.nombre || "";

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (abierto && inputRef.current) {
      inputRef.current.focus();
    }
  }, [abierto]);

  const itemsFiltrados = items.filter((item) =>
    item.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const existeCoincidenciaExacta = items.some(
    (item) => item.nombre.toLowerCase() === busqueda.toLowerCase().trim()
  );

  const manejarCrearNuevo = async () => {
    if (!busqueda.trim() || creando) return;
    setCreando(true);
    const resultado = await onCrearNuevo(busqueda.trim());
    if (resultado.exito && resultado.item) {
      onSeleccionar(resultado.item.id, resultado.item.nombre);
      setAbierto(false);
      setBusqueda("");
      // Volver el foco al boton para seguir con el TAB
      triggerRef.current?.focus();
    }
    setCreando(false);
  };

  return (
    <div className="flex flex-col gap-2 relative" ref={contenedorRef}>
      <label className="text-sm font-medium text-slate-300">{label}</label>
      
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAbierto(!abierto)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !abierto && onEnterPulsado) {
            e.preventDefault();
            onEnterPulsado();
          } else if (e.key === "Enter" && !abierto) {
            e.preventDefault();
            setAbierto(true);
          }
        }}
        className={`flex min-h-11 w-full items-center justify-between rounded-md border bg-[#111615] px-4 text-base transition-colors duration-150 outline-none focus:border-[#16D39A]
          ${abierto ? "border-[#16D39A]" : "border-[#222A27]"}
          ${error ? "border-red-500" : ""}
        `}
      >
        <span className={nombreSeleccionado ? "text-slate-50" : "text-slate-500"}>
          {nombreSeleccionado || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {error && <span className="text-xs text-red-500">{error}</span>}

      {abierto && (
        <div className="absolute top-[76px] z-50 w-full rounded-md border border-[#222A27] bg-[#090B0B] shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#222A27] px-3 py-2 bg-[#111615]">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
              placeholder="Escribí para buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (itemsFiltrados.length > 0) {
                    onSeleccionar(itemsFiltrados[0].id, itemsFiltrados[0].nombre);
                    setAbierto(false);
                    triggerRef.current?.focus();
                  } else if (busqueda.trim() && !existeCoincidenciaExacta) {
                    manejarCrearNuevo();
                  }
                }
              }}
            />
          </div>

          <ul className="max-h-60 overflow-y-auto py-1">
            {itemsFiltrados.map((item) => (
              <li
                key={item.id}
                onClick={() => {
                  onSeleccionar(item.id, item.nombre);
                  setAbierto(false);
                }}
                className={`cursor-pointer px-4 py-2 text-sm text-slate-300 hover:bg-[#16D39A]/10 hover:text-[#16D39A] ${
                  item.id === valorSeleccionado ? "bg-[#16D39A]/10 text-[#16D39A]" : ""
                }`}
              >
                {item.nombre}
              </li>
            ))}

            {busqueda.trim() && !existeCoincidenciaExacta && (
              <li
                onClick={manejarCrearNuevo}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm text-[#16D39A] hover:bg-[#16D39A]/10"
              >
                <Plus className="h-4 w-4" />
                {creando ? "Creando..." : `Crear "${busqueda.trim()}"`}
              </li>
            )}

            {itemsFiltrados.length === 0 && !busqueda.trim() && (
              <li className="px-4 py-3 text-sm text-slate-500 text-center">
                No hay resultados
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
