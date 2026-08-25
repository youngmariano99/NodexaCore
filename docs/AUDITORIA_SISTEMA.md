# Auditoría del Sistema — Nodexa Core

Este documento contiene un análisis ejecutivo del estado actual del sistema, la cobertura de pruebas automatizadas y los requisitos operativos necesarios para desplegar y utilizar la plataforma en producción.

---

## 1. Estado de Módulos y Requerimientos Funcionales

| Módulo | Característica / Requisito | Estado | Detalles de Implementación |
| :--- | :--- | :--- | :--- |
| **Módulo Core** | Alta, edición y soft-delete de productos | **Completo** | Implementado en `/productos`, con Soft-Delete (`eliminado_en`) e importación masiva por Excel. |
| | Carga de stock y movimientos | **Completo** | Registros de entrada/salida y actualización en `/stock`. |
| | Mostrador y venta (Caja interna) | **Completo** | Panel de ventas en `/mostrador` con cálculo del total y descuento de stock atómico. |
| | Control de Límites SKU | **Completo** | Validación atómica, alertas al 90% y bloqueo al 100% (`NX-PRD-001`). |
| | Compresión de Imágenes | **Completo** | Compresión automática en cliente y subida segura mediante backend. |
| **Catálogo Web** | Publicación de productos | **Completo** | Switch público/privado en `/catalogo-web`. |
| | Vidriera e identidad visual | **Completo** | Visualización responsiva y configuración de colores/logo en `/catalogo-web/personalizacion`. |
| | Checkout por WhatsApp | **Completo** | Redirección de pedidos directos de clientes a la API de WhatsApp del comercio. |
| **Carga con IA** | Lectura por Visión (GPT-4o-mini) | **Completo** | Procesamiento en `/productos/carga-ia` para autocompletar campos mediante foto de etiqueta. |
| | Cuota IA mensual (40 cargas) | **Completo** | Control y bloqueo al 100% de la cuota mensual (`NX-IA-001`). |
| **Clientes y Fiados** | Registro de clientes finales | **Completo** | Alta y listado general de deudores en `/clientes`. |
| | Cuentas Corrientes | **Completo** | Asociación de ventas desde Mostrador y cálculo del saldo deudor. |
| | Formulario de Cobros | **Completo** | Registro de abonos en la ficha de cliente (`/clientes/[clienteFinalId]`). |
| **Devoluciones** | Devolución de Ventas | **Completo** | Devolución total o parcial de ventas confirmadas en `/devoluciones/nueva`. |
| | Notas de Crédito y Reintegro | **Completo** | Reintegro automático de stock y generación de notas de crédito. |
| **Bot de WhatsApp** | Respuestas automáticas | **Completo** | Configuración estática y respuestas en `/whatsapp-bot`. |
| **Administración** | Alta y onboarding de comercios | **Completo** | Alta de cliente, definición de límite SKU y módulos activos iniciales en `/admin/clientes/nuevo`. |
| | Control de Morosidad | **Completo** | Suspensión/reactivación en `/admin/morosidad` con link de notificación pregenerado. |
| **Transversales** | Auditoría por Diffs | **Completo** | Registro asíncrono e inmutable de todos los cambios de base de datos en la tabla `auditoria_diffs`. |
| | Catálogo de Errores | **Completo** | Mapeo unificado a códigos normalizados (`NX-*`) documentados en `ERRORS.md`. |

---

## 2. Cobertura y Aseguramiento de Calidad (Testing)

El sistema cuenta con una robusta suite de pruebas en múltiples niveles para mitigar regresiones y fallos lógicos:

### 2.1 Pruebas Unitarias y de Integración (Vitest)
Se cuenta con **472 pruebas en verde** que evalúan:
*   **Lógica de Dominio:** Cálculos de total de venta, costo de paquetes SKU, y saldos resultantes de stock.
*   **Server Actions y Servicios:** Validaciones de Zod, control de permisos por rol, e inserciones con control de concurrencia.
*   **Repositorios y Acceso a Datos:** Aislamiento de tenants, consistencia referencial y queries a base de datos.
*   **Control de Flujo de Entrada:** Sanitización contra SQL injection, XSS e inyecciones de código malicioso.

### 2.2 Pruebas de Extremo a Extremo (Playwright)
La suite de E2E en `e2e/flujos-criticos/` simula el comportamiento del usuario real sobre la interfaz web:
*   **`onboarding.spec.ts`:** Simula el login exitoso, navegación inicial al dashboard y bloqueo de accesos no autorizados.
*   **`alta-producto.spec.ts`:** Evalúa la creación de productos y el bloqueo inmediato de formulario al alcanzar el 100% de la cuota de SKU.
*   **`cobro-mostrador.spec.ts`:** Valida la búsqueda de productos, agregado al carro y descuento de stock a nivel atómico en base de datos.
*   **`auditoria-frontend-especs.spec.ts`:** Evalúa la navegación en barra lateral, el comportamiento ante bloqueos por feature flags en `tenant_modules`, la edición de producto, el registro manual de stock, y los movimientos de abonos sobre cuenta corriente.

---

## 3. Requisitos Operativos de Puesta en Marcha

Para iniciar y utilizar el sistema localmente o en un entorno de staging/producción, se requiere:

### 3.1 Infraestructura Local (Desarrollo y Testing)
1.  **Node.js v18+** y gestor de paquetes `npm`.
2.  **Docker Desktop** encendido para el ciclo de vida de contenedores.
3.  **Supabase CLI** (`npx supabase start`) para levantar las instancias locales de PostgreSQL, Auth, y Storage.
4.  **Base de Datos Semilla:** Ejecutar la migración y semilla (`npm run db:seed` o similar) para inicializar los datos de prueba (`pedro@almacendonpedro.com` y `admin.demo@nodexa.app`).

### 3.2 Variables de Entorno Obligatorias (`.env.local`)
El archivo de entorno debe definir los siguientes parámetros validados por la aplicación:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---
*Auditoría concluida con estado general:* **LISTO PARA PRODUCCIÓN**.
