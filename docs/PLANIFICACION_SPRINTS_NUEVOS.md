# Planificación de Sprints Correctivos y de Extensión — Nodexa Core

Este documento define la planificación detallada de los nuevos sprints (Sprint 14 al 18) orientados a optimizar la experiencia de usuario (UX/UI), enriquecer el catálogo con variantes y atributos inline, introducir el módulo de proveedores con cálculo automático del Punto de Pedido, e implementar el sistema de plantillas personalizables para el Catálogo Web con Live Preview y el sistema de pedidos modular (Básico, Moderado, Premium y Premium+).

---

## Sprint 14: Gestión Inteligente de Atributos, Variantes Masivas y UX Educativa

### Objetivo del Sprint
Implementar el alta de marcas y categorías inline dentro del formulario de productos, rediseñar el alta a un formato Wizard multi-paso para la generación masiva de variantes (matrices de talle/color), definir límites de marcas para el Core, condicionar el cargador de imágenes al módulo de catálogo activo, y agregar guías de ayuda contextuales no invasivas.

* **Duración:** 2 semanas
* **Capacidad estimada:** 20 puntos de historia

---

### Historias de Usuario e Implementación Técnica

#### 1. Creación Inline de Atributos y Control de Límites (Marcas y Categorías)
* **Épica asociada:** Épica 4: Gestión de Catálogo de Productos (Core)
* **Prioridad:** Alta | **Estimación:** 5 Ptos
* **Descripción:** Como comerciante, quiero crear marcas y categorías directamente desde el formulario de producto sin perder el progreso de los datos ya completados, y que se valide el límite base de marcas (máximo 50) para controlar el consumo de mi plan.

##### Actividad 1.1: Esquema de base de datos para Marcas y Categorías
* **Rol:** BD
* **Componente:** Tablas de marcas y categorías
* **Ruta:** `supabase/migrations/20260824000000_crear_marcas_y_categorias.sql`
* **Módulo:** Catálogo (Core)
* **Etiquetas:** `postgresql`, `supabase`, `migrations`
* **Pasos de implementación:**
  1. Crear la tabla `marcas` con los campos: `marca_id` (UUID, PK), `nombre` (TEXT), `cliente_id` (UUID, FK a clientes), y `eliminado_en` (TIMESTAMP).
  2. Crear la tabla `categorias` con la misma estructura y soporte para baja lógica.
  3. Habilitar Row Level Security (RLS) en ambas tablas limitando el acceso por `cliente_id` del usuario logueado.
  4. Agregar índices de búsqueda en los campos de nombre y tenant para optimizar consultas.
* **Criterios de Aceptación:**
  * Ningún comercio puede leer ni escribir marcas/categorías de otro tenant.
  * La eliminación física de categorías y marcas está prohibida; se realiza de forma lógica vía `eliminado_en`.

##### Actividad 1.2: Repositorios y Validación de Límite de Marcas
* **Rol:** Backend
* **Componente:** `MarcasRepository` / `CrearMarca`
* **Ruta:** `src/repositories/marcasRepository.ts` / `src/services/productos/crearMarca.ts`
* **Módulo:** Catálogo (Core)
* **Etiquetas:** `typescript`, `zod`, `repository`
* **Pasos de implementación:**
  1. Crear el repositorio `MarcasRepository` desacoplando las llamadas a Supabase.
  2. Implementar servicio `crearMarca` que verifique si el comercio ya alcanzó el límite contratado de marcas (50 marcas base).
  3. Devolver el error normalizado `NX-BRD-001` si se intenta exceder el límite.
  4. Registrar la creación en la tabla `auditoria_diffs`.
* **Criterios de Aceptación:**
  * Debe lanzar el error `NX-BRD-001` al intentar superar las 50 marcas activas en el comercio.
  * Debe incluir pruebas unitarias con Vitest validando el bloqueo de límite.

