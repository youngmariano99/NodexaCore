# Planificación Completa del Proyecto: Nodexa Core

## 1. Requisitos Funcionales
Requisitos Funcionales
1.1 Módulo Core (Gestión Interna — Stock y Mostrador)

Rol: Comerciante / Dueño de Negocio

Dar de alta, editar y dar de baja lógica (eliminado_en) productos del catálogo interno, con carga manual individual o masiva vía Excel estructurado.
Registrar entradas y salidas de stock por producto, visualizando el saldo disponible actualizado en tiempo real.
Operar el Panel de Ventas/Mostrador (caja interna): registrar una venta, seleccionar productos, calcular el total y confirmar el cobro.
Visualizar el conteo total de SKUs activos respecto al límite contratado (1.000 SKU base o ampliado).
Recibir aviso discreto en el panel al alcanzar el 90% del límite de SKU contratado.
Ser bloqueado para la creación de nuevos productos al alcanzar el 100% del límite, con oferta de ampliación mediante Pack de Catálogo Extendido.
Cargar imágenes de producto, las cuales deben comprimirse automáticamente antes de almacenarse (sin exponer al usuario el proceso técnico).

Rol: Administrador NODEXA

Crear el registro de un nuevo cliente (cliente_id) en el alta comercial.
Activar o desactivar módulos adicionales (tenant_modules) por cliente.
Modificar el limite_sku contratado ante una ampliación confirmada.
Actualizar el estado de pago (estado_pago) del cliente según el SOP de morosidad.
1.2 Módulo Catálogo Web (Vidriera o Pedido por WhatsApp)

Rol: Comerciante

Publicar o despublicar productos individuales para exposición pública (publicado = true/false).
Personalizar identidad visual básica de la vidriera (logo, colores) dentro de los parámetros del sistema de diseño.

Rol: Cliente Final (visitante público)

Consultar el catálogo publicado sin necesidad de autenticación.
Iniciar un pedido o consulta mediante enlace directo a WhatsApp desde una ficha de producto.
1.3 Módulo Carga con IA (Alta por Visión)

Rol: Comerciante

Subir una foto de etiqueta de producto para autocompletar los campos de alta (nombre, precio, categoría) mediante IA.
Visualizar el contador de cargas por IA consumidas sobre el total mensual disponible (40 cargas base).
Ser notificado de forma amigable al agotar la cuota mensual, con opción de contratar un paquete de recarga.
1.4 Módulo Clientes y Cuentas Corrientes (Fiado)

Rol: Comerciante

Registrar clientes propios del comercio con datos de contacto básicos.
Asociar ventas a cuenta corriente de un cliente registrado, incrementando su saldo deudor.
Registrar pagos parciales o totales que reduzcan el saldo deudor del cliente.
Consultar el estado de cuenta corriente por cliente.
1.5 Módulo Devoluciones y Notas de Crédito

Rol: Comerciante

Registrar la devolución total o parcial de una venta previamente confirmada.
Generar una nota de crédito asociada a la devolución, sin alterar el registro original de la venta (soft delete / trazabilidad por diff).
Reintegrar automáticamente el stock del producto devuelto.
1.6 Módulo Bot Estático de WhatsApp

Rol: Comerciante

Configurar respuestas automáticas estáticas (horarios, ubicación, catálogo) activables desde el panel.

Rol: Cliente Final

Recibir respuesta automática al escribir al número de WhatsApp del comercio, sin intervención humana inmediata.
1.7 Transversal a todos los módulos
Todo error de sistema visible en pantalla debe mostrarse en lenguaje claro y orientado a la solución, mapeado a un código normalizado de ERRORS.md, sin exponer trazas técnicas.
Toda acción crítica (alta, modificación, baja) debe quedar registrada en el log de auditoría por diffs, sin intervención manual del usuario

## 2. Requisitos No Funcionales
## 1. Requisitos Funcionales

### 1.1 Módulo Core (Gestión Interna — Stock y Mostrador)
**Rol: Comerciante / Dueño de Negocio**
- Dar de alta, editar y dar de baja lógica (`eliminado_en`) productos del catálogo interno, con carga manual individual o masiva vía Excel estructurado.
- Registrar entradas y salidas de stock por producto, visualizando el saldo disponible actualizado en tiempo real.
- Operar el Panel de Ventas/Mostrador (caja interna): registrar una venta, seleccionar productos, calcular el total y confirmar el cobro.
- Visualizar el conteo total de SKUs activos respecto al límite contratado (1.000 SKU base o ampliado).
- Recibir aviso discreto en el panel al alcanzar el 90% del límite de SKU contratado.
- Ser bloqueado para la creación de nuevos productos al alcanzar el 100% del límite, con oferta de ampliación mediante Pack de Catálogo Extendido.
- Cargar imágenes de producto, las cuales deben comprimirse automáticamente antes de almacenarse (sin exponer al usuario el proceso técnico).

**Rol: Administrador NODEXA**
- Crear el registro de un nuevo cliente (`cliente_id`) en el alta comercial.
- Activar o desactivar módulos adicionales (`tenant_modules`) por cliente.
- Modificar el `limite_sku` contratado ante una ampliación confirmada.
- Actualizar el estado de pago (`estado_pago`) del cliente según el SOP de morosidad.

### 1.2 Módulo Catálogo Web (Vidriera o Pedido por WhatsApp)
**Rol: Comerciante**
- Publicar o despublicar productos individuales para exposición pública (`publicado = true/false`).
- Personalizar identidad visual básica de la vidriera (logo, colores) dentro de los parámetros del sistema de diseño.

**Rol: Cliente Final (visitante público)**
- Consultar el catálogo publicado sin necesidad de autenticación.
- Iniciar un pedido o consulta mediante enlace directo a WhatsApp desde una ficha de producto.

### 1.3 Módulo Carga con IA (Alta por Visión)
**Rol: Comerciante**
- Subir una foto de etiqueta de producto para autocompletar los campos de alta (nombre, precio, categoría) mediante IA.
- Visualizar el contador de cargas por IA consumidas sobre el total mensual disponible (40 cargas base).
- Ser notificado de forma amigable al agotar la cuota mensual, con opción de contratar un paquete de recarga.

### 1.4 Módulo Clientes y Cuentas Corrientes (Fiado)
**Rol: Comerciante**
- Registrar clientes propios del comercio con datos de contacto básicos.
- Asociar ventas a cuenta corriente de un cliente registrado, incrementando su saldo deudor.
- Registrar pagos parciales o totales que reduzcan el saldo deudor del cliente.
- Consultar el estado de cuenta corriente por cliente.

### 1.5 Módulo Devoluciones y Notas de Crédito
**Rol: Comerciante**
- Registrar la devolución total o parcial de una venta previamente confirmada.
- Generar una nota de crédito asociada a la devolución, sin alterar el registro original de la venta (soft delete / trazabilidad por diff).
- Reintegrar automáticamente el stock del producto devuelto.

### 1.6 Módulo Bot Estático de WhatsApp
**Rol: Comerciante**
- Configurar respuestas automáticas estáticas (horarios, ubicación, catálogo) activables desde el panel.

**Rol: Cliente Final**
- Recibir respuesta automática al escribir al número de WhatsApp del comercio, sin intervención humana inmediata.

### 1.7 Transversal a todos los módulos
- Todo error de sistema visible en pantalla debe mostrarse en lenguaje claro y orientado a la solución, mapeado a un código normalizado de `ERRORS.md`, sin exponer trazas técnicas.
- Toda acción crítica (alta, modificación, baja) debe quedar registrada en el log de auditoría por diffs, sin intervención manual del usuario.

---

## 2. Requisitos No Funcionales

| Categoría | Requisito Medible |
| :--- | :--- |
| **Rendimiento** | Toda consulta de listados (productos, clientes, ventas) debe paginarse en servidor; prohibido `SELECT *` sin `LIMIT` explícito. |
| **Rendimiento** | Las vistas públicas del Catálogo Web deben servirse con caché de Edge (Next.js Revalidation / TanStack Query) para minimizar hits transaccionales a PostgreSQL. |
| **Rendimiento** | Toda imagen cargada por el usuario debe transformarse a formato WebP con peso objetivo de ~70 KB y máximo 1080px antes de almacenarse o mostrarse. |
| **Seguridad** | Aislamiento multi-tenant obligatorio mediante Row Level Security (RLS) en PostgreSQL; prohibido `USING (true)` en políticas de `INSERT`, `UPDATE` o `DELETE`. |
| **Seguridad** | Sesiones de usuario con expiración máxima de 1 hora (Supabase Auth, JWT), validadas por middleware global en cada solicitud a rutas protegidas. |
| **Seguridad** | Validación Fail-Fast con Zod en el 100% de los Server Actions, Route Handlers y DTOs de entrada. |
| **Seguridad** | Todo endpoint debe verificar que el recurso solicitado pertenezca al `cliente_id` del JWT (defensa IDOR/BOLA). |
| **Seguridad** | Rate limiting distribuido (`@upstash/ratelimit`) obligatorio en rutas de autenticación, mutación de inventario y consumo de IA. |
| **Auditoría / Trazabilidad** | Todo cambio en entidades críticas (productos, ventas, clientes) debe registrarse en background como diff (campo, valor anterior, valor nuevo, `usuario_id`, `cliente_id`, timestamp), sin bloquear la transacción principal. |
| **Auditoría / Trazabilidad** | Errores técnicos capturados por Sentry en menos de 500 ms, sin exponer datos sensibles; métricas de negocio separadas en PostHog. |
| **Disponibilidad de Datos** | Prohibida la eliminación física de `productos`, `ventas` y `clientes`; obligatorio borrado lógico mediante columna `eliminado_en`. |
| **Escalabilidad** | Cada módulo opcional debe activarse/desactivarse mediante Feature Flag por `cliente_id` (`tenant_modules`) sin afectar la disponibilidad del Core. |
| **Escalabilidad** | El sistema debe soportar la ampliación incremental del límite de SKU (bloques de 1.000) sin migración de esquema ni downtime. |
| **Accesibilidad / UI** | Toda área interactiva (botones, enlaces) debe respetar un área táctil mínima de 44x44px, según el token `min-touch-target` del sistema de diseño. |
| **Accesibilidad / UI** | Tamaño de fuente mínimo absoluto de 14px en toda la interfaz; base recomendada de 16px. |
| **Accesibilidad / UI** | Ningún error puede comunicarse únicamente por color; debe acompañarse de texto explicativo e ícono descriptivo (`lucide-react`), conforme a las Directrices de Negación del sistema de diseño. |
| **Calidad de Código** | Ningún archivo del proyecto puede superar las 500-600 líneas de código; exceder el límite obliga a modularizar. |
| **Calidad de Código** | Cobertura mínima de pruebas automatizadas del 80%, distribuida en proporción 70% unitarias (Vitest), 20% integración, 10% E2E (Playwright). |
| **Portabilidad** | El sistema debe permitir exportación del catálogo y transacciones del cliente en formatos CSV o JSON sin fricción. |
| **Concurrencia** | Las operaciones de venta y stock deben implementar concurrencia optimista para evitar registros duplicados ante solicitudes simultáneas. |

## 3. Sitemap General
*No configurado*

## 4. Entidades y Modelado 3FN
(ver docs/SCHEMA.md actualizado en el repo — nueva sección 17 'ajustes_facturacion', renumeración de Relaciones a §18 y Políticas RLS a §19, nota de excepción de INSERT admin-only)

## 5. Backlog Completo de Ingeniería (Historias y Actividades)

# Backlog Completo de Ingeniería - Nodexa Core

Este documento contiene el desglose jerárquico de Épicas, Historias de Usuario y Actividades Técnicas detalladas con sus respectivos archivos, rutas, pasos de checklist y criterios de aceptación.

## 📁 Épica: Épica 1: Configuración Base del Proyecto e Infraestructura
*Descripción:* Inicialización del repositorio Next.js (App Router) con TypeScript estricto, configuración de Tailwind CSS y Shadcn UI, conexión a Supabase (PostgreSQL, Auth, RLS), configuración de Vercel para despliegues automatizados, integración de Sentry y PostHog, definición de tipos ENUM y estructura base de migraciones, y montaje de pipelines CI/CD con validación de linters, tipos y pruebas previas al deploy.

### 💡 Historia: Inicialización del proyecto Next.js con TypeScript estricto
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero inicializar el repositorio con Next.js App Router, TypeScript estricto, Tailwind CSS y Shadcn UI para contar con una base de código consistente antes de construir cualquier módulo.

#### Actividades Técnicas Desglosadas:
##### 1. Scaffold del proyecto Next.js App Router + TypeScript estricto
- **Rol:** DevOps / Platform Engineer
- **Componente/Archivo:** `estructura_base_proyecto` en la ruta `/`
- **Módulo:** Infraestructura Base
- **Etiquetas:** DEVOPS, FRONTEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Ejecutar `npx create-next-app@latest nodexa-core --typescript --app --tailwind --eslint`.
  - [ ] Paso 2: Configurar `tsconfig.json` con `strict: true`, `noImplicitAny: true` y `noUncheckedIndexedAccess: true`.
  - [ ] Paso 3: Crear carpetas base `src/app`, `src/components`, `src/repositories`, `src/services`, `src/lib`, `src/types`.
  - [ ] Paso 4: Validar que `npm run build` compile sin errores de tipado.
- **Criterios de Aceptación (BDD):**
  - Dado el repositorio recién clonado, cuando se ejecuta `npm install` y `npm run build`, entonces el proceso finaliza sin errores de tipado ni warnings de configuración.
  - Dado el archivo `tsconfig.json`, cuando se inspecciona su contenido, entonces `strict: true` y `noImplicitAny: true` están habilitados.
  - Dado el estándar técnico del proyecto, cuando se revisa la estructura de carpetas, entonces existen `src/app`, `src/components`, `src/repositories`, `src/services` y `src/lib`.
  - Dado un archivo `.tsx` con uso implícito de tipo `any`, cuando se ejecuta `tsc --noEmit`, entonces el build falla señalando el error.

### 💡 Historia: Conexión y configuración de Supabase
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero conectar el proyecto a Supabase (PostgreSQL, Auth, RLS) para disponer de la base de datos y autenticación desde el inicio del desarrollo.

