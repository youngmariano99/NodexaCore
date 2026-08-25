export interface ProductoPublico {
  producto_id: string;
  nombre: string;
  precio: number;
  imagen_url?: string | null;
  categoria?: string | null;
  descripcion?: string | null;
}

export interface ClientePublico {
  cliente_id: string;
  nombre_comercio: string;
  logo_url?: string | null;
  color_primario?: string | null;
  telefono_whatsapp?: string | null;
  configuracion_plantilla?: Record<string, unknown> | null;
}

export interface PlantillaProps {
  cliente: ClientePublico;
  productos: ProductoPublico[];
  totalPaginas?: number;
  paginaActual?: number;
  clienteSlug?: string;
  preview?: boolean;
}

export type NombrePlantilla = "basica" | "la-martina" | "filomena" | string;
