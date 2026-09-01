"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Layers,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

import { MensajeError } from "@/components/errores/MensajeError";
import { crearCliente } from "@/services/admin/crearCliente";
import {
  ESTADO_CREAR_CLIENTE_INICIAL,
  type ModuloNodexa,
  NOMBRE_MODULO_NODEXA,
  type ModalidadCatalogo,
} from "@/services/admin/tipos";

type TabActivo = "cuenta" | "modulos";

export function FormularioAltaClienteAdmin() {
  const router = useRouter();
  const [tabActivo, setTabActivo] = useState<TabActivo>("cuenta");

  // Tab 1: Datos de Cuenta y Comercio
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [limiteSku, setLimiteSku] = useState("1000");
  const [nombreDueno, setNombreDueno] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Tab 2: Configuración y Módulos
  const [modalidadCatalogo, setModalidadCatalogo] = useState<ModalidadCatalogo>("vidriera");
  const [cuotaMensualIa, setCuotaMensualIa] = useState("40");
  const [colorPrimario, setColorPrimario] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [modulosSeleccionados, setModulosSeleccionados] = useState<Record<ModuloNodexa, boolean>>({
    catalogo_web: false,
    carga_ia: false,
    fiados: false,
    devoluciones: false,
    bot_whatsapp: false,
  });

  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCheckboxChange = (modulo: ModuloNodexa) => {
    setModulosSeleccionados((prev) => ({ ...prev, [modulo]: !prev[modulo] }));
  };

  const validarFormulario = (): boolean => {
    setErrorLocal(null);

    if (!nombre.trim()) {
      setTabActivo("cuenta");
      setErrorLocal("El nombre del comercio es obligatorio.");
      return false;
    }

    if (!slug.trim()) {
      setTabActivo("cuenta");
      setErrorLocal("El slug de la vidriera es obligatorio.");
      return false;
    }

    const regexSlug = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!regexSlug.test(slug.trim().toLowerCase())) {
      setTabActivo("cuenta");
      setErrorLocal("El slug solo puede tener minúsculas, números y guiones medios.");
      return false;
    }

    if (!whatsapp.trim()) {
      setTabActivo("cuenta");
      setErrorLocal("El teléfono de WhatsApp es obligatorio.");
      return false;
    }

    const cantSku = Number(limiteSku);
    if (Number.isNaN(cantSku) || !Number.isInteger(cantSku) || cantSku <= 0) {
      setTabActivo("cuenta");
      setErrorLocal("El límite SKU debe ser un número entero positivo.");
      return false;
    }

    // Validación condicional del usuario dueño: si se ingresa email, se exige nombre y contraseña
    if (email.trim()) {
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regexEmail.test(email.trim())) {
        setTabActivo("cuenta");
        setErrorLocal("Ingresá un email válido para el usuario dueño.");
        return false;
      }

      if (!nombreDueno.trim()) {
        setTabActivo("cuenta");
        setErrorLocal("Si se incluye el email del usuario dueño, el nombre es obligatorio.");
        return false;
      }

      if (!password || password.length < 6) {
        setTabActivo("cuenta");
        setErrorLocal("La contraseña del usuario dueño debe tener al menos 6 caracteres.");
        return false;
      }
    }

    // Validación de cuota IA
    const cantIa = Number(cuotaMensualIa);
    if (Number.isNaN(cantIa) || !Number.isInteger(cantIa) || cantIa < 0) {
      setTabActivo("modulos");
      setErrorLocal("La cuota mensual de IA debe ser un número entero mayor o igual a cero.");
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) {
      return;
    }

    const modulosArray = (Object.keys(modulosSeleccionados) as ModuloNodexa[]).filter(
      (m) => modulosSeleccionados[m]
    );

    startTransition(async () => {
      const formData = new FormData();
      formData.append("nombre_comercio", nombre.trim());
      formData.append("slug", slug.trim().toLowerCase());
      formData.append("telefono_whatsapp", whatsapp.trim());
      formData.append("limite_sku", String(Number(limiteSku)));
      formData.append("modulos", JSON.stringify(modulosArray));

      if (email.trim()) {
        formData.append("email", email.trim().toLowerCase());
        formData.append("nombre_dueno", nombreDueno.trim());
        formData.append("password", password);
      }

      formData.append("modalidad_catalogo", modalidadCatalogo);
      formData.append("cuota_mensual_ia", String(Number(cuotaMensualIa)));

      if (colorPrimario.trim()) {
        formData.append("color_primario", colorPrimario.trim());
      }
      if (logoUrl.trim()) {
        formData.append("logo_url", logoUrl.trim());
      }

      const res = await crearCliente(ESTADO_CREAR_CLIENTE_INICIAL, formData);

      if (res.exito) {
        router.push("/admin/clientes");
        router.refresh();
      } else {
        setErrorLocal(res.error);
      }
    });
  };

  const listadoModulos = Object.keys(NOMBRE_MODULO_NODEXA) as ModuloNodexa[];

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Navegación por pestañas (Tabs) */}
      <div className="flex border-b border-[#222A27] gap-2">
        <button
          type="button"
          onClick={() => setTabActivo("cuenta")}
          className={`flex min-h-11 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            tabActivo === "cuenta"
              ? "border-[#16D39A] text-[#16D39A]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>1. Datos de Cuenta</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActivo("modulos")}
          className={`flex min-h-11 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            tabActivo === "modulos"
              ? "border-[#16D39A] text-[#16D39A]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>2. Configuración y Módulos</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {errorLocal && (
          <MensajeError codigo={errorLocal} className="w-full" />
        )}

        {/* TAB 1: DATOS DE CUENTA */}
        {tabActivo === "cuenta" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-150">
            <div className="rounded-lg border border-[#222A27] bg-[#111615] p-5 flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#16D39A]" />
                Datos del Comercio
              </h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Nombre del Comercio *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={isPending}
                  placeholder="Ej: Tienda de Calzados"
                  className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Slug de la Vidriera *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={isPending}
                    placeholder="Ej: tienda-calzados"
                    className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none font-mono transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    Minúsculas, números y guiones.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Teléfono de WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    disabled={isPending}
                    placeholder="Ej: +5492920000000"
                    className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Límite de SKU Inicial
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={limiteSku}
                  onChange={(e) => setLimiteSku(e.target.value)}
                  disabled={isPending}
                  placeholder="Ej: 1000"
                  className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none font-mono transition-colors"
                />
              </div>
            </div>

            <div className="rounded-lg border border-[#222A27] bg-[#111615] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#16D39A]" />
                  Usuario Administrador (Dueño)
                </h2>
                <span className="text-[11px] text-slate-500 font-normal">Opcional al alta</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Nombre Completo del Dueño
                </label>
                <input
                  type="text"
                  value={nombreDueno}
                  onChange={(e) => setNombreDueno(e.target.value)}
                  disabled={isPending}
                  placeholder="Ej: Juan Pérez"
                  className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Email de Acceso
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    placeholder="Ej: juan@tienda.com"
                    className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Contraseña Inicial
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    placeholder="Mínimo 6 caracteres"
                    className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setTabActivo("modulos")}
                className="flex min-h-11 items-center gap-2 rounded-md bg-[#111615] border border-[#222A27] px-5 text-sm font-semibold text-slate-200 hover:border-[#16D39A] hover:text-[#16D39A] transition-colors"
              >
                <span>Siguiente: Configuración</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURACIÓN Y MÓDULOS */}
        {tabActivo === "modulos" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-150">
            {/* Modalidad del Catálogo Web */}
            <div className="rounded-lg border border-[#222A27] bg-[#111615] p-5 flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#16D39A]" />
                Modalidad del Catálogo Web
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label
                  className={`flex flex-col gap-1 rounded-md border p-3.5 cursor-pointer transition-all ${
                    modalidadCatalogo === "vidriera"
                      ? "border-[#16D39A] bg-[#16D39A]/10 text-slate-50"
                      : "border-[#222A27] bg-[#090B0B] text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="modalidad_catalogo"
                      value="vidriera"
                      checked={modalidadCatalogo === "vidriera"}
                      onChange={() => setModalidadCatalogo("vidriera")}
                      className="text-[#16D39A] focus:ring-[#16D39A]"
                    />
                    <span className="text-sm font-semibold">Solo Vidriera</span>
                  </div>
                  <span className="text-xs text-slate-400 leading-snug">
                    Catálogo público de solo lectura sin carrito.
                  </span>
                </label>

                <label
                  className={`flex flex-col gap-1 rounded-md border p-3.5 cursor-pointer transition-all ${
                    modalidadCatalogo === "pedidos_whatsapp"
                      ? "border-[#16D39A] bg-[#16D39A]/10 text-slate-50"
                      : "border-[#222A27] bg-[#090B0B] text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="modalidad_catalogo"
                      value="pedidos_whatsapp"
                      checked={modalidadCatalogo === "pedidos_whatsapp"}
                      onChange={() => setModalidadCatalogo("pedidos_whatsapp")}
                      className="text-[#16D39A] focus:ring-[#16D39A]"
                    />
                    <span className="text-sm font-semibold">Pedidos WhatsApp</span>
                  </div>
                  <span className="text-xs text-slate-400 leading-snug">
                    Carrito ligero que envía el resumen por enlace wa.me.
                  </span>
                </label>

                <label
                  className={`flex flex-col gap-1 rounded-md border p-3.5 cursor-pointer transition-all ${
                    modalidadCatalogo === "comandas_realtime"
                      ? "border-[#16D39A] bg-[#16D39A]/10 text-slate-50"
                      : "border-[#222A27] bg-[#090B0B] text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="modalidad_catalogo"
                      value="comandas_realtime"
                      checked={modalidadCatalogo === "comandas_realtime"}
                      onChange={() => setModalidadCatalogo("comandas_realtime")}
                      className="text-[#16D39A] focus:ring-[#16D39A]"
                    />
                    <span className="text-sm font-semibold">Comandas Realtime</span>
                  </div>
                  <span className="text-xs text-slate-400 leading-snug">
                    Pedidos web guardados en BD con comandera y repartos.
                  </span>
                </label>
              </div>
            </div>

            {/* Parámetros de IA e Identidad */}
            <div className="rounded-lg border border-[#222A27] bg-[#111615] p-5 flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#16D39A]" />
                Parámetros de IA e Identidad Visual
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Cuota Mensual IA
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={cuotaMensualIa}
                    onChange={(e) => setCuotaMensualIa(e.target.value)}
                    disabled={isPending}
                    placeholder="40"
                    className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none font-mono transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Color Primario (Hex)
                  </label>
                  <input
                    type="text"
                    value={colorPrimario}
                    onChange={(e) => setColorPrimario(e.target.value)}
                    disabled={isPending}
                    placeholder="Ej: #16D39A"
                    className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none font-mono transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Logo URL
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    disabled={isPending}
                    placeholder="https://..."
                    className="min-h-11 rounded-md border border-[#222A27] bg-[#090B0B] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#16D39A] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Módulos Activos */}
            <div className="rounded-lg border border-[#222A27] bg-[#111615] p-5 flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#16D39A]" />
                Módulos Activos Iniciales
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {listadoModulos.map((modulo) => (
                  <label
                    key={modulo}
                    className="flex min-h-11 items-center gap-2.5 text-sm text-slate-200 cursor-pointer select-none rounded-md px-3 border border-[#222A27] bg-[#090B0B] hover:bg-[#1c2421] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={modulosSeleccionados[modulo]}
                      onChange={() => handleCheckboxChange(modulo)}
                      disabled={isPending}
                      className="h-4 w-4 rounded border-[#222A27] bg-[#1c2421] text-[#16D39A] focus:ring-[#16D39A] outline-none"
                    />
                    <span>{NOMBRE_MODULO_NODEXA[modulo]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTabActivo("cuenta")}
                className="flex min-h-11 items-center gap-2 rounded-md bg-[#111615] border border-[#222A27] px-4 text-sm font-semibold text-slate-300 hover:text-slate-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver a Datos de Cuenta</span>
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="flex min-h-11 items-center justify-center rounded-md bg-[#16D39A] px-6 text-sm font-semibold text-slate-950 hover:bg-[#14be8b] transition-colors duration-150 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Crear Comercio y Perfil"
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}