#### Actividades Técnicas Desglosadas:
##### 1. Provisionar proyecto Supabase y variables de entorno
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `supabaseClient` en la ruta `src/lib/supabase/`
- **Módulo:** Infraestructura Base
- **Etiquetas:** BD, DEVOPS, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear el proyecto en Supabase y obtener `project_url` y claves anon/service_role.
  - [ ] Paso 2: Crear `src/lib/supabase/client.ts` (cliente browser con anon key) y `src/lib/supabase/server.ts` (cliente server-only).
  - [ ] Paso 3: Crear `src/lib/env.ts` con esquema Zod para validar variables de entorno al arranque (Fail-Fast).
  - [ ] Paso 4: Configurar `.env.local` sin prefijo `NEXT_PUBLIC_` para `SUPABASE_SERVICE_ROLE_KEY`.
  - [ ] Paso 5: Validar conexión ejecutando una consulta de prueba `SELECT 1`.
- **Criterios de Aceptación (BDD):**
  - Dado el proyecto Supabase creado, cuando se ejecuta la app en local, entonces `src/lib/supabase/client.ts` y `server.ts` conectan exitosamente sin error de autenticación.
  - Dado el archivo `.env.local`, cuando se inspeccionan las variables, entonces ninguna clave `SUPABASE_SERVICE_ROLE_KEY` está prefijada con `NEXT_PUBLIC_`.
  - Dado el esquema Zod de entorno en `src/lib/env.ts`, cuando falta una variable requerida, entonces la aplicación falla al arrancar con un mensaje explícito (Fail-Fast).
  - Dado el cliente server-only, cuando se importa desde un componente cliente, entonces TypeScript o el bundler arrojan error de importación prohibida.

### 💡 Historia: Definición de tipos ENUM y migraciones base
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero definir los tipos ENUM del dominio y la estructura inicial de migraciones para tener un modelo de datos versionado desde el arranque del proyecto.

#### Actividades Técnicas Desglosadas:
##### 1. Crear migraciones SQL iniciales con Supabase CLI
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `migraciones_iniciales` en la ruta `supabase/migrations/`
- **Módulo:** Base de Datos
- **Etiquetas:** BD, DEVOPS
- **Checklist de Implementación:**
  - [ ] Paso 1: Ejecutar `supabase migration new init_enums_y_tablas_core`.
  - [ ] Paso 2: Declarar los tipos ENUM (`rol_usuario`, `modulo_nodexa`, `tipo_movimiento_stock`, `estado_venta`, `tipo_movimiento_cuenta`, `estado_devolucion`, `origen_alta_producto`) según `docs/SCHEMA.md`.
  - [ ] Paso 3: Crear las tablas `clientes`, `usuarios` y `tenant_modules` con sus restricciones y CHECKs.
  - [ ] Paso 4: Ejecutar `supabase db push` y verificar con `Supabase:list_migrations` que se aplicó correctamente.
- **Criterios de Aceptación (BDD):**
  - Dado el comando `supabase db push`, cuando se ejecuta contra un entorno limpio, entonces se crean los tipos ENUM (`rol_usuario`, `modulo_nodexa`, etc.) sin errores.
  - Dado el listado de migraciones, cuando se consulta `list_migrations`, entonces la migración inicial aparece registrada y aplicada.
  - Dado un intento de re-ejecutar la misma migración, cuando se corre `supabase db push` nuevamente, entonces no genera duplicados ni falla por definiciones ya existentes.
  - Dado el tenant de prueba sembrado, cuando se consulta la tabla `clientes`, entonces el registro con slug 'demo-nodexa' existe correctamente.

### 💡 Historia: Configuración de despliegue en Vercel
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero configurar el despliegue automatizado en Vercel para publicar cambios de forma continua en entornos de preview y producción.

#### Actividades Técnicas Desglosadas:
##### 1. Configurar proyecto en Vercel Edge Network
- **Rol:** DevOps / Platform Engineer
- **Componente/Archivo:** `vercel.json` en la ruta `/`
- **Módulo:** Infraestructura Base
- **Etiquetas:** DEVOPS
- **Checklist de Implementación:**
  - [ ] Paso 1: Vincular el repositorio de GitHub al proyecto en Vercel.
  - [ ] Paso 2: Configurar variables de entorno de Production y Preview replicando `.env.local` sin exponer `service_role` como `NEXT_PUBLIC_`.
  - [ ] Paso 3: Habilitar despliegues de Preview automáticos por Pull Request.
  - [ ] Paso 4: Verificar que las rutas del grupo `(publico)` se sirvan desde Vercel Edge Network con caché habilitada.
- **Criterios de Aceptación (BDD):**
  - Dado un Pull Request abierto, cuando se sincroniza con Vercel, entonces se genera automáticamente un deploy de Preview con URL única.
  - Dado el panel de variables de entorno en Vercel, cuando se revisan las claves de producción, entonces ninguna clave sensible (`service_role`) es visible en el bundle del cliente.
  - Dado una ruta del grupo `(publico)`, cuando se accede desde distintas regiones, entonces la respuesta se sirve desde el Edge con cabeceras de caché correspondientes.
  - Dado un merge a `main`, cuando se completa el deploy, entonces el entorno de producción refleja los cambios sin downtime.

### 💡 Historia: Integración de Sentry y PostHog
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero integrar Sentry y PostHog en el proyecto para contar con monitoreo técnico y analítica de negocio desde las primeras funcionalidades.

#### Actividades Técnicas Desglosadas:
##### 1. Instrumentar Sentry para monitoreo técnico
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `sentry.config` en la ruta `/`
- **Módulo:** Trazabilidad y Auditoría
- **Etiquetas:** DEVOPS, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Instalar `@sentry/nextjs` y ejecutar el wizard oficial de configuración.
  - [ ] Paso 2: Configurar `sentry.client.config.ts` y `sentry.server.config.ts` con `beforeSend` que filtre tokens, contraseñas y datos de `cliente_id` sensibles.
  - [ ] Paso 3: Provocar un error de prueba en un Route Handler y verificar que se capture en el dashboard de Sentry en menos de 500 ms.
- **Criterios de Aceptación (BDD):**
  - Dado un error no controlado en un Route Handler, cuando ocurre en producción, entonces aparece en el dashboard de Sentry en menos de 500 ms.
  - Dado un evento capturado por Sentry, cuando se inspecciona su payload, entonces no contiene contraseñas, tokens ni datos sensibles del `cliente_id`.
  - Dado el archivo `sentry.client.config.ts` y `sentry.server.config.ts`, cuando se revisan, entonces ambos tienen configurado `beforeSend` con lógica de filtrado.
  - Dado un error de prueba forzado intencionalmente, cuando se dispara, entonces genera una alerta visible en el proyecto de Sentry configurado.

##### 2. Instrumentar PostHog para métricas de negocio
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `posthog` en la ruta `src/lib/analytics/`
- **Módulo:** Trazabilidad y Auditoría
- **Etiquetas:** FRONTEND, DEVOPS
- **Checklist de Implementación:**
  - [ ] Paso 1: Instalar `posthog-js` y crear `src/lib/analytics/posthog.ts` con inicialización en cliente.
  - [ ] Paso 2: Definir eventos de negocio (`clic_whatsapp`, `conversion_catalogo`, `uso_modulo`) sin escribir en PostgreSQL.
  - [ ] Paso 3: Integrar el disparo de eventos en el CTA de WhatsApp de la ficha de producto pública.
  - [ ] Paso 4: Verificar en el dashboard de PostHog que los eventos lleguen correctamente segmentados.
- **Criterios de Aceptación (BDD):**
  - Dado un clic en el CTA de WhatsApp de la ficha pública de producto, cuando el usuario interactúa, entonces se dispara el evento `clic_whatsapp` en PostHog.
  - Dado los eventos de negocio configurados, cuando se revisan en el dashboard de PostHog, entonces ninguno escribe datos directamente en PostgreSQL.
  - Dado un evento de conversión de catálogo, cuando ocurre una visualización de la vidriera, entonces queda registrado con el `cliente_id` correspondiente como propiedad segmentable.
  - Dado el entorno de desarrollo local, cuando PostHog está desactivado por configuración, entonces la aplicación no falla ni genera errores en consola.

### 💡 Historia: Pipeline de CI/CD con validaciones previas al deploy
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero un pipeline de CI/CD que ejecute linters, chequeo de tipos y pruebas automáticas para evitar que código defectuoso llegue a producción.

#### Actividades Técnicas Desglosadas:
##### 1. Configurar GitHub Actions con validaciones de calidad
- **Rol:** DevOps / Platform Engineer
- **Componente/Archivo:** `ci.yml` en la ruta `.github/workflows/`
- **Módulo:** Infraestructura Base
- **Etiquetas:** DEVOPS
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `.github/workflows/ci.yml` disparado en `pull_request` hacia `main`.
  - [ ] Paso 2: Agregar jobs para `npm run lint`, `tsc --noEmit`, `npm run test` (Vitest) y `npm run test:e2e` (Playwright).
  - [ ] Paso 3: Configurar el repositorio para exigir el pipeline en verde como check obligatorio antes de mergear.
  - [ ] Paso 4: Validar el flujo abriendo un PR de prueba con un error de lint intencional.
- **Criterios de Aceptación (BDD):**
  - Dado un Pull Request con errores de lint, cuando se ejecuta el pipeline de CI, entonces el job falla y bloquea el merge.
  - Dado un Pull Request con errores de tipado TypeScript, cuando se ejecuta `tsc --noEmit` en CI, entonces el pipeline falla explícitamente señalando el archivo y línea.
  - Dado un Pull Request válido, cuando pasan lint, tipos, pruebas unitarias y E2E, entonces el check requerido se marca en verde y habilita el merge.
  - Dado el repositorio configurado en GitHub, cuando se intenta mergear sin que el pipeline haya corrido, entonces GitHub bloquea la acción por regla de branch protection.

---

## 📁 Épica: Épica 2: Autenticación, Roles y Aislamiento Multi-Tenant
*Descripción:* Implementación de Supabase Auth con sesiones JWT de expiración máxima de 1 hora, middleware global de validación de sesión, alta de la entidad usuarios con roles admin_nodexa/comerciante/empleado, definición y aplicación de políticas RLS por cliente_id en todas las tablas de negocio, defensa IDOR/BOLA en Server Actions y Route Handlers, y configuración de rate limiting con Upstash Redis en rutas de autenticación.

### 💡 Historia: Inicio de sesión con Supabase Auth
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como usuario del sistema quiero iniciar sesión con mis credenciales para acceder al panel correspondiente a mi rol y comercio.