##### Actividad 1.3: Modal Creador Inline para Formularios
* **Rol:** Frontend
* **Componente:** `ModalCreadorAtributo`
* **Ruta:** `src/components/productos/ModalCreadorAtributo.tsx`
* **Módulo:** Catálogo (Core)
* **Etiquetas:** `react`, `tailwind`, `zod`
* **Pasos de implementación:**
  1. Diseñar el modal interactivo con estética Nodexa (fondo esmeralda sutil, inputs oscuros).
  2. Integrar con React Hook Form utilizando validación en puerta mediante Zod.
  3. Mostrar advertencia amigable si el servicio retorna el error `NX-BRD-001`.
  4. Actualizar la selección (dropdown) del formulario padre con el elemento recién creado sin alterar el resto de inputs.
* **Criterios de Aceptación:**
  * Debe permitir agregar marcas y categorías nuevas en menos de 2 clics.
  * No debe limpiar ni alterar los campos del formulario padre ya completados.

---

#### 2. Alta de Producto Wizard con Matriz de Variantes Masiva
* **Épica asociada:** Épica 4: Gestión de Catálogo de Productos (Core)
* **Prioridad:** Alta | **Estimación:** 8 Ptos
* **Descripción:** Como comerciante, quiero registrar productos configurando múltiples variables (talles, colores) y generar de manera masiva la matriz de stock para optimizar la carga del inventario.

##### Actividad 2.1: Wizard Multi-paso para Creación de Productos
* **Rol:** Frontend
* **Componente:** `FormularioAltaProductoWizard`
* **Ruta:** `src/app/(app)/productos/nuevo/FormularioAltaProductoWizard.tsx`
* **Módulo:** Catálogo (Core)
* **Etiquetas:** `nextjs`, `react`, `lucide-react`
* **Pasos de implementación:**
  1. Diseñar el Wizard interactivo dividido en tres pantallas:
     * **Paso 1: Datos Generales** (nombre, descripción, tags de categorías/marcas inline. Condicionar la visualización de la carga de imágenes a que el tenant tenga activo el módulo `catalogo_web` para evitar consumo de recursos).
     * **Paso 2: Dimensiones** (agregar dimensiones como 'Talle', 'Color' con valores en pills).
     * **Paso 3: Matriz de Stock** (tabla dinámica para ingresar SKU y stock por variante de forma ágil).
  2. Implementar un banner de consejos en la parte superior derecha de cada paso con un switch global para apagar/encender la ayuda contextual.
* **Criterios de Aceptación:**
  * Cada paso debe validarse localmente mediante esquemas Zod (Fail-Fast) antes de avanzar.
  * El cargador de fotos debe estar completamente oculto si `catalogo_web` está inactivo.
  * El switch global de ayuda debe persistir la preferencia en `localStorage`.

##### Actividad 2.2: Generación Dinámica de Matriz de Combinaciones
* **Rol:** Backend
* **Componente:** `generarMatrizCombinaciones`
* **Ruta:** `src/lib/dominio/productos/generarMatrizCombinaciones.ts`
* **Módulo:** Catálogo (Core)
* **Etiquetas:** `typescript`, `logic`
* **Pasos de implementación:**
  1. Desarrollar el algoritmo que realice el producto cartesiano de los valores cargados en el paso 2 del Wizard.
  2. Generar el listado dinámico mapeado a inputs individuales de stock y precio por cada variante.
  3. Persistir en la tabla `productos` la relación jerárquica padre-hijo (usando una columna `producto_padre_id`).
* **Criterios de Aceptación:**
  * El usuario puede definir un stock inicial base (ej: 10 unidades) y rellenar automáticamente la matriz entera con un solo clic.

---

## Sprint 15: Módulo de Proveedores, Reposición Automatizada y Edición Masiva de Precios

### Objetivo del Sprint
Introducir la entidad proveedores (integrante del Core) para asociar stock mínimo de reposición, validar el límite máximo de 20 proveedores, implementar edición masiva de precios en lote por atributos de Core y automatizar la alerta del Punto de Pedido.

* **Duración:** 2 semanas
* **Capacidad estimada:** 20 puntos de historia

---

### Historias de Usuario e Implementación Técnica

#### 1. Proveedores y Alertas de Abastecimiento (Módulo integrado en Core)
* **Épica asociada:** Épica 5: Control de Stock
* **Prioridad:** Alta | **Estimación:** 5 Ptos
* **Descripción:** Como comerciante, quiero registrar mis proveedores con su tiempo promedio de entrega (validando el tope de 20 proveedores base) para asociarlos a mis productos y saber cuándo reponer mercadería.

