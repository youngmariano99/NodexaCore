# Planificación de Sprints - Nodexa Core

Distribución temporal de Historias de Usuario organizadas en iteraciones de desarrollo.

## 🏃 Sprint 1: Cimientos de Infraestructura y Primer Acceso
- **Objetivo:** Dejar operativo el esqueleto técnico del proyecto (Next.js, Supabase, Vercel, CI/CD y observabilidad) y habilitar el primer flujo de inicio de sesión.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **Inicialización del proyecto Next.js con TypeScript estricto** (5 SP) - Prioridad: Alta
  *Descripción:* Como equipo de desarrollo quiero inicializar el repositorio con Next.js App Router, TypeScript estricto, Tailwind CSS y Shadcn UI para contar con una base de código consistente antes de construir cualquier módulo.
- **Conexión y configuración de Supabase** (3 SP) - Prioridad: Alta
  *Descripción:* Como equipo de desarrollo quiero conectar el proyecto a Supabase (PostgreSQL, Auth, RLS) para disponer de la base de datos y autenticación desde el inicio del desarrollo.
- **Definición de tipos ENUM y migraciones base** (3 SP) - Prioridad: Alta
  *Descripción:* Como equipo de desarrollo quiero definir los tipos ENUM del dominio y la estructura inicial de migraciones para tener un modelo de datos versionado desde el arranque del proyecto.
- **Configuración de despliegue en Vercel** (3 SP) - Prioridad: Alta
  *Descripción:* Como equipo de desarrollo quiero configurar el despliegue automatizado en Vercel para publicar cambios de forma continua en entornos de preview y producción.
- **Integración de Sentry y PostHog** (3 SP) - Prioridad: Media
  *Descripción:* Como equipo de desarrollo quiero integrar Sentry y PostHog en el proyecto para contar con monitoreo técnico y analítica de negocio desde las primeras funcionalidades.
- **Pipeline de CI/CD con validaciones previas al deploy** (5 SP) - Prioridad: Alta
  *Descripción:* Como equipo de desarrollo quiero un pipeline de CI/CD que ejecute linters, chequeo de tipos y pruebas automáticas para evitar que código defectuoso llegue a producción.
- **Inicio de sesión con Supabase Auth** (5 SP) - Prioridad: Alta
  *Descripción:* Como usuario del sistema quiero iniciar sesión con mis credenciales para acceder al panel correspondiente a mi rol y comercio.

---

## 🏃 Sprint 2: Autenticación, Roles y Aislamiento Multi-Tenant
- **Objetivo:** Completar el modelo de seguridad transversal: middleware de sesión, roles de usuario, políticas RLS y defensas contra accesos indebidos.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **Middleware global de validación de sesión JWT** (5 SP) - Prioridad: Alta
  *Descripción:* Como administrador de seguridad quiero que un middleware valide el token JWT en cada solicitud a rutas protegidas para que ninguna vista sensible quede accesible sin sesión vigente.