#### Actividades Técnicas Desglosadas:
##### 1. Implementar formulario de login con Server Action
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `LoginForm` en la ruta `app/(publico)/login/`
- **Módulo:** Autenticación y Roles
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/(publico)/login/page.tsx` con formulario controlado (email, contraseña) respetando el sistema de diseño (min-touch-target 44px).
  - [ ] Paso 2: Crear Server Action `iniciarSesion` en `src/services/autenticacion/iniciarSesion.ts` validada con Zod.
  - [ ] Paso 3: Invocar `supabase.auth.signInWithPassword` y manejar el error `NX-SYS-006` en credenciales inválidas.
  - [ ] Paso 4: Redirigir según el `rol` del JWT: `comerciante`/`empleado` a `/dashboard`, `admin_nodexa` a `/admin`.
- **Criterios de Aceptación (BDD):**
  - Dado un usuario con credenciales válidas, cuando envía el formulario de login, entonces es redirigido según su rol (`comerciante`/`empleado` a `/dashboard`, `admin_nodexa` a `/admin`).
  - Dado un usuario con credenciales inválidas, cuando envía el formulario, entonces se muestra el mensaje `NX-SYS-006` sin exponer detalles técnicos.
  - Dado el formulario de login, cuando se inspecciona en mobile, entonces los campos y el botón de submit respetan el área táctil mínima de 44x44px.
  - Dado el payload enviado al Server Action, cuando no cumple el esquema Zod, entonces la validación se ejecuta en el servidor (Fail-Fast) antes de llamar a Supabase Auth.

### 💡 Historia: Middleware global de validación de sesión JWT
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como administrador de seguridad quiero que un middleware valide el token JWT en cada solicitud a rutas protegidas para que ninguna vista sensible quede accesible sin sesión vigente.

#### Actividades Técnicas Desglosadas:
##### 1. Implementar middleware de autenticación en Next.js
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `middleware` en la ruta `/`
- **Módulo:** Autenticación y Roles
- **Etiquetas:** BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `middleware.ts` en la raíz interceptando rutas de `(app)` y `(admin)` según el `matcher`.
  - [ ] Paso 2: Validar la sesión de Supabase y su expiración (máximo 1 hora).
  - [ ] Paso 3: Decodificar los custom claims `cliente_id` y `rol` del JWT.
  - [ ] Paso 4: Redirigir a `/login` con código `NX-SYS-002` si el token es inválido o venció; bloquear `(admin)` si `rol != admin_nodexa`.
- **Criterios de Aceptación (BDD):**
  - Dado un usuario sin sesión activa, cuando intenta acceder a una ruta de `(app)`, entonces es redirigido a `/login` con el código `NX-SYS-002`.
  - Dado un JWT con más de 1 hora de antigüedad, cuando se valida en el middleware, entonces se considera expirado y se fuerza el re-login.
  - Dado un usuario con rol `comerciante`, cuando intenta acceder a una ruta de `(admin)`, entonces recibe un `NX-SYS-003` y es redirigido a su panel correspondiente.
  - Dado un usuario `admin_nodexa` autenticado, cuando accede a `/admin`, entonces el middleware permite el acceso sin restricciones adicionales.

### 💡 Historia: Alta de usuarios con roles diferenciados
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como comerciante quiero dar de alta usuarios empleados dentro de mi comercio para delegar el uso del mostrador sin compartir mis propias credenciales.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action de creación de usuario empleado
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `crearUsuario` en la ruta `src/services/usuarios/`
- **Módulo:** Autenticación y Roles
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `crearUsuario` en `src/services/usuarios/crearUsuario.ts` con DTO Zod (`nombre`, `email`, `rol` limitado a 'comerciante'|'empleado').
  - [ ] Paso 2: Invocar Supabase Auth Admin API desde contexto server-only (nunca en cliente).
  - [ ] Paso 3: Insertar en `usuarios` vinculando `auth_user_id` y `cliente_id` del comerciante solicitante.
  - [ ] Paso 4: Registrar el alta en `auditoria_diffs` de forma asíncrona con `after()`.
- **Criterios de Aceptación (BDD):**
  - Dado un comerciante autenticado, cuando ejecuta `crearUsuario` con datos válidos, entonces se crea el registro en `usuarios` vinculado a su `cliente_id`.
  - Dado un payload con un rol distinto a 'comerciante'/'empleado', cuando se valida con Zod, entonces la Server Action rechaza la solicitud con `NX-SYS-006`.
  - Dado el alta exitosa de un empleado, cuando se consulta `auditoria_diffs`, entonces existe un registro asíncrono del evento sin haber bloqueado la respuesta al usuario.
  - Dado un usuario con rol `empleado`, cuando intenta ejecutar `crearUsuario`, entonces la acción es rechazada por falta de permisos.

### 💡 Historia: Políticas RLS por cliente_id en todas las tablas de negocio
- **Prioridad:** Alta
- **Estimación:** 8 SP
- **Descripción / CA Funcionales:** Como arquitecto de seguridad quiero aplicar Row Level Security por cliente_id en cada tabla de negocio para garantizar que ningún comercio pueda leer ni modificar datos de otro tenant.

#### Actividades Técnicas Desglosadas:
##### 1. Migración de políticas RLS multi-tenant
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `rls_policies` en la ruta `supabase/migrations/`
- **Módulo:** Base de Datos
- **Etiquetas:** BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear migración `enable_rls_policies.sql` con funciones helper `auth_cliente_id()`, `auth_rol()` y `es_admin_nodexa()`.
  - [ ] Paso 2: Habilitar RLS y aplicar políticas `select_tenant`/`insert_tenant`/`update_tenant` en todas las tablas listadas en `docs/ROLES.md`.
  - [ ] Paso 3: Agregar la política de lectura pública `productos_lectura_publica` para `publicado = true`.
  - [ ] Paso 4: Ejecutar `Supabase:get_advisors` y confirmar que ninguna política usa `USING (true)` en mutaciones.
- **Criterios de Aceptación (BDD):**
  - Dado un usuario autenticado del tenant A, cuando intenta hacer `SELECT` sobre productos del tenant B, entonces la consulta retorna cero filas.
  - Dado un usuario autenticado del tenant A, cuando intenta hacer `INSERT` con `cliente_id` del tenant B, entonces la operación es rechazada por RLS.
  - Dado el listado de políticas creadas, cuando se ejecuta `Supabase:get_advisors`, entonces no se reportan políticas de `INSERT`/`UPDATE`/`DELETE` con `USING (true)`.
  - Dado un visitante no autenticado, cuando consulta productos, entonces solo puede leer aquellos con `publicado = true` y `eliminado_en IS NULL`.

### 💡 Historia: Verificación de propiedad de recursos (IDOR/BOLA)
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como arquitecto de seguridad quiero que cada Server Action valide que el recurso solicitado pertenece al cliente_id del token para evitar accesos indebidos entre comercios.

#### Actividades Técnicas Desglosadas:
##### 1. Implementar guard de pertenencia de recurso en repositorios
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `verificarPertenenciaTenant` en la ruta `src/repositories/base/`
- **Módulo:** Autenticación y Roles
- **Etiquetas:** BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `verificarPertenenciaTenant(recursoId, clienteIdJwt)` en `src/repositories/base/verificarPertenenciaTenant.ts`.
  - [ ] Paso 2: Consultar el recurso por `id` y `cliente_id` antes de cualquier mutación, retornando `NX-SYS-007` si no coincide.
  - [ ] Paso 3: Aplicar el guard en los repositorios de `ventas`, `devoluciones` y `clientes_finales`.
  - [ ] Paso 4: Escribir prueba de integración simulando acceso cruzado entre dos tenants.
- **Criterios de Aceptación (BDD):**
  - Dado un `venta_id` que pertenece a otro `cliente_id`, cuando se invoca `verificarPertenenciaTenant`, entonces retorna el error `NX-SYS-007` sin ejecutar la mutación.
  - Dado un recurso propio del tenant autenticado, cuando se ejecuta el guard, entonces la operación continúa normalmente.
  - Dado el repositorio de `devoluciones`, cuando se intenta modificar una devolución de otro tenant, entonces la mutación es bloqueada antes de tocar la base de datos.
  - Dado un intento de acceso cruzado detectado, cuando ocurre, entonces queda registrado en el log de auditoría o Sentry para trazabilidad de seguridad.

### 💡 Historia: Rate limiting en rutas de autenticación
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como administrador de seguridad quiero limitar la cantidad de intentos de inicio de sesión mediante Upstash Redis para reducir el riesgo de ataques de fuerza bruta.

#### Actividades Técnicas Desglosadas:
##### 1. Configurar Upstash Redis rate limit en login
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `authLimiter` en la ruta `src/lib/rate-limit/`
- **Módulo:** Autenticación y Roles
- **Etiquetas:** BACKEND, DEVOPS
- **Checklist de Implementación:**
  - [ ] Paso 1: Instalar `@upstash/ratelimit` y `@upstash/redis`, configurando variables de entorno de conexión.
  - [ ] Paso 2: Crear `src/lib/rate-limit/authLimiter.ts` con ventana deslizante (5 intentos / 15 min por IP+email).
  - [ ] Paso 3: Aplicar el limiter en la Server Action `iniciarSesion` y en la recuperación de contraseña.
  - [ ] Paso 4: Retornar `NX-SYS-005` con estado 429 al exceder el límite.
- **Criterios de Aceptación (BDD):**
  - Dado un usuario que realiza 6 intentos de login fallidos en 15 minutos, cuando intenta un sexto intento, entonces recibe el error `NX-SYS-005` con estado HTTP 429.
  - Dado el límite de rate limiting alcanzado, cuando el usuario espera el tiempo indicado, entonces puede volver a intentar el login exitosamente.
  - Dado dos usuarios distintos desde la misma IP, cuando uno de ellos agota su límite, entonces el otro usuario no se ve afectado (clave compuesta IP+email).
  - Dado un ataque de fuerza bruta simulado, cuando se ejecuta contra la ruta de login, entonces Upstash Redis bloquea las solicitudes excedentes antes de llegar a Supabase Auth.

---

## 📁 Épica: Épica 3: Alta y Onboarding de Comercios (Administrador NODEXA)
*Descripción:* Panel administrativo para que el rol admin_nodexa cree el registro de cliente (cliente_id), configure el estado_pago inicial, active o desactive módulos mediante tenant_modules, y modifique el limite_sku contratado ante ampliaciones confirmadas, cubriendo el flujo de alta comercial descrito en el SOP de onboarding.

### 💡 Historia: Alta de nuevo comercio por el Administrador NODEXA
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como administrador NODEXA quiero crear el registro de un nuevo cliente con su cliente_id único para iniciar formalmente el onboarding de un comercio.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action de alta comercial de cliente
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `crearCliente` en la ruta `src/services/admin/`
- **Módulo:** Onboarding de Comercios
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `crearCliente` en `src/services/admin/crearCliente.ts` restringida a `rol = admin_nodexa`.
  - [ ] Paso 2: Validar DTO Zod (`nombre_comercio`, `slug` único, `telefono_whatsapp`).
  - [ ] Paso 3: Insertar en `clientes` con `estado_pago = true` y `limite_sku = 1000` por defecto.
  - [ ] Paso 4: Registrar el alta en `auditoria_diffs` siguiendo el flujo SOP-01 Día 0-1.
- **Criterios de Aceptación (BDD):**
  - Dado un usuario `admin_nodexa` autenticado, cuando ejecuta `crearCliente` con datos válidos, entonces se crea el registro en `clientes` con `estado_pago = true` y `limite_sku = 1000` por defecto.
  - Dado un `slug` ya existente, cuando se intenta crear un nuevo comercio con ese mismo slug, entonces se retorna el error `NX-ADM-001`.
  - Dado un usuario con rol distinto a `admin_nodexa`, cuando intenta ejecutar `crearCliente`, entonces la acción es rechazada por falta de permisos.
  - Dado el alta exitosa de un comercio, cuando se consulta `auditoria_diffs`, entonces el evento queda registrado con el `usuario_id` del administrador que lo ejecutó.

### 💡 Historia: Activación de módulos contratados en el alta
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como administrador NODEXA quiero activar los módulos contratados mediante tenant_modules al momento del alta para que el comercio disponga de las funcionalidades pagas desde el primer día.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action de activación de tenant_modules en onboarding
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `activarModulosIniciales` en la ruta `src/services/admin/`
- **Módulo:** Onboarding de Comercios
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `activarModulosIniciales` en `src/services/admin/activarModulosIniciales.ts` recibiendo `cliente_id` y arreglo de `modulo_nodexa`.
  - [ ] Paso 2: Insertar filas en `tenant_modules` respetando `UNIQUE(cliente_id, modulo)`.
  - [ ] Paso 3: Registrar el evento en `auditoria_diffs` de forma asíncrona.
  - [ ] Paso 4: Validar que el Core siga funcionando si un módulo queda desactivado (Pilar de Modularidad).
- **Criterios de Aceptación (BDD):**
  - Dado un `cliente_id` válido y un arreglo de módulos, cuando se ejecuta `activarModulosIniciales`, entonces se insertan las filas correspondientes en `tenant_modules` con `activo = true`.
  - Dado un módulo ya activado previamente para el mismo `cliente_id`, cuando se intenta activar de nuevo, entonces la restricción `UNIQUE(cliente_id, modulo)` previene el duplicado sin romper la operación.
  - Dado un tenant con el módulo `carga_ia` desactivado, cuando se navega al Core (mostrador, productos), entonces el sistema funciona con normalidad sin errores por dependencia faltante.
  - Dado la activación de módulos, cuando finaliza, entonces se genera un registro en `auditoria_diffs` de forma asíncrona.

### 💡 Historia: Ampliación del límite de SKU contratado
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como administrador NODEXA quiero modificar el limite_sku de un comercio tras una ampliación confirmada para reflejar el nuevo tope de catálogo acordado.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action de ampliación de limite_sku
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `ampliarLimiteSku` en la ruta `src/services/admin/`
- **Módulo:** Facturación y Límites
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `ampliarLimiteSku` en `src/services/admin/ampliarLimiteSku.ts` restringida a `admin_nodexa`.
  - [ ] Paso 2: Validar con Zod que el nuevo valor sea mayor al conteo actual de SKUs activos (bloqueo `NX-ADM-003`).
  - [ ] Paso 3: Actualizar `clientes.limite_sku` y registrar el diff en `auditoria_diffs`.
  - [ ] Paso 4: Sumar el valor del pack al próximo período de facturación.
- **Criterios de Aceptación (BDD):**
  - Dado un comercio con 1000 SKU activos, cuando el admin ejecuta `ampliarLimiteSku` a 2000, entonces `clientes.limite_sku` se actualiza correctamente.
  - Dado un intento de reducir el `limite_sku` por debajo del conteo actual de productos activos, cuando se ejecuta la Server Action, entonces se retorna el error `NX-ADM-003`.
  - Dado un usuario con rol distinto a `admin_nodexa`, cuando intenta ejecutar `ampliarLimiteSku`, entonces la acción es rechazada.
  - Dado la ampliación exitosa, cuando se consulta el próximo período de facturación, entonces refleja el nuevo pack contratado sumado al abono base.

### 💡 Historia: Panel de listado y detalle de comercios
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como administrador NODEXA quiero consultar el listado de comercios dados de alta con su estado_pago y módulos activos para tener visibilidad general de la cartera de clientes.

#### Actividades Técnicas Desglosadas:
##### 1. Vista paginada de comercios en /admin/clientes
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `ListadoComercios` en la ruta `app/(admin)/admin/clientes/`
- **Módulo:** Onboarding de Comercios
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/(admin)/admin/clientes/page.tsx` como Server Component.
  - [ ] Paso 2: Consultar `clientes` mediante repositorio con `.range()` de Supabase Query Builder (paginación server-side).
  - [ ] Paso 3: Mostrar `estado_pago`, `limite_sku` y módulos activos usando `font-mono` para datos numéricos.
  - [ ] Paso 4: Crear `app/(admin)/admin/clientes/[clienteId]/page.tsx` para el detalle del comercio.
- **Criterios de Aceptación (BDD):**
  - Dado más de 20 comercios registrados, cuando se accede a `/admin/clientes`, entonces el listado se muestra paginado sin ejecutar `SELECT *` sin `LIMIT`.
  - Dado un comercio con `estado_pago = false`, cuando se visualiza en el listado, entonces su estado se refleja claramente en la interfaz.
  - Dado un clic sobre un comercio del listado, cuando se navega, entonces se accede a `/admin/clientes/[clienteId]` con el detalle correcto.
  - Dado un usuario `comerciante` autenticado, cuando intenta acceder a `/admin/clientes`, entonces es redirigido o recibe `NX-SYS-003`.

---

## 📁 Épica: Épica 4: Gestión de Catálogo de Productos (Core)
*Descripción:* Alta, edición y baja lógica (eliminado_en) de productos con carga manual individual o masiva vía Excel estructurado, compresión automática de imágenes antes de almacenarse, listados paginados en servidor, y lógica de conteo de SKUs activos con aviso discreto al 90% del limite_sku y bloqueo de creación al 100% con oferta de ampliación mediante Pack de Catálogo Extendido.

### 💡 Historia: Alta manual de producto
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como comerciante quiero cargar manualmente un producto con nombre, precio, categoría e imagen para incorporarlo a mi catálogo interno.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action crearProducto con validación Zod
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `crearProducto` en la ruta `src/services/productos/`
- **Módulo:** Gestión de Catálogo
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `crearProducto` en `src/services/productos/crearProducto.ts` con DTO Zod (`sku`, `nombre`, `precio >= 0`, `categoria`).
  - [ ] Paso 2: Crear `src/repositories/productosRepository.ts` que encapsule el insert en Supabase.
  - [ ] Paso 3: Verificar el conteo de SKUs activos contra `limite_sku` antes de insertar (bloqueo `NX-PRD-001`).
  - [ ] Paso 4: Registrar el alta en `auditoria_diffs` de forma asíncrona.