##### Actividad 1.1: Esquema de Base de Datos para Proveedores
* **Rol:** BD
* **Componente:** Tabla proveedores y llaves foráneas
* **Ruta:** `supabase/migrations/20260824010000_crear_proveedores.sql`
* **Módulo:** Stock (Core)
* **Etiquetas:** `postgresql`, `supabase`, `rls`
* **Pasos de implementación:**
  1. Crear la tabla `proveedores` con: `proveedor_id` (PK), `nombre` (TEXT), `contacto` (TEXT), `dias_demora` (INT), `cliente_id` (FK), y `eliminado_en` (TIMESTAMP).
  2. Modificar la tabla `productos` agregando la columna opcional `proveedor_id` (FK) y `stock_minimo` (INT).
  3. Establecer políticas RLS en ambas tablas por `cliente_id`.
* **Criterios de Aceptación:**
  * El campo `dias_demora` debe validarse en la inserción para que sea un número entero no negativo.

##### Actividad 1.2: Repositorio y Servicio de Creación con Límite de Proveedores
* **Rol:** Backend
* **Componente:** `ProveedoresRepository` / `CrearProveedor`
* **Ruta:** `src/repositories/proveedoresRepository.ts` / `src/services/stock/crearProveedor.ts`
* **Módulo:** Stock (Core)
* **Etiquetas:** `typescript`, `zod`, `repository`
* **Pasos de implementación:**
  1. Crear la interfaz y repositorio de acceso a proveedores.
  2. Validar que la cantidad de proveedores activos en el comercio sea estrictamente menor a 20.
  3. Si se excede, rechazar la operación con el código de error `NX-PROV-001`.
  4. Registrar en la auditoría de diffs.
* **Criterios de Aceptación:**
  * Las pruebas unitarias con Vitest deben validar el bloqueo al intentar registrar el proveedor número 21.

##### Actividad 1.3: Vista y CRUD de Proveedores
* **Rol:** Frontend
* **Componente:** `FormularioProveedores`
* **Ruta:** `src/app/(app)/proveedores/FormularioProveedores.tsx`
* **Módulo:** Stock (Core)
* **Etiquetas:** `react`, `tailwind`, `typescript`
* **Pasos de implementación:**
  1. Diseñar el panel de administración de proveedores, mostrando su información de contacto y tiempo estimado de entrega.
  2. Mostrar alerta amigable al recibir el error de límite `NX-PROV-001`.
* **Criterios de Aceptación:**
  * Debe acoplarse estéticamente al sidebar de Nodexa y respetar el área táctil mínima de 44x44px.

---

#### 2. Cálculo Dinámico de Punto de Pedido y Alertas
* **Épica asociada:** Épica 5: Control de Stock
* **Prioridad:** Alta | **Estimación:** 8 Ptos
* **Descripción:** Como comerciante, quiero que el sistema calcule el punto de pedido automático basado en el consumo diario de ventas para recibir alertas de reposición sin ingresar datos manuales complejos.

##### Actividad 2.1: Cálculo del Consumo Diario de Ventas
* **Rol:** Backend
* **Componente:** `calcularConsumoDiario`
* **Ruta:** `src/services/stock/calcularConsumoDiario.ts`
* **Módulo:** Stock (Core)
* **Etiquetas:** `postgresql`, `analytics`
* **Pasos de implementación:**
  1. Desarrollar una consulta SQL que analice las ventas históricas de los últimos 30 días para determinar el promedio diario de consumo por producto.
  2. Aplicar la fórmula: `Punto de Pedido = Stock Mínimo (seguridad) + (Consumo Diario * Días de Demora del Proveedor)`.
  3. Disparar una alerta en pantalla (tag esmeralda/amarillo) si el `stock_actual` del producto es menor o igual al Punto de Pedido calculated.
* **Criterios de Aceptación:**
  * La fórmula debe re-calcularse de forma asíncrona cada vez que se concreta una venta, actualizando la columna `punto_pedido` en la tabla `productos`.