- **Alta de usuarios con roles diferenciados** (5 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero dar de alta usuarios empleados dentro de mi comercio para delegar el uso del mostrador sin compartir mis propias credenciales.
- **Políticas RLS por cliente_id en todas las tablas de negocio** (8 SP) - Prioridad: Alta
  *Descripción:* Como arquitecto de seguridad quiero aplicar Row Level Security por cliente_id en cada tabla de negocio para garantizar que ningún comercio pueda leer ni modificar datos de otro tenant.
- **Verificación de propiedad de recursos (IDOR/BOLA)** (5 SP) - Prioridad: Alta
  *Descripción:* Como arquitecto de seguridad quiero que cada Server Action valide que el recurso solicitado pertenece al cliente_id del token para evitar accesos indebidos entre comercios.
- **Rate limiting en rutas de autenticación** (3 SP) - Prioridad: Media
  *Descripción:* Como administrador de seguridad quiero limitar la cantidad de intentos de inicio de sesión mediante Upstash Redis para reducir el riesgo de ataques de fuerza bruta.

---

## 🏃 Sprint 3: Onboarding de Comercios y Trazabilidad Base
- **Objetivo:** Habilitar el alta comercial de comercios por el Administrador NODEXA y dejar lista la capa transversal de auditoría y manejo de errores antes de construir funcionalidades de negocio.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **Alta de nuevo comercio por el Administrador NODEXA** (5 SP) - Prioridad: Alta
  *Descripción:* Como administrador NODEXA quiero crear el registro de un nuevo cliente con su cliente_id único para iniciar formalmente el onboarding de un comercio.
- **Activación de módulos contratados en el alta** (3 SP) - Prioridad: Alta
  *Descripción:* Como administrador NODEXA quiero activar los módulos contratados mediante tenant_modules al momento del alta para que el comercio disponga de las funcionalidades pagas desde el primer día.
- **Ampliación del límite de SKU contratado** (3 SP) - Prioridad: Media
  *Descripción:* Como administrador NODEXA quiero modificar el limite_sku de un comercio tras una ampliación confirmada para reflejar el nuevo tope de catálogo acordado.
- **Panel de listado y detalle de comercios** (3 SP) - Prioridad: Media
  *Descripción:* Como administrador NODEXA quiero consultar el listado de comercios dados de alta con su estado_pago y módulos activos para tener visibilidad general de la cartera de clientes.
- **Registro asíncrono de diffs de auditoría** (5 SP) - Prioridad: Alta
  *Descripción:* Como administrador NODEXA quiero que toda alta, modificación o baja crítica quede registrada como diff en background para poder auditar cambios sin afectar el rendimiento de la operación.
- **Mapeo de errores a mensajes normalizados** (5 SP) - Prioridad: Alta
  *Descripción:* Como usuario del sistema quiero ver siempre un mensaje claro y orientado a la solución cuando ocurre un error para entender qué pasó sin ver detalles técnicos.
- **Captura de errores técnicos en Sentry** (3 SP) - Prioridad: Media
  *Descripción:* Como equipo de desarrollo quiero capturar los errores técnicos en Sentry sin exponer datos sensibles para poder diagnosticar problemas rápidamente en producción.

---

## 🏃 Sprint 4: Catálogo de Productos y Base de Stock
- **Objetivo:** Construir el CRUD completo de productos con sus guardrails de límite de SKU e iniciar el control de stock del Core.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **Alta manual de producto** (5 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero cargar manualmente un producto con nombre, precio, categoría e imagen para incorporarlo a mi catálogo interno.
- **Edición de producto existente** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero editar los datos de un producto ya cargado para mantener actualizada la información de precio y stock de referencia.
- **Baja lógica de producto** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero dar de baja un producto sin eliminarlo físicamente para conservar el historial de ventas y auditoría asociado a ese producto.
- **Listado paginado de productos** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero ver mi catálogo en un listado paginado para navegar cómodamente incluso cuando tengo cientos o miles de productos.
- **Aviso discreto al 90% del límite de SKU** (3 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero recibir un aviso discreto en el panel cuando alcance el 90% de mi límite de SKU contratado para anticipar la necesidad de ampliar mi plan.
- **Bloqueo de alta al 100% del límite con oferta de ampliación** (5 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero que se bloquee la creación de nuevos productos al llegar al 100% de mi límite y se me ofrezca un Pack de Catálogo Extendido para poder seguir creciendo sin cargos sorpresa.
- **Registro de entrada de stock** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero registrar una entrada de stock por producto para reflejar mercadería recibida y mantener actualizado el saldo disponible.
- **Registro de salida de stock** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero registrar una salida de stock por producto para reflejar mermas, roturas u otros movimientos que no provienen de una venta.

---

## 🏃 Sprint 5: Carga Masiva, Stock en Tiempo Real y Panel de Ventas
- **Objetivo:** Cerrar las funcionalidades avanzadas de catálogo (Excel, compresión de imágenes), completar el control de stock y comenzar el Panel de Ventas/Mostrador.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **Carga masiva de productos vía Excel** (8 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero importar mi catálogo mediante una plantilla Excel estructurada para dar de alta muchos productos de una sola vez sin cargarlos uno por uno.
- **Compresión automática de imágenes de producto** (5 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero que las imágenes que subo se compriman automáticamente a WebP para que mi catálogo cargue rápido sin tener que preocuparme por el formato del archivo.
- **Visualización de saldo de stock en tiempo real** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero ver el saldo actualizado de stock de cada producto en tiempo real para tomar decisiones de reposición con información confiable.
- **Validación de stock no negativo** (2 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero que el sistema impida dejar el stock en negativo al registrar una salida para evitar inconsistencias en mi inventario.
- **Selección de productos en el mostrador** (5 SP) - Prioridad: Alta
  *Descripción:* Como cajero quiero buscar y seleccionar productos en el panel de ventas para armar el carrito de una venta en curso.
- **Cálculo automático del total de la venta** (3 SP) - Prioridad: Alta
  *Descripción:* Como cajero quiero que el sistema calcule automáticamente el total a cobrar según los productos y cantidades seleccionados para evitar errores manuales de suma.

---

## 🏃 Sprint 6: Cobro en Mostrador, Catálogo Web e Inicio de Carga con IA
- **Objetivo:** Completar el flujo de venta en mostrador, habilitar la vidriera pública del Catálogo Web y comenzar el módulo de Carga con IA.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **Confirmación de cobro con control de duplicados** (5 SP) - Prioridad: Alta
  *Descripción:* Como cajero quiero confirmar el cobro de una venta con protección ante clics repetidos o fallas de red para que nunca se registre la misma venta dos veces.
- **Descuento automático de stock al confirmar venta** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero que al confirmarse una venta se descuente automáticamente el stock de los productos vendidos para no tener que hacerlo manualmente después.
- **Publicación y despublicación de productos** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero publicar o despublicar productos individuales de mi vidriera para controlar qué artículos ve el público en cada momento.
- **Personalización visual de la vidriera** (3 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero personalizar el logo y los colores de mi vidriera dentro de los parámetros del sistema de diseño para reflejar la identidad de mi negocio.
- **Consulta pública del catálogo sin autenticación** (5 SP) - Prioridad: Alta
  *Descripción:* Como cliente final quiero navegar el catálogo publicado de un comercio sin necesidad de crear una cuenta para ver rápidamente los productos disponibles.
- **Enlace directo a WhatsApp desde ficha de producto** (2 SP) - Prioridad: Alta
  *Descripción:* Como cliente final quiero iniciar una consulta por WhatsApp directamente desde la ficha de un producto para pedir información o realizar el pedido sin pasos adicionales.
- **Alta de producto por foto de etiqueta** (8 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero subir una foto de la etiqueta de un producto para que la IA autocomplete nombre, precio y categoría y así agilizar la carga de catálogo.

---

## 🏃 Sprint 7: Cuota de IA, Cuentas Corrientes y Devoluciones
- **Objetivo:** Cerrar el módulo de Carga con IA y entregar de forma completa los módulos de Fiados y Devoluciones con Notas de Crédito.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **Visualización del contador de cargas por IA** (2 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero ver cuántas cargas por IA llevo consumidas sobre mi cuota mensual para planificar cuándo usar esta función.
- **Bloqueo y oferta de recarga al agotar la cuota de IA** (3 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero ser notificado de forma amigable al agotar mi cuota mensual de IA y poder contratar un paquete de recarga para seguir usando la función sin esperar al próximo mes.
- **Registro de cliente final** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero registrar los datos básicos de contacto de mis clientes habituales para poder ofrecerles cuenta corriente.
- **Venta asociada a cuenta corriente** (5 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero asociar una venta a la cuenta corriente de un cliente registrado para que su saldo deudor se actualice automáticamente.
- **Registro de pagos parciales o totales** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero registrar pagos parciales o totales de un cliente para reducir su saldo deudor a medida que va cancelando la cuenta.
- **Consulta de estado de cuenta corriente** (3 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero consultar el estado de cuenta de un cliente con su historial de cargos y pagos para saber cuánto me debe en cualquier momento.
- **Registro de devolución de venta** (5 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero registrar la devolución total o parcial de una venta confirmada para reflejar correctamente los productos que el cliente devolvió.
- **Generación de nota de crédito** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero que se genere automáticamente una nota de crédito al procesar una devolución sin alterar el registro original de la venta.
- **Reintegro automático de stock por devolución** (3 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero que el stock del producto devuelto se reintegre automáticamente para no tener que ajustarlo manualmente después de cada devolución.

---

## 🏃 Sprint 8: Bot de WhatsApp, Facturación y Portabilidad de Datos
- **Objetivo:** Entregar el Bot Estático de WhatsApp, la gestión de morosidad/límites contratados y la exportación de datos del comerciante.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **Configuración de mensajes automáticos del bot** (3 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero configurar respuestas automáticas de horarios, ubicación y catálogo para que mis clientes reciban información básica aunque no pueda atender en el momento.
- **Respuesta automática al cliente final** (5 SP) - Prioridad: Media
  *Descripción:* Como cliente final quiero recibir una respuesta automática al escribir al WhatsApp del comercio para obtener información inmediata sin esperar a que un humano esté disponible.
- **Actualización del estado de pago del comercio** (3 SP) - Prioridad: Alta
  *Descripción:* Como administrador NODEXA quiero actualizar el estado_pago de un comercio según el flujo de morosidad para suspender o reactivar el acceso de forma controlada.
- **Visualización de uso actual frente a límites contratados** (3 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero ver en mi panel el uso actual de SKU y de cuota de IA frente a mis límites contratados para entender mi consumo en todo momento.
- **Actualización de facturación tras ampliación de límites** (3 SP) - Prioridad: Media
  *Descripción:* Como administrador NODEXA quiero que al confirmarse una ampliación de limite_sku o cuota de IA se actualice el próximo período de facturación para mantener el cobro correcto del comercio.
- **Exportación de catálogo en CSV/JSON** (3 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero exportar mi catálogo de productos en formato CSV o JSON para tener un respaldo propio de mi información.
- **Exportación de transacciones en CSV/JSON** (3 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero exportar mis ventas y movimientos en formato CSV o JSON para poder analizarlos con mis propias herramientas.

---

## 🏃 Sprint 9: Endurecimiento de Calidad y Cobertura de Pruebas
- **Objetivo:** Consolidar la pirámide de testing del proyecto asegurando la cobertura mínima del 80% sobre la lógica de negocio ya entregada.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **Pruebas unitarias de cálculos de stock y caja** (5 SP) - Prioridad: Alta
  *Descripción:* Como equipo de desarrollo quiero cubrir con pruebas unitarias los cálculos de stock y de totales de venta para detectar errores de lógica antes de llegar a producción.
- **Pruebas de integración sobre RLS y Server Actions** (5 SP) - Prioridad: Alta
  *Descripción:* Como equipo de desarrollo quiero cubrir con pruebas de integración las políticas RLS y los Server Actions críticos para verificar que el aislamiento multi-tenant funciona correctamente.
- **Pruebas E2E de flujos críticos del usuario** (5 SP) - Prioridad: Alta
  *Descripción:* Como equipo de desarrollo quiero automatizar con Playwright los flujos de onboarding, alta de producto y cobro en mostrador para asegurar que los caminos más importantes nunca se rompan.

---

# 🔍 SPRINTS DE RECUPERACIÓN DE BRECHAS (Auditoría Técnica)
*Estos Sprints tienen como objetivo resolver los pendientes identificados en el [informe_auditoria.md](file:///C:/Users/mari_/.gemini/antigravity-ide/brain/119e040d-7e76-4425-8ebb-397a2a912ed1/informe_auditoria.md) para completar el frontend y las integraciones del backend, sin alterar el alcance original del proyecto.*

---

## 🏃 Sprint 10: Cimientos Visuales, Navegación y CRUD de Catálogo
- **Objetivo:** Construir la infraestructura visual común (Sidebar y Topbar con control de accesos por tenant_modules) y habilitar la gestión manual/masiva de productos en frontend con subida de imágenes.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **UI de Navegación y Sidebar con Control de Módulos (Transversal/Layout)** (8 SP) - Prioridad: Alta
  *Descripción:* Como comerciante/empleado quiero contar con un Sidebar y Topbar que respete el área táctil mínima de 44x44px y la paleta Verde Nodexa, y que oculte o bloquee los menús de módulos no contratados leyendo `tenant_modules` para navegar de forma segura y clara.
  *Referencia:* Vinculado a Sprint 1 y 2 (Cimientos y multi-tenant / SITEMAP layout).
- **UI de Edición y Baja de Producto** (8 SP) - Prioridad: Alta
  *Descripción:* Como comerciante/empleado quiero editar los datos de un producto existente e iniciar su baja lógica desde la interfaz del listado de productos para mantener el catálogo al día.
  *Referencia:* Vinculado a Sprint 4 (Edición y baja lógica de producto).
- **Integración de Compresión y Subida de Imágenes a Cloudinary** (8 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero que el formulario de alta y edición manual permita seleccionar una imagen de producto, la cual debe enviarse al backend, comprimirse a WebP (~70 KB) vía `comprimirImagenProducto` y guardarse en base de datos.
  *Referencia:* Vinculado a Sprint 5 (Compresión de imágenes).
- **UI de Carga Masiva por Excel** (6 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero ingresar a la página de carga masiva, descargar la plantilla de Excel oficial y subir mi catálogo estructurado para procesarlo en lote.
  *Referencia:* Vinculado a Sprint 5 (Carga masiva de productos).

---

## 🏃 Sprint 11: Gestión Visual de Stock, Configuración del Catálogo Web y Bot de WhatsApp
- **Objetivo:** Desarrollar la gestión visual de movimientos de stock y habilitar los paneles de administración del bot y de la vidriera pública para los comerciantes.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **UI de Registro de Movimientos de Stock** (8 SP) - Prioridad: Alta
  *Descripción:* Como comerciante/empleado quiero abrir un formulario o modal desde la sección de stock para registrar entradas (mercadería recibida) o salidas (mermas/roturas) de forma manual.
  *Referencia:* Vinculado a Sprint 4 (Registro de entrada/salida de stock).
- **Suscripción en Tiempo Real para Stock en UI (Realtime)** (6 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero que el stock disponible de los productos se actualice en tiempo real en la pantalla del mostrador y listados mediante suscripciones a Supabase Realtime para evitar vender productos sin stock.
  *Referencia:* Vinculado a Sprint 5 (Stock en tiempo real).
- **UI de Publicación de Vidriera** (8 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero acceder a la configuración del catálogo web para marcar de forma visual (mediante toggles rápidos) qué productos están publicados para exposición pública y cuáles no.
  *Referencia:* Vinculado a Sprint 6 (Publicación y despublicación).
- **UI de Configuración del Bot de WhatsApp** (8 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero configurar las respuestas automáticas del bot de WhatsApp (horarios, ubicación, catálogo) e indicar si se permite derivar la consulta a mi número de teléfono.
  *Referencia:* Vinculado a Sprint 8 (Configuración del bot).

---

## 🏃 Sprint 12: Módulo de Clientes (Fiados), Historial de Ventas y Gestión de Devoluciones
- **Objetivo:** Habilitar la gestión y cobro a clientes registrados (Fiado) y toda la interfaz para consultar ventas y registrar notas de crédito por devoluciones.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **UI de Listado y Registro de Clientes (Fiados)** (8 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero acceder a la sección de clientes para listar a mis clientes registrados, buscar por nombre o teléfono, y registrar clientes nuevos con sus datos de contacto básicos.
  *Referencia:* Vinculado a Sprint 7 (Registro de cliente final).
- **Selector de Clientes en el Mostrador y Pago Integrado** (8 SP) - Prioridad: Alta
  *Descripción:* Como cajero quiero buscar y asociar un cliente registrado a la venta en curso en el mostrador para que el total se cargue automáticamente a su cuenta corriente.
  *Referencia:* Vinculado a Sprint 7 (Venta asociada a cuenta corriente).
- **Registro de Pagos de Cuenta Corriente** (4 SP) - Prioridad: Alta
  *Descripción:* Como comerciante/empleado quiero acceder al estado de cuenta del cliente y pulsar un botón para abrir un formulario que registre pagos parciales o totales de su saldo deudor.
  *Referencia:* Vinculado a Sprint 7 (Registro de pagos parciales/totales).
- **UI de Historial y Detalle de Ventas** (5 SP) - Prioridad: Alta
  *Descripción:* Como comerciante/empleado quiero ver el listado paginado de ventas confirmadas y pulsar sobre una para ver su detalle (productos vendidos, cantidades, total, cliente e idempotency key).
  *Referencia:* Vinculado a Sprint 6 (Confirmación de cobro).
- **UI de Listado y Registro de Devoluciones** (5 SP) - Prioridad: Alta
  *Descripción:* Como comerciante quiero abrir el detalle de una venta e iniciar una devolución (parcial o total), generando la nota de crédito y el reintegro de stock de forma visual.
  *Referencia:* Vinculado a Sprint 7 (Registro de devolución y Nota de Crédito).

---

## 🏃 Sprint 13: Portal de Administración de NODEXA y Cobertura de Pruebas
- **Objetivo:** Entregar las interfaces para el Administrador NODEXA, la autogestión de módulos para el comerciante y asegurar la calidad del frontend mediante pruebas E2E.
- **Duración:** 2 semanas
- **Capacidad:** 30 SP

### Historias asignadas:
- **UI de Alta y Detalle de Comercios para Admin** (6 SP) - Prioridad: Alta
  *Descripción:* Como administrador NODEXA quiero crear comercios nuevos de forma visual en la ruta `/admin/clientes/nuevo` y ver su ficha de detalle (estado de pago, límite SKU, módulos contratados).
  *Referencia:* Vinculado a Sprint 3 (Alta de nuevo comercio).
- **UI de Activación de Módulos (Admin & Comerciante)** (6 SP) - Prioridad: Media
  *Descripción:* Como administrador NODEXA quiero habilitar/deshabilitar módulos a clientes desde su ficha, y como comerciante quiero ver en mi marketplace de módulos cuáles tengo activos y cuáles puedo solicitar.
  *Referencia:* Vinculado a Sprint 3 (Activación de módulos).
- **UI de Reporte de Morosidad y General de Admin** (6 SP) - Prioridad: Media
  *Descripción:* Como administrador NODEXA quiero consultar el panel general administrativo y ver un listado de clientes en mora con su estado de pago, suspendiendo accesos según el SOP de morosidad.
  *Referencia:* Vinculado a Sprint 8 (Actualización del estado de pago del comercio).
- **UI de Datos del Comercio y Centro de Ayuda** (6 SP) - Prioridad: Media
  *Descripción:* Como comerciante quiero configurar los datos básicos de mi comercio en `/configuracion` y ver micro-tips educativos o consultar guías en la sección `/ayuda`.
  *Referencia:* Vinculado a Sprint 8 (Uso actual vs límites).
- **Pruebas de Componentes y E2E de Vistas de Recuperación (Playwright)** (6 SP) - Prioridad: Alta
  *Descripción:* Como equipo de desarrollo quiero escribir pruebas unitarias de componentes y flujos de Playwright para las nuevas vistas creadas, garantizando el 80% de cobertura mínima de calidad.
  *Referencia:* Vinculado a Sprint 9 (Endurecimiento de calidad).