- **Criterios de Aceptación (BDD):**
  - Dado un payload con `precio` negativo, cuando se envía a `crearProducto`, entonces Zod rechaza la solicitud con `NX-PRD-003` antes de tocar la base de datos.
  - Dado un comercio con 1000 SKU activos sobre un límite de 1000, cuando se intenta crear un nuevo producto, entonces se retorna `NX-PRD-001` sin insertar el registro.
  - Dado un `sku` ya existente para el mismo `cliente_id`, cuando se intenta crear un producto duplicado, entonces se retorna `NX-PRD-002`.
  - Dado un alta exitosa de producto, cuando se consulta `auditoria_diffs`, entonces el evento queda registrado de forma asíncrona sin bloquear la respuesta al usuario.

### 💡 Historia: Edición de producto existente
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero editar los datos de un producto ya cargado para mantener actualizada la información de precio y stock de referencia.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action actualizarProducto con verificación de tenant
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `actualizarProducto` en la ruta `src/services/productos/`
- **Módulo:** Gestión de Catálogo
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `actualizarProducto` en `src/services/productos/actualizarProducto.ts` con Zod para payload parcial.
  - [ ] Paso 2: Verificar pertenencia al `cliente_id` vía `verificarPertenenciaTenant`.
  - [ ] Paso 3: Actualizar la fila y setear `actualizado_en = now()`.
  - [ ] Paso 4: Encolar registro de diff campo por campo en `auditoria_diffs` con `after()`.
- **Criterios de Aceptación (BDD):**
  - Dado un producto que pertenece a otro `cliente_id`, cuando se intenta editar, entonces se retorna `NX-SYS-007` sin aplicar cambios.
  - Dado un producto válido del propio tenant, cuando se actualiza el precio, entonces `actualizado_en` se refresca automáticamente.
  - Dado un cambio de campo, cuando la actualización es exitosa, entonces se registra un diff en `auditoria_diffs` con el valor anterior y el nuevo.
  - Dado un payload parcial inválido, cuando se valida con Zod, entonces la operación se detiene con `NX-SYS-006` antes de llegar a la base de datos.

### 💡 Historia: Baja lógica de producto
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero dar de baja un producto sin eliminarlo físicamente para conservar el historial de ventas y auditoría asociado a ese producto.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action de soft delete de producto
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `eliminarProducto` en la ruta `src/services/productos/`
- **Módulo:** Gestión de Catálogo
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `eliminarProducto` en `src/services/productos/eliminarProducto.ts`.
  - [ ] Paso 2: Actualizar `eliminado_en = now()` en lugar de ejecutar `DELETE` físico.
  - [ ] Paso 3: Excluir el producto de índices activos (`WHERE eliminado_en IS NULL`) en las consultas de listado.
  - [ ] Paso 4: Registrar el evento en `auditoria_diffs` y devolver `NX-PRD-006` ante intentos de editar un producto ya dado de baja.
- **Criterios de Aceptación (BDD):**
  - Dado un producto activo, cuando se ejecuta `eliminarProducto`, entonces se actualiza `eliminado_en` con el timestamp actual sin ejecutar `DELETE` físico.
  - Dado un producto dado de baja, cuando se consulta el listado paginado, entonces no aparece en los resultados por el filtro `WHERE eliminado_en IS NULL`.
  - Dado un producto ya eliminado lógicamente, cuando se intenta editarlo, entonces se retorna el error `NX-PRD-006`.
  - Dado el registro de baja lógica, cuando se completa, entonces queda trazado en `auditoria_diffs` con el campo `eliminado_en` como valor nuevo.

### 💡 Historia: Carga masiva de productos vía Excel
- **Prioridad:** Alta
- **Estimación:** 8 SP
- **Descripción / CA Funcionales:** Como comerciante quiero importar mi catálogo mediante una plantilla Excel estructurada para dar de alta muchos productos de una sola vez sin cargarlos uno por uno.

#### Actividades Técnicas Desglosadas:
##### 1. Route Handler de importación de catálogo por Excel
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `importarProductos` en la ruta `app/api/productos/importar/`
- **Módulo:** Gestión de Catálogo
- **Etiquetas:** API, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/api/productos/importar/route.ts` que reciba el archivo Excel vía `FormData`.
  - [ ] Paso 2: Parsear el archivo en servidor y validar cada fila contra el esquema Zod de producto.
  - [ ] Paso 3: Ejecutar inserts en lote respetando el límite de `limite_sku`, retornando `NX-PRD-007` en filas con formato inválido.
  - [ ] Paso 4: Devolver un reporte de filas exitosas y rechazadas al cliente.
- **Criterios de Aceptación (BDD):**
  - Dado un archivo Excel con formato correcto, cuando se sube al endpoint, entonces se insertan los productos válidos respetando el `limite_sku` del tenant.
  - Dado un archivo con formato no estructurado o columnas faltantes, cuando se procesa, entonces se retorna `NX-PRD-007` con detalle de la plantilla esperada.
  - Dado un archivo con filas mixtas (válidas e inválidas), cuando se procesa, entonces el sistema retorna un reporte diferenciado de filas exitosas y rechazadas.
  - Dado un archivo que excede el `limite_sku` disponible, cuando se procesa, entonces las filas excedentes se rechazan con el código correspondiente sin bloquear las válidas dentro del límite.

### 💡 Historia: Compresión automática de imágenes de producto
- **Prioridad:** Media
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como comerciante quiero que las imágenes que subo se compriman automáticamente a WebP para que mi catálogo cargue rápido sin tener que preocuparme por el formato del archivo.

#### Actividades Técnicas Desglosadas:
##### 1. Pipeline de compresión WebP vía Cloudinary
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `comprimirImagen` en la ruta `src/services/imagenes/`
- **Módulo:** Gestión de Catálogo
- **Etiquetas:** BACKEND, API
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `src/services/imagenes/comprimirImagen.ts` que suba la imagen a Cloudinary con transformación `format: webp`, `width: 1080`, peso objetivo ~70KB.
  - [ ] Paso 2: Crear `src/repositories/imagenesRepository.ts` para abstraer el SDK de Cloudinary del componente de UI (Patrón Repository).
  - [ ] Paso 3: Manejar el error de subida devolviendo `NX-PRD-005`.
  - [ ] Paso 4: Validar el peso final de la imagen resultante en pruebas de integración.
- **Criterios de Aceptación (BDD):**
  - Dado una imagen JPG subida por el usuario, cuando se procesa, entonces se almacena en formato WebP con un peso objetivo cercano a 70 KB y máximo 1080px.
  - Dado un fallo de la API de Cloudinary, cuando ocurre durante la subida, entonces se retorna el error `NX-PRD-005` sin romper el flujo de alta de producto.
  - Dado el componente de UI que invoca la compresión, cuando se revisa el código, entonces no importa directamente el SDK de Cloudinary (pasa por `imagenesRepository.ts`).
  - Dado el resultado de la compresión, cuando se valida en pruebas de integración, entonces el peso final no supera significativamente el objetivo de 70 KB.

### 💡 Historia: Listado paginado de productos
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero ver mi catálogo en un listado paginado para navegar cómodamente incluso cuando tengo cientos o miles de productos.

#### Actividades Técnicas Desglosadas:
##### 1. Query paginada server-side de productos
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `obtenerProductosPaginados` en la ruta `src/repositories/`
- **Módulo:** Gestión de Catálogo
- **Etiquetas:** BACKEND, BD, FRONTEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Implementar `obtenerProductosPaginados` en `src/repositories/productosRepository.ts` usando `.range(offset, offset+limit-1)`.
  - [ ] Paso 2: Filtrar siempre por `eliminado_en IS NULL`, prohibiendo `SELECT *` sin `LIMIT`.
  - [ ] Paso 3: Consumir la query en `app/(app)/productos/page.tsx` usando TanStack Query para caché en cliente.
  - [ ] Paso 4: Validar performance con 1000+ productos sembrados en el tenant de prueba.
- **Criterios de Aceptación (BDD):**
  - Dado un catálogo con más de 1000 productos, cuando se consulta el listado, entonces la query utiliza `.range()` y nunca ejecuta `SELECT *` sin `LIMIT`.
  - Dado un producto dado de baja lógica, cuando se ejecuta la query paginada, entonces no aparece en los resultados.
  - Dado el consumo en `app/(app)/productos/page.tsx`, cuando se navega entre páginas, entonces TanStack Query cachea los resultados evitando refetch innecesario.
  - Dado un tenant con 50 productos, cuando se solicita la página 2 con `limit=25`, entonces retorna exactamente los productos del rango 26-50.

### 💡 Historia: Aviso discreto al 90% del límite de SKU
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero recibir un aviso discreto en el panel cuando alcance el 90% de mi límite de SKU contratado para anticipar la necesidad de ampliar mi plan.

#### Actividades Técnicas Desglosadas:
##### 1. Cálculo de porcentaje de uso de SKU y banda de aviso
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `calcularPorcentajeUsoSku` en la ruta `src/lib/dominio/productos/`
- **Módulo:** Gestión de Catálogo
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Implementar función pura `calcularPorcentajeUsoSku(activos, limite)` en `src/lib/dominio/productos/calcularPorcentajeUsoSku.ts`.
  - [ ] Paso 2: Cubrir la función con pruebas unitarias Vitest (TDD) para casos límite (0%, 89%, 90%, 100%).
  - [ ] Paso 3: Exponer el cálculo vía Server Component en `app/(app)/dashboard/page.tsx`.
  - [ ] Paso 4: Renderizar banda `bg-slate-800`/`text-slate-400` (código `NX-PRD-008`) cuando el porcentaje esté entre 90% y 100%.
- **Criterios de Aceptación (BDD):**
  - Dado 900 productos activos sobre un límite de 1000, cuando se calcula el porcentaje, entonces `calcularPorcentajeUsoSku` retorna 90 exactamente.
  - Dado un porcentaje de uso del 90%, cuando se renderiza el dashboard, entonces se muestra la banda `bg-slate-800`/`text-slate-400` con el código `NX-PRD-008`.
  - Dado un porcentaje de uso menor al 90%, cuando se renderiza el dashboard, entonces no se muestra ninguna banda de aviso.
  - Dado pruebas unitarias Vitest, cuando se ejecutan sobre casos límite (0%, 89%, 90%, 100%), entonces todas pasan sin excepciones.

### 💡 Historia: Bloqueo de alta al 100% del límite con oferta de ampliación
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como comerciante quiero que se bloquee la creación de nuevos productos al llegar al 100% de mi límite y se me ofrezca un Pack de Catálogo Extendido para poder seguir creciendo sin cargos sorpresa.

#### Actividades Técnicas Desglosadas:
##### 1. Validación de bloqueo de alta al alcanzar limite_sku
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `ModalBloqueoSku` en la ruta `src/components/productos/`
- **Módulo:** Gestión de Catálogo
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: En `crearProducto`, agregar verificación previa que compare el conteo activo contra `limite_sku`.
  - [ ] Paso 2: Retornar `NX-PRD-001` sin ejecutar el insert si el límite fue alcanzado.
  - [ ] Paso 3: Crear `ModalBloqueoSku.tsx` con acento `text-blue-500` ofreciendo el Pack de Catálogo Extendido.
  - [ ] Paso 4: Derivar el CTA del modal a `/configuracion/modulos`.
- **Criterios de Aceptación (BDD):**
  - Dado un comercio con 1000 productos activos sobre un límite de 1000, cuando se intenta crear un nuevo producto, entonces se retorna `NX-PRD-001` sin insertar el registro.
  - Dado el bloqueo activado, cuando se renderiza el formulario de alta, entonces se muestra el `ModalBloqueoSku` con acento `text-blue-500` (no rojo punitivo).
  - Dado el modal de bloqueo, cuando el usuario hace clic en el CTA, entonces es dirigido a `/configuracion/modulos`.
  - Dado un comercio que amplía su `limite_sku` a 2000, cuando vuelve a intentar el alta, entonces la operación se completa exitosamente.

---

## 📁 Épica: Épica 5: Control de Stock
*Descripción:* Registro de movimientos de entrada y salida de stock por producto, actualización en tiempo real del saldo disponible, validaciones que impiden stock negativo, y trazabilidad de cada movimiento vinculado a usuario_id y cliente_id.

### 💡 Historia: Registro de entrada de stock
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero registrar una entrada de stock por producto para reflejar mercadería recibida y mantener actualizado el saldo disponible.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action registrarEntradaStock
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `registrarEntradaStock` en la ruta `src/services/stock/`
- **Módulo:** Control de Stock
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `registrarEntradaStock` en `src/services/stock/registrarEntradaStock.ts` con DTO Zod (`producto_id`, `cantidad > 0`).
  - [ ] Paso 2: Calcular `saldo_resultante` dentro de una función RPC de Supabase.
  - [ ] Paso 3: Insertar en `movimientos_stock` con `tipo = 'entrada'` y actualizar `productos.stock_actual`.
  - [ ] Paso 4: Verificar que la operación quede auditada en `auditoria_diffs`.
- **Criterios de Aceptación (BDD):**
  - Dado un producto con `stock_actual = 50`, cuando se registra una entrada de 20 unidades, entonces `saldo_resultante` calculado es 70 y `productos.stock_actual` se actualiza.
  - Dado una cantidad igual o menor a cero, cuando se valida con Zod, entonces la Server Action rechaza la solicitud antes de tocar la base de datos.
  - Dado el registro exitoso de entrada, cuando se consulta `movimientos_stock`, entonces existe una fila con `tipo = 'entrada'` vinculada al `usuario_id` correcto.
  - Dado el movimiento registrado, cuando se consulta `auditoria_diffs`, entonces la operación queda trazada de forma asíncrona.

### 💡 Historia: Registro de salida de stock
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero registrar una salida de stock por producto para reflejar mermas, roturas u otros movimientos que no provienen de una venta.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action registrarSalidaStock con validación de saldo
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `registrarSalidaStock` en la ruta `src/services/stock/`
- **Módulo:** Control de Stock
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `registrarSalidaStock` en `src/services/stock/registrarSalidaStock.ts`.
  - [ ] Paso 2: Validar `cantidad <= stock_actual` antes de descontar, retornando `NX-PRD-004` si no alcanza.
  - [ ] Paso 3: Ejecutar la operación vía función RPC `fn_registrar_movimiento_stock` para garantizar atomicidad.
  - [ ] Paso 4: Insertar el movimiento con `tipo = 'salida'`.
- **Criterios de Aceptación (BDD):**
  - Dado un producto con `stock_actual = 10`, cuando se intenta registrar una salida de 15 unidades, entonces se retorna `NX-PRD-004` sin modificar el stock.
  - Dado un producto con `stock_actual = 10`, cuando se registra una salida de 5 unidades, entonces el nuevo `stock_actual` es 5 y queda reflejado en `movimientos_stock`.
  - Dado la operación ejecutada vía RPC `fn_registrar_movimiento_stock`, cuando ocurren dos solicitudes simultáneas sobre el mismo producto, entonces no se genera un stock negativo (concurrencia optimista).
  - Dado el resultado de la operación, cuando es exitosa, entonces `saldo_resultante` coincide exactamente con `stock_actual` post-actualización.

### 💡 Historia: Visualización de saldo de stock en tiempo real
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero ver el saldo actualizado de stock de cada producto en tiempo real para tomar decisiones de reposición con información confiable.

#### Actividades Técnicas Desglosadas:
##### 1. Vista de movimientos de stock con TanStack Query
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `MovimientosStock` en la ruta `app/(app)/stock/`
- **Módulo:** Control de Stock
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/(app)/stock/page.tsx` consultando `movimientos_stock` paginado por `producto_id` (`idx_movstock_producto`).
  - [ ] Paso 2: Integrar TanStack Query con invalidación tras cada mutación de venta o stock.
  - [ ] Paso 3: Mostrar cantidades y saldos con `font-mono` según el sistema de diseño.
  - [ ] Paso 4: Validar que el saldo se refleje sin recarga completa de la página.