---

#### 3. Editor Masivo de Precios en Lote
* **Épica asociada:** Épica 4: Gestión de Catálogo de Productos (Core)
* **Prioridad:** Media | **Estimación:** 5 Ptos
* **Descripción:** Como comerciante, quiero cambiar los precios de mis productos en lote filtrando por categoría, marca o proveedor para ajustar valores rápidamente ante inflación o cambios del mercado.

##### Actividad 3.1: Server Action para Edición Masiva de Precios
* **Rol:** Backend
* **Componente:** `actualizarPreciosLote`
* **Ruta:** `src/services/productos/actualizarPreciosLote.ts`
* **Módulo:** Catálogo (Core)
* **Etiquetas:** `nextjs`, `supabase`, `transactions`
* **Pasos de implementación:**
  1. Implementar un Server Action que reciba el filtro (ej. ID de marca), el operador (aumento/descuento por porcentaje o monto fijo) y el valor numérico.
  2. Ejecutar una actualización atómica en la tabla `productos` bajo una transacción SQL.
  3. Registrar la auditoría asíncrona detallando el cambio porcentual realizado.
* **Criterios de Aceptación:**
  * La query de actualización masiva debe comprobar estrictamente el aislamiento por `cliente_id` (tenant actual).

##### Actividad 3.2: Panel de Edición Masiva de Precios
* **Rol:** Frontend
* **Componente:** `EditorPreciosMasivos`
* **Ruta:** `src/app/(app)/productos/precios-lote/EditorPreciosMasivos.tsx`
* **Módulo:** Catálogo (Core)
* **Etiquetas:** `react`, `tailwind`
* **Pasos de implementación:**
  1. Diseñar el panel interactivo con un dropdown de marcas, categorías y proveedores.
  2. Añadir confirmación en pantalla mostrando un indicador del total de productos que se verán afectados por el ajuste de precio.
* **Criterios de Aceptación:**
  * Debe incluir una advertencia de confirmación doble antes de ejecutar la acción.

---

## Sprint 16: Motor de Plantillas Personalizables, Live Preview y Configuración Catálogo Web

### Objetivo del Sprint
Implementar la resolución dinámica de plantillas multi-tenant mediante middleware de subdominios, persistir diseños en JSONB de PostgreSQL, aplicar Code Splitting por template vía `next/dynamic` y desarrollar el editor interactivo de personalización visual en tiempo real.

* **Duración:** 2 semanas
* **Capacidad estimada:** 20 puntos de historia

---

### Historias de Usuario e Implementación Técnica

#### 1. Ruteo Dinámico y Code Splitting de Plantillas
* **Épica asociada:** Épica 7: Módulo Catálogo Web (Vidriera y Pedido por WhatsApp)
* **Prioridad:** Alta | **Estimación:** 8 Ptos
* **Descripción:** Como visitante público, quiero acceder a la vidriera del comercio mediante su subdominio propio de forma veloz para consultar sus productos descargando en mi navegador únicamente los componentes del diseño que el comercio configuró.

##### Actividad 1.1: Middleware de Resolución de Tenant por Host
* **Rol:** Backend
* **Componente:** Middleware de rutas dinámicas
* **Ruta:** `src/middleware.ts`
* **Módulo:** Catálogo Web
* **Etiquetas:** `nextjs`, `routing`, `middleware`
* **Pasos de implementación:**
  1. Modificar el middleware de Next.js para interceptar el header `host` (ej: `despensacarlitos.vercel.app`).
  2. Si es una petición pública del catálogo, reescribir internamente la ruta hacia `/c/[subdominio]`.
  3. Validar y autorizar que el subdominio corresponda a un cliente activo en base de datos.
* **Criterios de Aceptación:**
  * La URL en el navegador debe permanecer inalterada para el cliente final.

