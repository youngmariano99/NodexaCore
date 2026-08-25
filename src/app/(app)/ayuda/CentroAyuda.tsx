"use client";

import { useState } from "react";
import {
  HelpCircle,
  BookOpen,
  ShoppingBag,
  Sparkles,
  CreditCard,
  RefreshCcw,
  Bot,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import { type ModuloNodexa, NOMBRE_MODULO_NODEXA } from "@/services/admin/tipos";

interface CentroAyudaProps {
  modulosContratados: Record<ModuloNodexa, boolean>;
}

interface PreguntaFrecuente {
  id: string;
  pregunta: string;
  respuesta: string;
  modulo?: ModuloNodexa;
}

export function CentroAyuda({ modulosContratados }: CentroAyudaProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const FAQS: PreguntaFrecuente[] = [
    {
      id: "general-1",
      pregunta: "¿Cómo agrego un producto al mostrador?",
      respuesta:
        "Buscá el producto en la barra superior del Mostrador escribiendo parte de su nombre o escaneando su SKU. Luego, hacé clic en el botón '+' para agregarlo al carrito de la venta activa.",
    },
    {
      id: "general-2",
      pregunta: "¿Qué es la clave de idempotencia al confirmar un cobro?",
      respuesta:
        "Es un mecanismo de seguridad técnica que previene que un cobro se registre doble si hacés doble clic o si la red falla momentáneamente. El sistema garantiza que cada transacción se guarde exactamente una sola vez.",
    },
    {
      id: "general-3",
      pregunta: "¿Qué sucede al alcanzar el límite de SKUs de mi catálogo?",
      respuesta:
        "Nodexa te notificará discretamente en tu panel principal cuando alcances el 90% del límite de productos contratados. Al llegar al 100%, se bloqueará la creación de nuevos productos (arrojando el aviso NX-PRD-001) hasta que solicites una ampliación o limpies productos inactivos.",
    },
    {
      id: "general-4",
      pregunta: "¿Cómo elimino un producto de forma segura sin perder historial?",
      respuesta:
        "En el catálogo de productos de Nodexa, la eliminación es de tipo lógico (soft-delete). El producto dejará de ser visible para nuevas ventas pero el historial de transacciones pasadas y auditoría de diffs permanecerán intactos.",
    },
    {
      id: "catalogo-1",
      pregunta: "¿Cómo comparto mi catálogo web con los clientes?",
      modulo: "catalogo_web",
      respuesta:
        "Tus clientes pueden entrar usando tu enlace personalizado (vidriera). Podés copiar la dirección web del catálogo directamente desde la sección 'Catálogo Web' y enviarla por WhatsApp o agregarla a la biografía de tus redes sociales.",
    },
    {
      id: "catalogo-2",
      pregunta: "¿Cómo personalizo los colores y logo de mi Catálogo Web?",
      modulo: "catalogo_web",
      respuesta:
        "Dirigite a la sección 'Catálogo Web' -> 'Personalización'. Desde allí vas a poder subir el logo de tu comercio y seleccionar una de las paletas cromáticas preestablecidas para que combine con la identidad visual de tu marca.",
    },
    {
      id: "catalogo-3",
      pregunta: "¿Cómo decido qué productos se muestran en la vidriera pública?",
      modulo: "catalogo_web",
      respuesta:
        "Cada producto en tu catálogo posee un selector de visibilidad web (Publicado). Podés activar o desactivar este interruptor individualmente en el catálogo o ficha del producto para decidir al instante qué artículos se exponen al público.",
    },
    {
      id: "carga-ia-1",
      pregunta: "¿Qué imágenes puedo subir para la Carga con IA?",
      modulo: "carga_ia",
      respuesta:
        "Para obtener el mejor resultado, subí o capturá fotos nítidas y bien iluminadas de las etiquetas de los productos. La IA de Nodexa leerá automáticamente el nombre, el SKU/código y sugerirá el precio sugerido.",
    },
    {
      id: "carga-ia-2",
      pregunta: "¿Cuántas consultas mensuales de IA tengo disponibles?",
      modulo: "carga_ia",
      respuesta:
        "Cada comercio cuenta con un cupo base de 40 consultas mensuales. Podés ver tus cargas consumidas en tiempo real desde la sección 'Carga con IA'. Si se agotan, el sistema arrojará la alerta NX-IA-001 sugiriendo recargar tu pack de consultas.",
    },
    {
      id: "fiados-1",
      pregunta: "¿Cómo registro un cobro a cuenta corriente?",
      modulo: "fiados",
      respuesta:
        "Andá a la sección 'Clientes y Fiados', seleccioná la ficha del cliente correspondiente y hacé clic en 'Registrar Pago'. Ingresá el monto cobrado y el saldo deudor se actualizará automáticamente en tiempo real.",
    },
    {
      id: "fiados-2",
      pregunta: "¿Cómo asocio una venta en el mostrador a un cliente para fiarle?",
      modulo: "fiados",
      respuesta:
        "En el Mostrador, verás un selector de 'Cliente (Cuenta Corriente)'. Buscá e indicá el cliente antes de presionar 'Confirmar cobro'. De esta forma, el total de la compra no se cobrará en efectivo, sino que se acumulará como saldo deudor en su cuenta corriente.",
    },
    {
      id: "fiados-3",
      pregunta: "¿Qué pasa si un cliente quiere pagar solo una parte de su saldo deudor?",
      modulo: "fiados",
      respuesta:
        "El sistema admite pagos parciales. Al registrar el pago desde la ficha del cliente, ingresá el monto exacto entregado. El sistema calculará el saldo deudor restante y actualizará su estado al instante.",
    },
    {
      id: "devoluciones-1",
      pregunta: "¿Cómo registro una devolución total o parcial?",
      modulo: "devoluciones",
      respuesta:
        "Ingresá a la sección 'Devoluciones' -> 'Registrar Devolución'. Buscá el ID de la venta original, seleccioná los artículos devueltos y su cantidad correspondientes, y confirmá la operación. Esto reintegrará el stock y creará un comprobante único de Nota de Crédito.",
    },
    {
      id: "devoluciones-2",
      pregunta: "¿Cuándo se genera una Nota de Crédito?",
      modulo: "devoluciones",
      respuesta:
        "La Nota de Crédito se genera automáticamente en el momento en que confirmás una devolución. Este saldo a favor queda registrado bajo un comprobante único (NC-...) que sirve como respaldo para futuras compras de ese cliente.",
    },
    {
      id: "bot-1",
      pregunta: "¿Cómo responde el Bot de WhatsApp?",
      modulo: "bot_whatsapp",
      respuesta:
        "El bot responde de forma automatizada consultando el inventario actual. Cuando un cliente le escribe para preguntar precio o disponibilidad, el bot lee la base de datos del comercio al instante y devuelve la respuesta correcta.",
    },
    {
      id: "bot-2",
      pregunta: "¿Cómo configuro las respuestas estáticas del bot?",
      modulo: "bot_whatsapp",
      respuesta:
        "Accedé a 'Configuración' -> 'Bot de WhatsApp'. Podés activar el funcionamiento del bot y definir mensajes estáticos personalizados (como horarios de atención, dirección física o mensaje de bienvenida de tu catálogo).",
    },
  ];

  const MICRO_TIPS: {
    modulo: ModuloNodexa;
    titulo: string;
    descripcion: string;
    icono: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      modulo: "catalogo_web",
      titulo: "Impulsá tus ventas compartiendo tu vidriera",
      descripcion: "¡Tu Catálogo Web está activo! Compartí el enlace a tus clientes frecuentes para que hagan pedidos digitales sin ocupar tu tiempo de atención presencial.",
      icono: ShoppingBag,
    },
    {
      modulo: "carga_ia",
      titulo: "Optimizá el escaneo de etiquetas",
      descripcion: "Cuando uses Carga con IA, asegurate de enfocar bien el código de barras y que no haya sombras reflectantes. Así la IA detectará el producto en un 99% de los casos.",
      icono: Sparkles,
    },
    {
      modulo: "fiados",
      titulo: "Establecé límites de fiado preventivos",
      descripcion: "Llevá cuentas claras. Evitá morosidad definiendo límites de crédito individuales al dar de alta o editar un cliente en la sección de Fiados.",
      icono: CreditCard,
    },
    {
      modulo: "devoluciones",
      titulo: "Trazabilidad completa de mercadería",
      descripcion: "Al registrar una devolución, siempre seleccioná el motivo correcto (ej. fallado, cambio). Esto mantendrá las estadísticas y los motivos transparentes para tus reportes.",
      icono: RefreshCcw,
    },
    {
      modulo: "bot_whatsapp",
      titulo: "Respuestas automáticas 24/7",
      descripcion: "Tu Bot de WhatsApp está activo respondiendo preguntas de tus clientes. Asegurá la veracidad de la información manteniendo los stocks y precios del mostrador siempre al día.",
      icono: Bot,
    },
  ];

  // Filtrar microtips en base a los módulos contratados y activos
  const tipsActivos = MICRO_TIPS.filter((tip) => modulosContratados[tip.modulo]);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Sección Principal de FAQs */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-slate-300">
          <BookOpen className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-100">Preguntas Frecuentes</h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq) => {
            // Si la FAQ pertenece a un módulo y no está contratado, la ocultamos
            if (faq.modulo && !modulosContratados[faq.modulo]) {
              return null;
            }

            const isOpen = openFaqId === faq.id;

            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-lg border border-[#222A27] bg-[#0D1110]/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-slate-200 hover:bg-[#0D1110]/60 transition-colors"
                >
                  <span className="text-sm">{faq.pregunta}</span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-[#222A27] bg-[#0D1110]/10 px-5 py-4 text-sm text-slate-400 leading-relaxed">
                    {faq.respuesta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Panel Lateral: Micro-Tips Educativos */}
      <aside className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-slate-300">
          <HelpCircle className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-100">Tips del Comercio</h2>
        </div>

        {tipsActivos.length === 0 ? (
          <div className="rounded-lg border border-[#222A27] bg-[#0D1110]/30 p-5 text-center text-xs text-slate-500">
            Los consejos personalizados aparecerán aquí a medida que habilites módulos en tu comercio.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tipsActivos.map((tip) => {
              const IconComponent = tip.icono;
              return (
                <article
                  key={tip.modulo}
                  className="flex flex-col gap-3 rounded-lg border border-emerald-500/20 bg-emerald-950/5 p-5 shadow-sm"
                >
                  <header className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                      {NOMBRE_MODULO_NODEXA[tip.modulo]}
                    </h3>
                  </header>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-semibold text-slate-100">{tip.titulo}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{tip.descripcion}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}