- **Criterios de Aceptación (BDD):**
  - Dado un producto con múltiples movimientos, cuando se accede a `/stock`, entonces se listan paginados y ordenados por `creado_en DESC`.
  - Dado un nuevo movimiento de stock registrado, cuando ocurre, entonces la vista se actualiza automáticamente vía invalidación de TanStack Query sin recarga completa.
  - Dado los valores numéricos de cantidad y saldo, cuando se renderizan, entonces usan `font-mono` según el sistema de diseño.
  - Dado un tenant sin movimientos registrados, cuando accede a `/stock`, entonces se muestra un Empty State con borde `border-dashed` y CTA correspondiente.

### 💡 Historia: Validación de stock no negativo
- **Prioridad:** Alta
- **Estimación:** 2 SP
- **Descripción / CA Funcionales:** Como comerciante quiero que el sistema impida dejar el stock en negativo al registrar una salida para evitar inconsistencias en mi inventario.

#### Actividades Técnicas Desglosadas:
##### 1. Prueba unitaria y constraint de stock no negativo
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `calcularNuevoSaldo` en la ruta `src/lib/dominio/stock/`
- **Módulo:** Control de Stock
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Confirmar en migración el `CHECK (stock_actual >= 0)` sobre `productos`.
  - [ ] Paso 2: Implementar función pura `calcularNuevoSaldo(stockActual, cantidad, tipo)` en `src/lib/dominio/stock/calcularNuevoSaldo.ts`.
  - [ ] Paso 3: Escribir prueba unitaria Vitest que verifique el lanzamiento de error de dominio antes de llegar a la base de datos.
  - [ ] Paso 4: Validar el mensaje de error mapeado a `NX-PRD-004`.
- **Criterios de Aceptación (BDD):**
  - Dado el constraint `CHECK (stock_actual >= 0)` en la tabla `productos`, cuando se intenta forzar un valor negativo vía SQL directo, entonces la base de datos rechaza la operación.
  - Dado la función `calcularNuevoSaldo(stockActual, cantidad, tipo)`, cuando el resultado sería negativo, entonces lanza un error de dominio antes de llegar a la base de datos.
  - Dado pruebas unitarias Vitest, cuando se ejecutan con distintos escenarios de entrada/salida, entonces todas pasan incluyendo el caso límite de saldo exacto en cero.
  - Dado el error de dominio lanzado, cuando se propaga a la capa de Server Action, entonces se mapea correctamente a `NX-PRD-004`.

---

## 📁 Épica: Épica 6: Panel de Ventas / Mostrador
*Descripción:* Interfaz de caja interna para seleccionar productos, calcular el total de la venta, confirmar el cobro con control de idempotencia (idempotency_key) y concurrencia optimista para evitar duplicados, descuento automático de stock asociado a la venta y registro de venta_items.

### 💡 Historia: Selección de productos en el mostrador
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como cajero quiero buscar y seleccionar productos en el panel de ventas para armar el carrito de una venta en curso.

#### Actividades Técnicas Desglosadas:
##### 1. Componente de búsqueda y carrito en Panel de Ventas
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `BuscadorProductos` en la ruta `app/(app)/mostrador/`
- **Módulo:** Panel de Ventas
- **Etiquetas:** FRONTEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/(app)/mostrador/page.tsx` con componente cliente `BuscadorProductos.tsx` con búsqueda por `sku`/`nombre` y debounce.
  - [ ] Paso 2: Manejar el carrito con `useReducer` en estado local (sin persistencia en browser storage).
  - [ ] Paso 3: Dividir en subcomponentes `CarritoVenta.tsx` y `ResumenTotal.tsx` respetando el límite de 500-600 líneas por archivo.
  - [ ] Paso 4: Respetar áreas táctiles mínimas de 44x44px en botones de agregar/quitar producto.
- **Criterios de Aceptación (BDD):**
  - Dado el buscador de productos, cuando el usuario escribe un SKU o nombre, entonces los resultados se filtran con debounce sin disparar una consulta por cada tecla.
  - Dado un producto agregado al carrito, cuando se modifica la cantidad, entonces el estado local (`useReducer`) se actualiza sin persistir en `localStorage`/`sessionStorage`.
  - Dado el componente `BuscadorProductos.tsx`, cuando se revisa su tamaño, entonces no supera las 500-600 líneas (dividido en subcomponentes si es necesario).
  - Dado los botones de agregar/quitar producto del carrito, cuando se inspeccionan en mobile, entonces cumplen el área táctil mínima de 44x44px.

### 💡 Historia: Cálculo automático del total de la venta
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como cajero quiero que el sistema calcule automáticamente el total a cobrar según los productos y cantidades seleccionados para evitar errores manuales de suma.

#### Actividades Técnicas Desglosadas:
##### 1. Función pura de cálculo de total de venta
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `calcularTotalVenta` en la ruta `src/lib/dominio/ventas/`
- **Módulo:** Panel de Ventas
- **Etiquetas:** BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Implementar `calcularTotalVenta(items: VentaItem[])` como función pura sin efectos secundarios.
  - [ ] Paso 2: Escribir pruebas unitarias Vitest (TDD) para múltiples ítems, cantidades y redondeo con `numeric(12,2)`.
  - [ ] Paso 3: Consumir la función tanto en el cliente (previsualización del total) como en el servidor (validación final).
- **Criterios de Aceptación (BDD):**
  - Dado un arreglo de `venta_items` con distintas cantidades y precios, cuando se ejecuta `calcularTotalVenta`, entonces el resultado coincide con la suma exacta de subtotales redondeados a `numeric(12,2)`.
  - Dado un arreglo vacío de ítems, cuando se ejecuta la función, entonces retorna 0 sin lanzar excepción.
  - Dado pruebas unitarias Vitest bajo TDD, cuando se ejecutan sobre múltiples escenarios de redondeo, entonces todas pasan sin discrepancias de centavos.
  - Dado que la función no tiene efectos secundarios, cuando se invoca repetidamente con el mismo input, entonces siempre retorna el mismo output (pureza verificada).

### 💡 Historia: Confirmación de cobro con control de duplicados
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como cajero quiero confirmar el cobro de una venta con protección ante clics repetidos o fallas de red para que nunca se registre la misma venta dos veces.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action confirmarVenta con idempotency_key
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `confirmarVenta` en la ruta `src/services/ventas/`
- **Módulo:** Panel de Ventas
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `confirmarVenta` en `src/services/ventas/confirmarVenta.ts` recibiendo un `idempotency_key` generado en el primer clic del cliente.
  - [ ] Paso 2: Validar el payload con Zod e insertar aprovechando el `UNIQUE (idempotency_key)`.
  - [ ] Paso 3: Capturar el error de conflicto y devolver `NX-VTA-002` sin duplicar el registro.
  - [ ] Paso 4: Deshabilitar el botón de cobro en el cliente tras el primer clic.
- **Criterios de Aceptación (BDD):**
  - Dado un `idempotency_key` único, cuando se confirma una venta por primera vez, entonces se inserta correctamente en `ventas` con estado `confirmada`.
  - Dado el mismo `idempotency_key` enviado dos veces (doble clic o reintento de red), cuando se procesa la segunda solicitud, entonces se retorna `NX-VTA-002` sin duplicar el registro.
  - Dado el botón de cobro en la UI, cuando el usuario hace clic, entonces se deshabilita inmediatamente para prevenir múltiples envíos.
  - Dado un total de venta negativo o inconsistente, cuando se valida con Zod, entonces se retorna `NX-VTA-003` antes de ejecutar la RPC.

### 💡 Historia: Descuento automático de stock al confirmar venta
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero que al confirmarse una venta se descuente automáticamente el stock de los productos vendidos para no tener que hacerlo manualmente después.

#### Actividades Técnicas Desglosadas:
##### 1. Función RPC transaccional de venta con descuento de stock
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `fn_confirmar_venta` en la ruta `supabase/migrations/`
- **Módulo:** Panel de Ventas
- **Etiquetas:** BD, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear función RPC PostgreSQL `fn_confirmar_venta` que inserte `ventas`, `venta_items` y `movimientos_stock` (tipo `salida`) en una única transacción.
  - [ ] Paso 2: Aplicar bloqueo optimista sobre `productos.stock_actual` para prevenir condiciones de carrera.
  - [ ] Paso 3: Retornar `NX-VTA-001` si el stock resulta insuficiente en cualquier ítem.
  - [ ] Paso 4: Invocar la función desde `confirmarVenta` vía `Supabase:execute_sql` o cliente RPC.
- **Criterios de Aceptación (BDD):**
  - Dado un producto con stock suficiente, cuando se ejecuta `fn_confirmar_venta`, entonces se insertan `ventas`, `venta_items` y `movimientos_stock` en una sola transacción atómica.
  - Dado un producto con stock insuficiente en cualquier ítem del carrito, cuando se ejecuta la función, entonces se revierte toda la transacción y retorna `NX-VTA-001`.
  - Dado dos solicitudes simultáneas de venta sobre el mismo producto con stock límite, cuando se ejecutan en paralelo, entonces el bloqueo optimista previene que ambas tengan éxito si el stock no alcanza para ambas.
  - Dado el éxito de la transacción, cuando se consulta `movimientos_stock`, entonces existe una fila con `tipo = 'salida'` vinculada a `referencia_venta_id`.

---

## 📁 Épica: Épica 7: Módulo Catálogo Web (Vidriera y Pedido por WhatsApp)
*Descripción:* Publicación y despublicación individual de productos (publicado = true/false), personalización de identidad visual de la vidriera (logo, colores) según el sistema de diseño, vista pública sin autenticación con caché de Edge, ficha de producto con enlace directo a WhatsApp, y control de acceso condicionado al feature flag catalogo_web.

### 💡 Historia: Publicación y despublicación de productos
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero publicar o despublicar productos individuales de mi vidriera para controlar qué artículos ve el público en cada momento.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action alternarPublicacionProducto
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `alternarPublicacionProducto` en la ruta `src/services/catalogoWeb/`
- **Módulo:** Catálogo Web
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `alternarPublicacionProducto` en `src/services/catalogoWeb/alternarPublicacionProducto.ts` con DTO Zod para el flag `publicado`.
  - [ ] Paso 2: Verificar que el módulo `catalogo_web` esté activo en `tenant_modules`, retornando `NX-WEB-001` si no.
  - [ ] Paso 3: Validar con `NX-WEB-002` que el producto tenga nombre, precio e imagen antes de permitir `publicado = true`.
  - [ ] Paso 4: Registrar el cambio en `auditoria_diffs`.
- **Criterios de Aceptación (BDD):**
  - Dado un tenant sin el módulo `catalogo_web` activo, cuando intenta publicar un producto, entonces se retorna `NX-WEB-001`.
  - Dado un producto sin nombre, precio o imagen, cuando se intenta publicar, entonces se retorna `NX-WEB-002` sin cambiar el flag.
  - Dado un producto completo con todos los campos requeridos, cuando se publica, entonces `publicado` cambia a `true` y aparece en la vidriera pública.
  - Dado un producto publicado, cuando se despublica, entonces desaparece inmediatamente de la vista pública `/c/[clienteSlug]`.

### 💡 Historia: Personalización visual de la vidriera
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero personalizar el logo y los colores de mi vidriera dentro de los parámetros del sistema de diseño para reflejar la identidad de mi negocio.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action actualizarIdentidadVisual
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `actualizarIdentidadVisual` en la ruta `src/services/catalogoWeb/`
- **Módulo:** Catálogo Web
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `actualizarIdentidadVisual` con DTO Zod para `logo_url` y `color_primario`.
  - [ ] Paso 2: Sanitizar el color contra una lista permitida, excluyendo púrpura/violeta/índigo según el sistema de diseño.
  - [ ] Paso 3: Actualizar únicamente las columnas de personalización en `clientes` (nunca la fila completa).
  - [ ] Paso 4: Reflejar el cambio en la vista `app/(app)/catalogo-web/personalizacion/page.tsx`.
- **Criterios de Aceptación (BDD):**
  - Dado un color permitido dentro de la paleta del sistema de diseño, cuando se actualiza `color_primario`, entonces se guarda correctamente en `clientes`.
  - Dado un intento de establecer un color púrpura, violeta o índigo, cuando se valida, entonces la Server Action rechaza el valor conforme a las Directrices de Negación.
  - Dado la actualización de `logo_url`, cuando se guarda, entonces únicamente esa columna se modifica sin afectar el resto de la fila `clientes`.
  - Dado un comerciante de otro tenant, cuando intenta modificar la identidad visual de otro comercio, entonces la operación es rechazada por RLS/verificación de tenant.

### 💡 Historia: Consulta pública del catálogo sin autenticación
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como cliente final quiero navegar el catálogo publicado de un comercio sin necesidad de crear una cuenta para ver rápidamente los productos disponibles.

#### Actividades Técnicas Desglosadas:
##### 1. Página estática con ISR de vidriera pública
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `VidrieraPublica` en la ruta `app/(publico)/c/[clienteSlug]/`
- **Módulo:** Catálogo Web
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/(publico)/c/[clienteSlug]/page.tsx` como Server Component con `revalidate` (Next.js Revalidation).
  - [ ] Paso 2: Consultar productos vía la política RLS `productos_lectura_publica` (`publicado = true`).
  - [ ] Paso 3: Aplicar caché de Edge para minimizar hits transaccionales a PostgreSQL.
  - [ ] Paso 4: Mostrar `NX-WEB-004` si la vidriera no existe o el comercio está suspendido.