##### Actividad 1.2: Code Splitting e Importaciones Dinámicas (next/dynamic)
* **Rol:** Frontend
* **Componente:** Ruteador y selector de plantillas públicas
* **Ruta:** `src/plantillas/SelectorPlantillas.tsx`
* **Módulo:** Catálogo Web
* **Etiquetas:** `react`, `code-splitting`, `dynamic-imports`
* **Pasos de implementación:**
  1. Declarar los imports dinámicos de cada plantilla (`basica`, `la-martina`, `filomena`) usando la función `dynamic` de Next.js.
  2. Implementar selector basado en la columna `clientes.plantilla_activa` para cargar solo el bundle JavaScript del diseño asignado al comercio en tiempo de ejecución.
* **Criterios de Aceptación:**
  * El bundle descargado por el cliente final no debe contener código de las plantillas inactivas.

---

#### 2. Editor Visual Modular en Pantalla Dividida (Live Preview)
* **Épica asociada:** Épica 7: Módulo Catálogo Web (Vidriera y Pedido por WhatsApp)
* **Prioridad:** Alta | **Estimación:** 8 Ptos
* **Descripción:** Como comerciante, quiero personalizar el diseño de mi vidriera (banners, textos y plantillas) mediante un editor interactivo y ver los cambios reflejados al instante en un simulador integrado.

##### Actividad 2.1: Soporte JSONB de Configuración de Plantilla
* **Rol:** BD
* **Componente:** Columna `configuracion_plantilla` en base de datos
* **Ruta:** `supabase/migrations/20260824020000_configuracion_plantilla_jsonb.sql`
* **Módulo:** Catálogo Web
* **Etiquetas:** `postgresql`, `supabase`, `jsonb`
* **Pasos de implementación:**
  1. Agregar la columna `configuracion_plantilla` de tipo JSONB en la tabla `marcas` o configuración del comercio.
  2. Implementar restricciones básicas para validar la integridad del JSON de acuerdo a la plantilla activa (esquema flexible).
* **Criterios de Aceptación:**
  * Admite almacenamiento dinámico de datos de secciones sin modificar el esquema físico de las tablas.

##### Actividad 2.2: Editor Split-Screen con sincronización por postMessage
* **Rol:** Frontend
* **Componente:** `EditorPersonalizacionDiseno`
* **Ruta:** `src/app/(app)/catalogo-web/personalizar/EditorPersonalizacionDiseno.tsx`
* **Módulo:** Catálogo Web
* **Etiquetas:** `react`, `iframe`, `postmessage`
* **Pasos de implementación:**
  1. Crear la vista interactiva con un panel lateral izquierdo de edición de contenidos (Hero Banners, textos, selección de plantilla) y un panel derecho que renderice un `<iframe>` de la vidriera pública del comercio con el parámetro query `?preview=true`.
  2. Configurar la API del navegador `postMessage` para transmitir eventos `UPDATE_PREVIEW` con latencia cero del formulario hacia el iframe.
  3. Habilitar opciones de catálogo para ocultar/mostrar precios y control selectivo de visibilidad pública de productos.
* **Criterios de Aceptación:**
  * El simulador en vivo de la derecha debe actualizar su visual inmediatamente sin recargar el iframe entero.

---

## Sprint 17: Catálogo Web Dinámico con Pedidos a WhatsApp (Planes Básico y Moderado)

### Objetivo del Sprint
Habilitar la landing de pedidos con carrito optimizado sin registro (guardado en caché/localStorage), reglas dinámicas de envío, descuentos por método de pago, envío estructurado de comandas a WhatsApp y soporte PWA.

* **Duración:** 2 semanas
* **Capacidad estimada:** 20 puntos de historia

---

### Historias de Usuario e Implementación Técnica

#### 1. Landing de Pedidos sin Fricción (PWA)
* **Épica asociada:** Épica 7: Módulo Catálogo Web (Vidriera y Pedido por WhatsApp)
* **Prioridad:** Alta | **Estimación:** 8 Ptos
* **Descripción:** Como cliente final, quiero navegar por el catálogo en mi celular e instalarlo como una PWA para realizar pedidos de forma rápida y sencilla sin necesidad de registrarme.