- **Criterios de Aceptación (BDD):**
  - Dado un `clienteSlug` válido con productos publicados, cuando se accede a `/c/[clienteSlug]`, entonces se muestran únicamente los productos con `publicado = true` y `eliminado_en IS NULL`.
  - Dado un cambio en un producto publicado, cuando pasa el tiempo de `revalidate`, entonces la vista pública refleja el cambio sin necesidad de rebuild manual.
  - Dado un `clienteSlug` inexistente o de un comercio suspendido, cuando se accede, entonces se muestra `NX-WEB-004` con página 404.
  - Dado múltiples accesos concurrentes a la misma vidriera, cuando se sirven desde caché de Edge, entonces se minimizan los hits transaccionales a PostgreSQL.

### 💡 Historia: Enlace directo a WhatsApp desde ficha de producto
- **Prioridad:** Alta
- **Estimación:** 2 SP
- **Descripción / CA Funcionales:** Como cliente final quiero iniciar una consulta por WhatsApp directamente desde la ficha de un producto para pedir información o realizar el pedido sin pasos adicionales.

#### Actividades Técnicas Desglosadas:
##### 1. Componente de CTA WhatsApp en ficha de producto
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `CtaWhatsapp` en la ruta `app/(publico)/c/[clienteSlug]/producto/[productoId]/`
- **Módulo:** Catálogo Web
- **Etiquetas:** FRONTEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/(publico)/c/[clienteSlug]/producto/[productoId]/page.tsx` con la ficha del producto.
  - [ ] Paso 2: Construir el enlace `https://wa.me/{telefono_whatsapp}?text=...` con el nombre del producto pre-cargado.
  - [ ] Paso 3: Respetar el área táctil mínima de 44x44px del sistema de diseño para el botón CTA.
  - [ ] Paso 4: Disparar el evento de PostHog `clic_whatsapp` al hacer clic.
- **Criterios de Aceptación (BDD):**
  - Dado un producto publicado, cuando se accede a su ficha, entonces el botón de WhatsApp construye el enlace `https://wa.me/{telefono}` con el nombre del producto pre-cargado en el mensaje.
  - Dado el botón CTA, cuando se inspecciona en mobile, entonces cumple el área táctil mínima de 44x44px.
  - Dado un clic en el botón, cuando ocurre, entonces se dispara el evento `clic_whatsapp` en PostHog con el `cliente_id` como propiedad.
  - Dado un comercio sin `telefono_whatsapp` configurado, cuando se renderiza la ficha, entonces el CTA no se muestra o indica que el canal no está disponible.

---

## 📁 Épica: Épica 8: Módulo Carga de Productos con IA (Alta por Visión)
*Descripción:* Subida de foto de etiqueta para autocompletar nombre, precio y categoría mediante integración con OpenAI (gpt-4o-mini), registro de cada carga en cargas_ia, visualización del contador de consultas mensuales consumidas sobre la cuota de 40, bloqueo amigable al agotar la cuota con oferta de paquete de recarga, condicionado al feature flag carga_ia.

### 💡 Historia: Alta de producto por foto de etiqueta
- **Prioridad:** Alta
- **Estimación:** 8 SP
- **Descripción / CA Funcionales:** Como comerciante quiero subir una foto de la etiqueta de un producto para que la IA autocomplete nombre, precio y categoría y así agilizar la carga de catálogo.

#### Actividades Técnicas Desglosadas:
##### 1. Route Handler de procesamiento de imagen con OpenAI Vision
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `procesarCargaIa` en la ruta `app/api/carga-ia/`
- **Módulo:** Carga con IA
- **Etiquetas:** API, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/api/carga-ia/route.ts` protegido con rate limiting (`@upstash/ratelimit`).
  - [ ] Paso 2: Enviar la imagen a la API de OpenAI `gpt-4o-mini` para extraer `nombre`, `precio` y `categoria`.
  - [ ] Paso 3: Validar el resultado antes de prellenar el formulario de alta manual.
  - [ ] Paso 4: Registrar la operación en `cargas_ia` con `resultado_extraido` en `jsonb`.
- **Criterios de Aceptación (BDD):**
  - Dado un tenant con el módulo `carga_ia` activo y cuota disponible, cuando sube una foto de etiqueta, entonces recibe una respuesta con `nombre`, `precio` y `categoria` sugeridos.
  - Dado un tenant sin el módulo `carga_ia` activo, cuando intenta usar la función, entonces se retorna `NX-IA-001`.
  - Dado una imagen ilegible o corrupta, cuando se envía a OpenAI, entonces se retorna `NX-IA-003` ofreciendo la alternancia al alta manual.
  - Dado el procesamiento exitoso, cuando se completa, entonces se registra en `cargas_ia` con `resultado_extraido` en formato `jsonb`.

### 💡 Historia: Visualización del contador de cargas por IA
- **Prioridad:** Media
- **Estimación:** 2 SP
- **Descripción / CA Funcionales:** Como comerciante quiero ver cuántas cargas por IA llevo consumidas sobre mi cuota mensual para planificar cuándo usar esta función.

#### Actividades Técnicas Desglosadas:
##### 1. Componente de contador de cuota de IA
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `ContadorCuotaIA` en la ruta `app/(app)/productos/carga-ia/`
- **Módulo:** Carga con IA
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Implementar `obtenerUsoCuotaIA` en `src/repositories/cargasIaRepository.ts` contando filas del `ia_periodo_actual` vigente.
  - [ ] Paso 2: Renderizar el contador en `app/(app)/productos/carga-ia/page.tsx` usando `font-mono`.
  - [ ] Paso 3: Mostrar el consumo como `usadas/cuota_mensual_ia` de forma clara y sin tecnicismos.
- **Criterios de Aceptación (BDD):**
  - Dado un tenant con 34 cargas usadas de una cuota de 40, cuando se visualiza el contador, entonces muestra '34/40' usando `font-mono`.
  - Dado el inicio de un nuevo mes calendario, cuando se recalcula `ia_periodo_actual`, entonces el contador se reinicia a 0/40.
  - Dado el conteo de `cargas_ia`, cuando se consulta, entonces se filtra correctamente por el `ia_periodo_actual` vigente del tenant.
  - Dado un tenant sin el módulo `carga_ia` activo, cuando se intenta ver el contador, entonces no se muestra o indica que el módulo no está contratado.

### 💡 Historia: Bloqueo y oferta de recarga al agotar la cuota de IA
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero ser notificado de forma amigable al agotar mi cuota mensual de IA y poder contratar un paquete de recarga para seguir usando la función sin esperar al próximo mes.

#### Actividades Técnicas Desglosadas:
##### 1. Validación de cuota mensual de IA antes de invocar OpenAI
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `validarCuotaIa` en la ruta `app/api/carga-ia/`
- **Módulo:** Carga con IA
- **Etiquetas:** API, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: En `app/api/carga-ia/route.ts`, verificar `ia_consultas_usadas >= cuota_mensual_ia` antes de invocar OpenAI.
  - [ ] Paso 2: Retornar `NX-IA-002` con estado 429 si la cuota está agotada, evitando el costo de la API.
  - [ ] Paso 3: Deshabilitar el botón 'Cargar foto con IA' en el cliente cuando la cuota esté al 100%.
  - [ ] Paso 4: Mostrar el CTA de contratación del paquete de recarga en el modal.
- **Criterios de Aceptación (BDD):**
  - Dado un tenant con `ia_consultas_usadas = 40` sobre `cuota_mensual_ia = 40`, cuando intenta usar la carga por IA, entonces se retorna `NX-IA-002` sin invocar la API de OpenAI (evitando costo innecesario).
  - Dado el botón 'Cargar foto con IA' en la UI, cuando la cuota está agotada, entonces aparece deshabilitado con el mensaje amigable correspondiente.
  - Dado el modal de cuota agotada, cuando se muestra, entonces ofrece el CTA de contratación de paquete de recarga (+40 consultas).
  - Dado un tenant con cuota disponible, cuando realiza una carga exitosa, entonces `ia_consultas_usadas` se incrementa en 1.

---

## 📁 Épica: Épica 9: Módulo Clientes y Cuentas Corrientes (Fiado)
*Descripción:* Registro de clientes finales con datos básicos de contacto, asociación de ventas a cuenta corriente incrementando el saldo_deudor, registro de pagos parciales o totales que reducen la deuda, consulta del estado de cuenta por cliente, condicionado al feature flag fiados.

### 💡 Historia: Registro de cliente final
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero registrar los datos básicos de contacto de mis clientes habituales para poder ofrecerles cuenta corriente.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action crearClienteFinal
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `crearClienteFinal` en la ruta `src/services/fiados/`
- **Módulo:** Clientes y Fiados
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `crearClienteFinal` con DTO Zod (`nombre`, `telefono` opcional).
  - [ ] Paso 2: Verificar que el módulo `fiados` esté activo en `tenant_modules`, retornando `NX-FIA-001` si no.
  - [ ] Paso 3: Insertar en `clientes_finales` con `saldo_deudor = 0` por defecto.
  - [ ] Paso 4: Validar duplicados de contacto retornando `NX-FIA-005`.
- **Criterios de Aceptación (BDD):**
  - Dado un tenant con el módulo `fiados` activo, cuando registra un cliente final con datos válidos, entonces se inserta en `clientes_finales` con `saldo_deudor = 0`.
  - Dado un tenant sin el módulo `fiados` activo, cuando intenta registrar un cliente final, entonces se retorna `NX-FIA-001`.
  - Dado un cliente final con los mismos datos de contacto que uno ya existente, cuando se intenta crear, entonces se retorna `NX-FIA-005`.
  - Dado el alta exitosa, cuando se consulta el listado de `/clientes`, entonces el nuevo cliente final aparece correctamente.

### 💡 Historia: Venta asociada a cuenta corriente
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como comerciante quiero asociar una venta a la cuenta corriente de un cliente registrado para que su saldo deudor se actualice automáticamente.

#### Actividades Técnicas Desglosadas:
##### 1. Extensión de fn_confirmar_venta para cargo a cuenta corriente
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `fn_confirmar_venta_fiado` en la ruta `supabase/migrations/`
- **Módulo:** Clientes y Fiados
- **Etiquetas:** BD, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Extender `fn_confirmar_venta` para aceptar `cliente_final_id` opcional.
  - [ ] Paso 2: Cuando esté presente, insertar en `movimientos_cuenta_corriente` con `tipo = 'cargo'` dentro de la misma transacción.
  - [ ] Paso 3: Actualizar `clientes_finales.saldo_deudor` de forma atómica junto con la venta.
  - [ ] Paso 4: Verificar que la operación falle completa si cualquier paso interno falla.
- **Criterios de Aceptación (BDD):**
  - Dado un `cliente_final_id` presente en la venta, cuando se ejecuta `fn_confirmar_venta`, entonces se inserta un movimiento `tipo = 'cargo'` en `movimientos_cuenta_corriente` dentro de la misma transacción.
  - Dado el cargo registrado, cuando se completa, entonces `clientes_finales.saldo_deudor` se incrementa exactamente en el monto total de la venta.
  - Dado un fallo en cualquier paso de la transacción (ej. stock insuficiente), cuando ocurre, entonces no se genera ningún cargo parcial en la cuenta corriente (atomicidad).
  - Dado una venta sin `cliente_final_id` (venta de contado), cuando se ejecuta la función, entonces no se genera ningún movimiento de cuenta corriente.

### 💡 Historia: Registro de pagos parciales o totales
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero registrar pagos parciales o totales de un cliente para reducir su saldo deudor a medida que va cancelando la cuenta.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action registrarPagoCuentaCorriente
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `registrarPagoCuentaCorriente` en la ruta `src/services/fiados/`
- **Módulo:** Clientes y Fiados
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `registrarPagoCuentaCorriente` con DTO Zod (`monto > 0`).
  - [ ] Paso 2: Validar que `monto <= saldo_deudor`, retornando `NX-FIA-003` en caso contrario.
  - [ ] Paso 3: Insertar en `movimientos_cuenta_corriente` con `tipo = 'pago'` y `venta_id = NULL`.
  - [ ] Paso 4: Actualizar el `saldo_deudor` del cliente final.
- **Criterios de Aceptación (BDD):**
  - Dado un cliente final con `saldo_deudor = 1000`, cuando se registra un pago de 400, entonces el nuevo saldo es 600 y se inserta un movimiento `tipo = 'pago'`.
  - Dado un intento de pago con `monto` mayor al `saldo_deudor` actual, cuando se valida, entonces se retorna `NX-FIA-003` sin aplicar el pago.
  - Dado un `monto` igual o menor a cero, cuando se valida con Zod, entonces se rechaza con `NX-FIA-004`.
  - Dado un pago manual registrado, cuando se consulta el movimiento, entonces `venta_id` es `NULL` diferenciándolo de un cargo por venta.

### 💡 Historia: Consulta de estado de cuenta corriente
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero consultar el estado de cuenta de un cliente con su historial de cargos y pagos para saber cuánto me debe en cualquier momento.

#### Actividades Técnicas Desglosadas:
##### 1. Vista de historial de cuenta corriente por cliente
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `EstadoCuentaCorriente` en la ruta `app/(app)/clientes/[clienteFinalId]/`
- **Módulo:** Clientes y Fiados
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/(app)/clientes/[clienteFinalId]/page.tsx` consultando `movimientos_cuenta_corriente` paginado por `idx_movcc_clientefinal`.
  - [ ] Paso 2: Mostrar cargos y pagos en orden cronológico con `font-mono` para los montos.
  - [ ] Paso 3: Mostrar el `saldo_deudor` actual como resumen destacado.
- **Criterios de Aceptación (BDD):**
  - Dado un cliente final con múltiples movimientos, cuando se accede a su detalle, entonces se listan cargos y pagos ordenados cronológicamente.
  - Dado el `saldo_deudor` actual, cuando se visualiza en la vista, entonces coincide exactamente con la suma de cargos menos pagos históricos.
  - Dado los montos mostrados, cuando se renderizan, entonces usan `font-mono` según el sistema de diseño.
  - Dado un cliente final de otro tenant, cuando se intenta acceder a su detalle vía URL directa, entonces se retorna `NX-FIA-002` o `NX-SYS-007`.

---

## 📁 Épica: Épica 10: Módulo Devoluciones y Notas de Crédito
*Descripción:* Registro de devolución total o parcial de una venta confirmada, generación de nota de crédito asociada sin alterar el registro original de la venta, reintegro automático del stock del producto devuelto, y actualización del estado de la venta, condicionado al feature flag devoluciones.

### 💡 Historia: Registro de devolución de venta
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como comerciante quiero registrar la devolución total o parcial de una venta confirmada para reflejar correctamente los productos que el cliente devolvió.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action registrarDevolucion
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `registrarDevolucion` en la ruta `src/services/devoluciones/`
- **Módulo:** Devoluciones
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `registrarDevolucion` validando con Zod los `venta_item_id` y cantidades contra lo vendido (`NX-DEV-002`).
  - [ ] Paso 2: Verificar que el módulo `devoluciones` esté activo, retornando `NX-DEV-001` si no.
  - [ ] Paso 3: Insertar `devoluciones` y `devolucion_items` en una función RPC transaccional.
  - [ ] Paso 4: Actualizar el `estado` de la venta a `devuelta_parcial` o `devuelta_total` según corresponda.
- **Criterios de Aceptación (BDD):**
  - Dado un tenant con el módulo `devoluciones` activo, cuando registra una devolución parcial válida, entonces se crea la fila en `devoluciones` con el `monto_total` calculado correctamente.
  - Dado un intento de devolver más unidades de las vendidas originalmente en un `venta_item`, cuando se valida, entonces se retorna `NX-DEV-002`.
  - Dado una venta ya devuelta por completo, cuando se intenta registrar otra devolución sobre ella, entonces se retorna `NX-DEV-003`.
  - Dado un tenant sin el módulo `devoluciones` activo, cuando intenta registrar una devolución, entonces se retorna `NX-DEV-001`.

### 💡 Historia: Generación de nota de crédito
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero que se genere automáticamente una nota de crédito al procesar una devolución sin alterar el registro original de la venta.

#### Actividades Técnicas Desglosadas:
##### 1. Función RPC de generación de nota de crédito
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `fn_generar_nota_credito` en la ruta `supabase/migrations/`
- **Módulo:** Devoluciones
- **Etiquetas:** BD, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Extender la RPC de devolución para insertar automáticamente en `notas_credito`.
  - [ ] Paso 2: Generar `numero_comprobante` secuencial (ej. `NC-{cliente_id_corto}-{correlativo}`).
  - [ ] Paso 3: Respetar `UNIQUE (devolucion_id)` y `UNIQUE (numero_comprobante)`.
  - [ ] Paso 4: Confirmar que el registro original de `ventas` no se altera ni se elimina.
- **Criterios de Aceptación (BDD):**
  - Dado una devolución registrada exitosamente, cuando se ejecuta la RPC, entonces se genera automáticamente una fila en `notas_credito` con `numero_comprobante` único.
  - Dado el registro original de la venta, cuando se genera la nota de crédito, entonces la venta original permanece sin alteraciones (excepto el campo `estado`).
  - Dado un intento de generar dos notas de crédito para la misma `devolucion_id`, cuando ocurre, entonces la restricción `UNIQUE(devolucion_id)` lo previene.
  - Dado un fallo en la generación de la nota, cuando ocurre, entonces se retorna `NX-DEV-004` sin dejar la devolución en estado inconsistente.

### 💡 Historia: Reintegro automático de stock por devolución
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero que el stock del producto devuelto se reintegre automáticamente para no tener que ajustarlo manualmente después de cada devolución.

#### Actividades Técnicas Desglosadas:
##### 1. Reintegro de stock dentro de la transacción de devolución
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `fn_reintegro_stock_devolucion` en la ruta `supabase/migrations/`
- **Módulo:** Devoluciones
- **Etiquetas:** BD, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: En la misma función RPC de devolución, insertar en `movimientos_stock` con `tipo = 'entrada'` y `referencia_devolucion_id`.
  - [ ] Paso 2: Actualizar `productos.stock_actual` por cada `devolucion_item`.
  - [ ] Paso 3: Garantizar atomicidad con la creación de la nota de crédito (todo o nada dentro de la misma transacción).
- **Criterios de Aceptación (BDD):**
  - Dado un `devolucion_item` con cantidad de 3 unidades, cuando se procesa la devolución, entonces `productos.stock_actual` se incrementa en 3 dentro de la misma transacción.
  - Dado el reintegro de stock, cuando se consulta `movimientos_stock`, entonces existe una fila `tipo = 'entrada'` con `referencia_devolucion_id` correspondiente.
  - Dado un fallo en la generación de la nota de crédito, cuando ocurre dentro de la misma transacción, entonces el reintegro de stock también se revierte (atomicidad completa).
  - Dado múltiples ítems en una devolución, cuando se procesan, entonces el stock de cada producto se reintegra de forma independiente y correcta.

---

## 📁 Épica: Épica 11: Módulo Bot Estático de WhatsApp
*Descripción:* Configuración de mensajes automáticos estáticos (horarios, ubicación, catálogo) activables desde el panel del comerciante, recepción y respuesta automática al cliente final vía webhook entrante, condicionado al feature flag bot_whatsapp.

### 💡 Historia: Configuración de mensajes automáticos del bot
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero configurar respuestas automáticas de horarios, ubicación y catálogo para que mis clientes reciban información básica aunque no pueda atender en el momento.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action actualizarConfiguracionBot
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `actualizarConfiguracionBot` en la ruta `src/services/botWhatsapp/`
- **Módulo:** Bot de WhatsApp
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `actualizarConfiguracionBot` con DTO Zod que exija al menos un mensaje no vacío antes de `activo = true` (`NX-BOT-002`).
  - [ ] Paso 2: Ejecutar upsert en `configuracion_bot_whatsapp` usando `cliente_id` como PK.
  - [ ] Paso 3: Verificar que el módulo `bot_whatsapp` esté activo antes de permitir la edición.
- **Criterios de Aceptación (BDD):**
  - Dado un tenant con el módulo `bot_whatsapp` activo, cuando configura al menos un mensaje, entonces puede activar el bot (`activo = true`).
  - Dado un intento de activar el bot sin ningún mensaje configurado, cuando se valida, entonces se retorna `NX-BOT-002`.
  - Dado la configuración exitosa, cuando se guarda, entonces se ejecuta un upsert sobre `configuracion_bot_whatsapp` usando `cliente_id` como PK sin duplicar filas.
  - Dado un tenant sin el módulo `bot_whatsapp` activo, cuando intenta acceder a la configuración, entonces se retorna `NX-BOT-001`.

### 💡 Historia: Respuesta automática al cliente final
- **Prioridad:** Media
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como cliente final quiero recibir una respuesta automática al escribir al WhatsApp del comercio para obtener información inmediata sin esperar a que un humano esté disponible.

#### Actividades Técnicas Desglosadas:
##### 1. Webhook de recepción de mensajes de WhatsApp
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `webhookWhatsapp` en la ruta `app/api/webhooks/whatsapp/`
- **Módulo:** Bot de WhatsApp
- **Etiquetas:** API, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/api/webhooks/whatsapp/route.ts` que reciba el evento entrante y valide la firma del proveedor.
  - [ ] Paso 2: Buscar `configuracion_bot_whatsapp` por el número de destino del comercio.
  - [ ] Paso 3: Devolver el mensaje estático correspondiente al cliente final.
  - [ ] Paso 4: Registrar fallos con `NX-BOT-003` sin bloquear el uso del panel del comerciante.
- **Criterios de Aceptación (BDD):**
  - Dado un mensaje entrante válido de un cliente final, cuando llega al webhook, entonces se responde con el `mensaje_catalogo`, `mensaje_horarios` o `mensaje_ubicacion` configurado.
  - Dado una firma de webhook inválida, cuando se recibe la solicitud, entonces se rechaza sin procesar el mensaje.
  - Dado un fallo temporal en el procesamiento, cuando ocurre, entonces se registra `NX-BOT-003` sin afectar el panel del comerciante.
  - Dado un comercio con el bot desactivado, cuando recibe un mensaje entrante, entonces no se envía ninguna respuesta automática.

---

## 📁 Épica: Épica 12: Auditoría, Trazabilidad y Manejo de Errores
*Descripción:* Registro asíncrono en background de todo cambio en entidades críticas como diff (campo modificado, valor anterior, valor nuevo, usuario_id, cliente_id, timestamp) en auditoria_diffs, mapeo de todos los errores del sistema a códigos normalizados de ERRORS.md con mensajes claros orientados a la solución, captura de errores técnicos en Sentry sin exponer datos sensibles, y separación de métricas de negocio en PostHog.

### 💡 Historia: Registro asíncrono de diffs de auditoría
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como administrador NODEXA quiero que toda alta, modificación o baja crítica quede registrada como diff en background para poder auditar cambios sin afectar el rendimiento de la operación.

#### Actividades Técnicas Desglosadas:
##### 1. Helper de auditoría asíncrona con after()
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `registrarDiff` en la ruta `src/lib/auditoria/`
- **Módulo:** Trazabilidad y Auditoría
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `src/lib/auditoria/registrarDiff.ts` utilizando `after()` de Next.js 15.
  - [ ] Paso 2: Insertar en `auditoria_diffs` (campo, valor anterior, valor nuevo, `usuario_id`, `cliente_id`, timestamp) sin bloquear la respuesta.
  - [ ] Paso 3: Integrarlo en `actualizarProducto`, `confirmarVenta` y `registrarDevolucion`.
  - [ ] Paso 4: Validar en pruebas de integración que la respuesta al usuario no se ve retrasada por el registro del diff.
- **Criterios de Aceptación (BDD):**
  - Dado una mutación crítica ejecutada (ej. `actualizarProducto`), cuando se completa, entonces la respuesta al usuario no se retrasa por el registro del diff (verificado con medición de latencia).
  - Dado el uso de `after()` de Next.js 15, cuando se ejecuta la Server Action, entonces el insert en `auditoria_diffs` ocurre después de haber respondido al cliente.
  - Dado un diff registrado, cuando se consulta, entonces contiene `campo_modificado`, `valor_anterior`, `valor_nuevo`, `usuario_id`, `cliente_id` y `timestamp` completos.
  - Dado un fallo en el registro asíncrono del diff, cuando ocurre, entonces no afecta ni revierte la transacción principal ya confirmada.

### 💡 Historia: Mapeo de errores a mensajes normalizados
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como usuario del sistema quiero ver siempre un mensaje claro y orientado a la solución cuando ocurre un error para entender qué pasó sin ver detalles técnicos.

#### Actividades Técnicas Desglosadas:
##### 1. Capa de manejo de errores normalizados por ERRORS.md
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `mapearError` en la ruta `src/lib/errores/`
- **Módulo:** Trazabilidad y Auditoría
- **Etiquetas:** BACKEND, FRONTEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `src/lib/errores/mapearError.ts` que traduzca excepciones de dominio, Zod y Supabase a los códigos de `docs/ERRORS.md`.
  - [ ] Paso 2: Retornar objeto tipado `{codigo, mensaje}` sin exponer trazas técnicas.
  - [ ] Paso 3: Crear componente `MensajeError.tsx` con ícono `lucide-react: AlertCircle` y borde `border-red-500`.
  - [ ] Paso 4: Reutilizar el componente en todos los formularios Fail-Fast del sistema.
- **Criterios de Aceptación (BDD):**
  - Dado un error de validación Zod, cuando se propaga a través de `mapearError`, entonces se traduce al código `NX-SYS-006` con mensaje claro.
  - Dado un error técnico de Supabase (ej. constraint violado), cuando se mapea, entonces nunca expone el mensaje SQL crudo ni nombres de columnas al usuario.
  - Dado el componente `MensajeError.tsx`, cuando se renderiza, entonces incluye el ícono `lucide-react: AlertCircle` y texto explicativo (nunca solo color).
  - Dado un código de error no contemplado en `ERRORS.md`, cuando ocurre, entonces se mapea por defecto a `NX-SYS-001` como fallback genérico.

### 💡 Historia: Captura de errores técnicos en Sentry
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero capturar los errores técnicos en Sentry sin exponer datos sensibles para poder diagnosticar problemas rápidamente en producción.

#### Actividades Técnicas Desglosadas:
##### 1. Boundary de errores con captura en Sentry
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `ErrorBoundary` en la ruta `app/(app)/`
- **Módulo:** Trazabilidad y Auditoría
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Implementar `app/(app)/error.tsx` y `app/(admin)/error.tsx` como Error Boundaries de Next.js.
  - [ ] Paso 2: Capturar la excepción con `Sentry.captureException` sin exponer trazas ni nombres de columnas.
  - [ ] Paso 3: Mostrar únicamente el mensaje normalizado `NX-SYS-001` al usuario final.
- **Criterios de Aceptación (BDD):**
  - Dado un error no controlado en una ruta de `(app)`, cuando ocurre, entonces `app/(app)/error.tsx` lo captura y muestra el mensaje `NX-SYS-001`.
  - Dado el error capturado, cuando se envía a Sentry, entonces no incluye trazas de SQL ni nombres de columnas de la base de datos.
  - Dado un error en una ruta de `(admin)`, cuando ocurre, entonces `app/(admin)/error.tsx` lo maneja de forma independiente al boundary de `(app)`.
  - Dado el boundary activado, cuando el usuario recibe el mensaje de error, entonces se le ofrece una acción de recuperación (reintentar o volver).

---

## 📁 Épica: Épica 13: Facturación, Límites y Gestión de Morosidad
*Descripción:* Actualización del estado_pago del cliente según el flujo de morosidad, gestión de ampliación de limite_sku y de cuota_mensual_ia con actualización del próximo período de facturación, y visualización en el panel de comerciante del uso actual frente a los límites contratados.

### 💡 Historia: Actualización del estado de pago del comercio
- **Prioridad:** Alta
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como administrador NODEXA quiero actualizar el estado_pago de un comercio según el flujo de morosidad para suspender o reactivar el acceso de forma controlada.

#### Actividades Técnicas Desglosadas:
##### 1. Server Action actualizarEstadoPago
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `actualizarEstadoPago` en la ruta `src/services/admin/`
- **Módulo:** Facturación y Límites
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `actualizarEstadoPago` restringida a `admin_nodexa`.
  - [ ] Paso 2: Actualizar `clientes.estado_pago` siguiendo el flujo SOP-04 (recordatorio, contacto, suspensión al día 30).
  - [ ] Paso 3: Registrar el cambio en `auditoria_diffs`.
  - [ ] Paso 4: Enviar notificación por WhatsApp al comercio afectado.
- **Criterios de Aceptación (BDD):**
  - Dado un comercio en mora tras 30 días sin respuesta, cuando el admin ejecuta `actualizarEstadoPago` a `false`, entonces se suspende el acceso al panel y la vidriera web.
  - Dado un comercio que regulariza su pago, cuando se actualiza `estado_pago` a `true`, entonces el acceso se restaura inmediatamente sin fee de reactivación (fase actual del SOP).
  - Dado un usuario con rol distinto a `admin_nodexa`, cuando intenta ejecutar esta Server Action, entonces la operación es rechazada.
  - Dado el cambio de estado, cuando se completa, entonces queda registrado en `auditoria_diffs` con el `valor_anterior` y `valor_nuevo` correctos.

### 💡 Historia: Visualización de uso actual frente a límites contratados
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero ver en mi panel el uso actual de SKU y de cuota de IA frente a mis límites contratados para entender mi consumo en todo momento.

#### Actividades Técnicas Desglosadas:
##### 1. Widget de consumo en /configuracion/facturacion
- **Rol:** Frontend / UX Engineer
- **Componente/Archivo:** `WidgetConsumo` en la ruta `app/(app)/configuracion/facturacion/`
- **Módulo:** Facturación y Límites
- **Etiquetas:** FRONTEND, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/(app)/configuracion/facturacion/page.tsx` consumiendo `obtenerPorcentajeUsoSku` y `obtenerUsoCuotaIA`.
  - [ ] Paso 2: Mostrar barras de progreso con `font-mono` para valores numéricos.
  - [ ] Paso 3: Respetar la paleta del sistema de diseño (sin rojo punitivo bajo el 100%).