##### Actividad 1.1: Soporte PWA e Instalación Local
* **Rol:** Frontend
* **Componente:** Manifiesto PWA y Service Workers
* **Ruta:** `public/manifest.json` / `src/app/sw.ts`
* **Módulo:** Catálogo Web
* **Etiquetas:** `pwa`, `service-worker`, `nextjs`
* **Pasos de implementación:**
  1. Crear el archivo `manifest.json` configurando colores de tema de Nodexa y el ícono del comercio.
  2. Registrar el service worker en Next.js para permitir el almacenamiento en caché offline y habilitar el banner discreto de instalación local.
* **Criterios de Aceptación:**
  * La aplicación debe pasar las validaciones de Lighthouse para PWAs.

##### Actividad 1.2: Checkout de Pedidos con Datos Persistidos en LocalStorage
* **Rol:** Frontend
* **Componente:** `CheckoutPedidoForm`
* **Ruta:** `src/components/catalogo-web/CheckoutPedidoForm.tsx`
* **Módulo:** Catálogo Web
* **Etiquetas:** `react`, `localstorage`, `zod`
* **Pasos de implementación:**
  1. Diseñar el formulario de checkout que solicite: Nombre, Teléfono, Dirección de Envío y Método de Pago.
  2. Implementar un hook personalizado `usePersistedForm` para guardar los datos ingresados en `localStorage` inmediatamente tras escribirlos.
  3. Pre-cargar los datos del formulario automáticamente en la próxima visita del cliente.
* **Criterios de Aceptación:**
  * Al realizar una segunda compra, el cliente no debe tener que re-escribir sus datos de envío.

---

#### 2. Configuración de Envío, Descuentos y Cierre en WhatsApp
* **Épica asociada:** Épica 7: Módulo Catálogo Web (Vidriera y Pedido por WhatsApp)
* **Prioridad:** Alta | **Estimación:** 7 Ptos
* **Descripción:** Como comerciante, quiero definir costos de envío y descuentos automáticos por método de pago para que el carrito envíe el total exacto de la orden a mi WhatsApp de soporte.

##### Actividad 2.1: Lógica de Negocio en Frontend para Descuentos y Métodos de Pago
* **Rol:** Frontend
* **Componente:** `useCarritoCatalogo`
* **Ruta:** `src/hooks/useCarritoCatalogo.ts`
* **Módulo:** Catálogo Web
* **Etiquetas:** `typescript`, `cart`, `logic`
* **Pasos de implementación:**
  1. Desarrollar la lógica de cálculo del total del carrito sumando el costo de envío configurado según la zona de entrega elegida.
  2. Aplicar descuentos (ej. 10% de descuento en efectivo) o recargos (ej. 5% con tarjeta) de forma dinámica sobre el subtotal.
  3. Generar la plantilla de mensaje de texto formateada para enviar por la API pública de WhatsApp al teléfono del comercio con el detalle completo del pedido.
* **Criterios de Aceptación:**
  * El mensaje de WhatsApp debe contener: Nombre de Cliente, Productos solicitados, método de pago, opción de retiro/envío y el total detallado.

##### Actividad 2.2: Configuración Administrativa de Horarios y Pedidos
* **Rol:** Frontend
* **Componente:** `FormularioConfiguracionCatalogo`
* **Ruta:** `src/app/(app)/catalogo-web/personalizacion/FormularioConfiguracionCatalogo.tsx`
* **Módulo:** Catálogo Web
* **Etiquetas:** `react`, `tailwind`, `zod`
* **Pasos de implementación:**
  1. Diseñar formularios para configurar:
     * Horarios de apertura y cierre (con switch de desactivación automática de pedidos fuera de hora).
     * Banners flotantes de ofertas y comunicados.
     * Lista de costos de envío por zonas/barrios.
* **Criterios de Aceptación:**
  * Fuera del horario de atención, el botón "Confirmar Pedido" del catálogo web debe reemplazarse por un mensaje indicando el horario de apertura.

---

## Sprint 18: Comandera Kanban en Tiempo Real e Integración de Repartidores (Planes Premium y Premium+)

### Objetivo del Sprint
Desarrollar la comanda web en tiempo real con tablero Kanban, mensajería rápida de cambio de estados y el módulo de deliverys (repartidores externos con acceso móvil y límites de hasta 2 cuentas).

* **Duración:** 2 semanas
* **Capacidad estimada:** 20 puntos de historia

---

### Historias de Usuario e Implementación Técnica

#### 1. Tablero de Comandas y Gestión de Pedidos en Tiempo Real
* **Épica asociada:** Épica 6: Panel de Ventas / Mostrador
* **Prioridad:** Alta | **Estimación:** 8 Ptos
* **Descripción:** Como comerciante, quiero visualizar los pedidos en un tablero Kanban y arrastrarlos entre columnas (Pendiente, En Cocina, En Camino, Entregado) para controlar el flujo operativo en tiempo real.

##### Actividad 1.1: Base de Datos y Canales en Tiempo Real (Realtime)
* **Rol:** BD
* **Componente:** Tabla pedidos, items y suscripción realtime
* **Ruta:** `supabase/migrations/20260824030000_crear_comandas.sql`
* **Módulo:** Caja / Ventas
* **Etiquetas:** `postgresql`, `supabase`, `realtime`
* **Pasos de implementación:**
  1. Crear la tabla `pedos_web` con campos: `pedido_id`, `cliente_id`, `datos_cliente` (JSON), `estado` (ENUM: 'pendiente', 'preparando', 'despachado', 'entregado', 'cancelado'), `total`, `repartidor_id`.
  2. Crear la tabla `pedido_items` asociada a los productos y variantes del comercio.
  3. Configurar publicaciones de Supabase Realtime para la tabla `pedidos_web` filtrada por tenant.
* **Criterios de Aceptación:**
  * Al ingresar un pedido desde el catálogo público, el tablero Kanban debe actualizarse automáticamente en la pantalla del comerciante sin recargar.

##### Actividad 1.2: Tablero Kanban de Comandas
* **Rol:** Frontend
* **Componente:** `TableroComandasKanban`
* **Ruta:** `src/app/(app)/ventas/comandas/TableroComandasKanban.tsx`
* **Módulo:** Ventas
* **Etiquetas:** `react`, `dnd-kit`, `tailwind`
* **Pasos de implementación:**
  1. Diseñar el tablero Kanban organizado por columnas de estado.
  2. Implementar funcionalidad Drag & Drop para actualizar la base de datos de forma reactiva al arrastrar tarjetas de pedidos.
  3. Agregar botones rápidos en las tarjetas para enviar mensajes preconfigurados de WhatsApp (ej: *"Tu pedido ya salió de camino con el delivery"*).
* **Criterios de Aceptación:**
  * Al presionar un botón de estado, debe abrir una ventana flotante de WhatsApp con el mensaje formateado hacia el número de teléfono del cliente.

---

#### 2. Gestión de Deliverys y Repartos (Plan Premium +)
* **Épica asociada:** Épica 6: Panel de Ventas / Mostrador
* **Prioridad:** Media | **Estimación:** 6 Ptos
* **Descripción:** Como comerciante, quiero crear hasta 2 cuentas de repartidor y asignarles pedidos directamente desde mi panel para que reciban la hoja de reparto en su celular.

##### Actividad 2.1: Cuentas de Delivery y Hoja de Reparto Móvil
* **Rol:** Backend
* **Componente:** `DeliverysRepository` / `VistaMovilDelivery`
* **Ruta:** `src/repositories/deliverysRepository.ts` / `src/app/(publico)/delivery/[repartidorId]/page.tsx`
* **Módulo:** Ventas
* **Etiquetas:** `typescript`, `nextjs`, `mobile-first`
* **Pasos de implementación:**
  1. Crear la tabla `repartidores` asociada al comercio.
  2. Crear el servicio de validación que bloquee el registro si se intentan crear más de 2 cuentas activas (`NX-DELIV-001`).
  3. Diseñar la vista móvil pública `/delivery/[repartidorId]` donde el repartidor logueado con su pin pueda ver el listado de pedidos asignados y hacer clic en *"Ver mapa/Cómo llegar"* o *"Marcar como Entregado"*.
* **Criterios de Aceptación:**
  * El comerciante debe poder re-asignar repartidores con un selector simple en cada tarjeta del Kanban de Comandas.
  * Si el comercio intenta registrar un tercer repartidor activo, se debe retornar el código de error `NX-DELIV-001`.