- **Criterios de Aceptación (BDD):**
  - Dado un comercio con 910 SKU sobre un límite de 1000, cuando visualiza el widget, entonces la barra de progreso muestra 91% de uso.
  - Dado el widget de consumo, cuando el uso está bajo el 100%, entonces nunca se renderiza en color rojo (solo `text-blue-500` o neutros del sistema de diseño).
  - Dado los valores numéricos mostrados (SKU usados, cuota IA), cuando se renderizan, entonces usan `font-mono`.
  - Dado un usuario `empleado` autenticado, cuando intenta acceder a `/configuracion/facturacion`, entonces no tiene acceso a esta vista.

### 💡 Historia: Actualización de facturación tras ampliación de límites
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como administrador NODEXA quiero que al confirmarse una ampliación de limite_sku o cuota de IA se actualice el próximo período de facturación para mantener el cobro correcto del comercio.

#### Actividades Técnicas Desglosadas:
##### 1. Actualización del próximo período de facturación en ampliaciones
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `actualizarFacturacionRecurrente` en la ruta `src/services/admin/`
- **Módulo:** Facturación y Límites
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Extender `ampliarLimiteSku` (y su equivalente de cuota IA) para registrar el incremento asociado al `cliente_id`.
  - [ ] Paso 2: Sumar el valor del pack contratado al próximo vencimiento, respetando el esquema escalonado decreciente del modelo comercial.
  - [ ] Paso 3: Registrar el ajuste en `auditoria_diffs`.
- **Criterios de Aceptación (BDD):**
  - Dado una ampliación de `limite_sku` de 1000 a 2000 confirmada, cuando se procesa, entonces se suma +$5.000 ARS al próximo período de facturación del comercio.
  - Dado una segunda ampliación a 3000 SKU, cuando se procesa, entonces se aplica el costo marginal decreciente correspondiente (+$4.000 ARS) según el esquema comercial.
  - Dado una ampliación de cuota de IA, cuando se confirma, entonces se refleja el costo del paquete de recarga en el próximo vencimiento.
  - Dado el ajuste de facturación, cuando se completa, entonces queda registrado en `auditoria_diffs` para trazabilidad administrativa.

---

## 📁 Épica: Épica 14: Portabilidad de Datos
*Descripción:* Implementación del endpoint de exportación que permite al comerciante extraer su catálogo de productos y sus transacciones (ventas) en formatos estándar CSV o JSON sin fricción.

### 💡 Historia: Exportación de catálogo en CSV/JSON
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero exportar mi catálogo de productos en formato CSV o JSON para tener un respaldo propio de mi información.

#### Actividades Técnicas Desglosadas:
##### 1. Route Handler de exportación de productos
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `exportarProductos` en la ruta `app/api/export/productos/`
- **Módulo:** Portabilidad de Datos
- **Etiquetas:** API, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/api/export/productos/route.ts` que consulte productos activos del `cliente_id` del JWT paginando internamente.
  - [ ] Paso 2: Serializar la respuesta en CSV o JSON según query param `formato`.
  - [ ] Paso 3: Aplicar defensa IDOR/BOLA verificando que el `cliente_id` coincida con el del JWT.
- **Criterios de Aceptación (BDD):**
  - Dado un comerciante autenticado, cuando solicita la exportación con `formato=csv`, entonces recibe un archivo CSV con únicamente los productos de su propio `cliente_id`.
  - Dado un comerciante autenticado, cuando solicita `formato=json`, entonces recibe un JSON válido y bien estructurado del catálogo.
  - Dado un intento de exportación sin JWT válido, cuando se llama al endpoint, entonces se retorna `NX-SYS-002`.
  - Dado un catálogo grande (miles de productos), cuando se exporta, entonces la consulta interna se pagina para evitar timeout del Route Handler.

### 💡 Historia: Exportación de transacciones en CSV/JSON
- **Prioridad:** Media
- **Estimación:** 3 SP
- **Descripción / CA Funcionales:** Como comerciante quiero exportar mis ventas y movimientos en formato CSV o JSON para poder analizarlos con mis propias herramientas.

#### Actividades Técnicas Desglosadas:
##### 1. Route Handler de exportación de ventas y movimientos
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `exportarVentas` en la ruta `app/api/export/`
- **Módulo:** Portabilidad de Datos
- **Etiquetas:** API, BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `app/api/export/route.ts` (o subruta `/ventas`) que exporte `ventas` y `venta_items` del `cliente_id` autenticado.
  - [ ] Paso 2: Reutilizar el serializador genérico de la exportación de productos.
  - [ ] Paso 3: Paginar internamente la consulta para respetar el guardrail de eficiencia (sin `SELECT *` sin `LIMIT`).
- **Criterios de Aceptación (BDD):**
  - Dado un comerciante autenticado, cuando exporta sus transacciones, entonces recibe únicamente `ventas` y `venta_items` de su propio `cliente_id`.
  - Dado el formato solicitado (CSV o JSON), cuando se genera el archivo, entonces reutiliza el mismo serializador genérico usado en la exportación de productos.
  - Dado un volumen alto de ventas históricas, cuando se exporta, entonces la consulta se pagina internamente respetando el guardrail de eficiencia.
  - Dado un intento de acceso con `cliente_id` ajeno vía manipulación de parámetros, cuando ocurre, entonces se retorna `NX-SYS-007`.

---

## 📁 Épica: Épica 15: Calidad, Testing y Aseguramiento de Cobertura
*Descripción:* Implementación de la pirámide de pruebas definida (70% unitarias con Vitest sobre cálculos de stock y caja, 20% de integración sobre repositorios, Server Actions y políticas RLS, 10% E2E con Playwright sobre flujos críticos como onboarding, alta de producto y cobro en mostrador), aplicando TDD en la lógica core de negocio hasta alcanzar la cobertura mínima del 80%.

### 💡 Historia: Pruebas unitarias de cálculos de stock y caja
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero cubrir con pruebas unitarias los cálculos de stock y de totales de venta para detectar errores de lógica antes de llegar a producción.

#### Actividades Técnicas Desglosadas:
##### 1. Suite Vitest de funciones puras de dominio
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `tests_dominio` en la ruta `src/lib/dominio/__tests__/`
- **Módulo:** Calidad y Testing
- **Etiquetas:** BACKEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `calcularTotalVenta.test.ts`, `calcularNuevoSaldo.test.ts` y `calcularPorcentajeUsoSku.test.ts`.
  - [ ] Paso 2: Cubrir casos límite (cantidad cero, stock exacto, redondeo de `numeric(12,2)`).
  - [ ] Paso 3: Verificar que la cobertura de estas funciones puras aporte al 70% de pruebas unitarias de la pirámide de testing.
- **Criterios de Aceptación (BDD):**
  - Dado el archivo `calcularTotalVenta.test.ts`, cuando se ejecuta `npm run test`, entonces cubre casos de múltiples ítems, cantidad cero y redondeo decimal.
  - Dado el archivo `calcularNuevoSaldo.test.ts`, cuando se ejecuta, entonces cubre el caso de stock exacto en cero y el caso de salida mayor al stock disponible.
  - Dado el archivo `calcularPorcentajeUsoSku.test.ts`, cuando se ejecuta, entonces cubre los umbrales exactos de 90% y 100%.
  - Dado el reporte de cobertura, cuando se genera, entonces las funciones de dominio alcanzan el 100% de cobertura de líneas y ramas.

### 💡 Historia: Pruebas de integración sobre RLS y Server Actions
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero cubrir con pruebas de integración las políticas RLS y los Server Actions críticos para verificar que el aislamiento multi-tenant funciona correctamente.

#### Actividades Técnicas Desglosadas:
##### 1. Suite de integración contra Supabase local
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `tests_integracion` en la ruta `tests/integracion/`
- **Módulo:** Calidad y Testing
- **Etiquetas:** BACKEND, BD
- **Checklist de Implementación:**
  - [ ] Paso 1: Configurar `supabase start` en entorno de test local.
  - [ ] Paso 2: Escribir pruebas de integración con Vitest autenticando usuarios de distintos tenants para verificar el rechazo de lecturas/escrituras cruzadas por RLS.
  - [ ] Paso 3: Probar el rechazo de inputs maliciosos en `crearProducto` y `confirmarVenta`.
  - [ ] Paso 4: Validar el 20% de la pirámide de testing con estas pruebas.
- **Criterios de Aceptación (BDD):**
  - Dado un entorno con `supabase start` corriendo, cuando se ejecutan las pruebas de integración, entonces se conectan exitosamente a la instancia local.
  - Dado un usuario autenticado del tenant A, cuando la prueba intenta leer datos del tenant B, entonces la política RLS rechaza la consulta y la prueba lo valida.
  - Dado un payload malicioso (ej. intento de SQL injection vía input), cuando se envía a `crearProducto`, entonces la prueba confirma que Zod y el Query Builder lo neutralizan.
  - Dado el conjunto completo de pruebas de integración, cuando se ejecuta en CI, entonces contribuye al 20% de la pirámide de testing definida.

### 💡 Historia: Pruebas E2E de flujos críticos del usuario
- **Prioridad:** Alta
- **Estimación:** 5 SP
- **Descripción / CA Funcionales:** Como equipo de desarrollo quiero automatizar con Playwright los flujos de onboarding, alta de producto y cobro en mostrador para asegurar que los caminos más importantes nunca se rompan.

#### Actividades Técnicas Desglosadas:
##### 1. Suite Playwright de flujos de onboarding, alta y cobro
- **Rol:** Backend / DB Engineer
- **Componente/Archivo:** `tests_e2e` en la ruta `e2e/`
- **Módulo:** Calidad y Testing
- **Etiquetas:** BACKEND, FRONTEND
- **Checklist de Implementación:**
  - [ ] Paso 1: Crear `e2e/onboarding.spec.ts`, `e2e/alta-producto.spec.ts` y `e2e/cobro-mostrador.spec.ts` con Playwright.
  - [ ] Paso 2: Simular el recorrido completo de un comerciante desde el login hasta la confirmación de una venta.
  - [ ] Paso 3: Verificar los mensajes de `ERRORS.md` en los casos de error esperados (stock insuficiente, límite de SKU, etc.).
  - [ ] Paso 4: Confirmar que estas pruebas cubran el 10% de la pirámide de testing.
- **Criterios de Aceptación (BDD):**
  - Dado el spec `e2e/onboarding.spec.ts`, cuando se ejecuta, entonces simula el login y la navegación inicial del comerciante hasta el dashboard.
  - Dado el spec `e2e/alta-producto.spec.ts`, cuando se ejecuta, entonces cubre tanto el alta exitosa como el bloqueo al alcanzar el `limite_sku`.
  - Dado el spec `e2e/cobro-mostrador.spec.ts`, cuando se ejecuta, entonces simula la selección de productos, confirmación de venta y verificación del descuento de stock resultante.
  - Dado un escenario de error esperado (ej. stock insuficiente), cuando ocurre durante el flujo E2E, entonces la prueba verifica que el mensaje de `ERRORS.md` correspondiente se muestra en pantalla.

---



## 6. Planificación de Sprints

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



