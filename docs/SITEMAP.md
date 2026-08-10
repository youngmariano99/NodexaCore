# SITEMAP.md — NODEXA CORE

## 1. Mapa de Rutas del Sistema

```
/
├── (publico)/
│   ├── page.tsx                              → Landing institucional NODEXA
│   ├── login/
│   │   └── page.tsx                          → Inicio de sesión (Comerciante / Admin)
│   └── c/
│       └── [clienteSlug]/
│           ├── page.tsx                      → Vidriera pública (Catálogo Web)
│           └── producto/
│               └── [productoId]/
│                   └── page.tsx               → Ficha de producto pública
│
├── (app)/                                     → Grupo protegido (requiere sesión, middleware JWT)
│   ├── layout.tsx                             → Layout con sidebar/topbar + validación de tenant_modules
│   ├── dashboard/
│   │   └── page.tsx                           → Resumen operativo (ventas del día, alertas de límite)
│   │
│   ├── mostrador/
│   │   └── page.tsx                           → Panel de Ventas / Caja (Core)
│   │
│   ├── productos/
│   │   ├── page.tsx                           → Listado paginado de productos (Core)
│   │   ├── nuevo/
│   │   │   └── page.tsx                       → Alta manual de producto
│   │   ├── [productoId]/
│   │   │   ├── page.tsx                       → Edición de producto
│   │   │   └── historial/
│   │   │       └── page.tsx                   → Historial de diffs (auditoría)
│   │   ├── carga-masiva/
│   │   │   └── page.tsx                       → Importación por Excel (Core)
│   │   └── carga-ia/
│   │       └── page.tsx                       → Alta por Visión (Módulo Carga IA)
│   │
│   ├── stock/
│   │   └── page.tsx                           → Movimientos de entrada/salida de stock
│   │
│   ├── ventas/
│   │   ├── page.tsx                           → Historial de ventas (paginado)
│   │   └── [ventaId]/
│   │       └── page.tsx                       → Detalle de venta / iniciar devolución
│   │
│   ├── devoluciones/
│   │   ├── page.tsx                           → Listado de devoluciones y notas de crédito (Módulo Devoluciones)
│   │   └── nueva/
│   │       └── page.tsx                       → Registrar devolución
│   │
│   ├── clientes/
│   │   ├── page.tsx                           → Listado de clientes / cuentas corrientes (Módulo Fiados)
│   │   └── [clienteFinalId]/
│   │       └── page.tsx                       → Estado de cuenta corriente y registro de pagos
│   │
│   ├── catalogo-web/
│   │   ├── page.tsx                           → Configuración de vidriera (publicar/despublicar productos)
│   │   └── personalizacion/
│   │       └── page.tsx                       → Identidad visual (logo, colores, dominio)
│   │
│   ├── whatsapp-bot/
│   │   └── page.tsx                           → Configuración de respuestas estáticas (Módulo Bot)
│   │
│   ├── configuracion/
│   │   ├── page.tsx                           → Datos del comercio
│   │   ├── modulos/
│   │   │   └── page.tsx                       → Marketplace: activar/contratar módulos adicionales
│   │   └── facturacion/
│   │       └── page.tsx                       → Estado de abono, límite de SKU/IA, historial de pagos
│   │
│   └── ayuda/
│       └── page.tsx                           → Centro de ayuda / micro-tips educativos
│
├── (admin)/                                    → Grupo protegido exclusivo Administrador NODEXA
│   ├── layout.tsx                              → Layout admin + validación de rol
│   ├── admin/
│   │   ├── page.tsx                            → Panel general de comercios (todos los tenants)
│   │   ├── clientes/
│   │   │   ├── page.tsx                        → Listado de comercios dados de alta
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx                    → Alta de nuevo comercio (SOP-01)
│   │   │   └── [clienteId]/
│   │   │       ├── page.tsx                    → Detalle: estado_pago, tenant_modules, limite_sku
│   │   │       └── modulos/
│   │   │           └── page.tsx                → Activación de módulos (SOP-02)
│   │   └── morosidad/
│   │       └── page.tsx                        → Seguimiento de clientes en mora (SOP-04)
│
└── api/
    ├── productos/
    │   └── route.ts                            → Route Handler: listado paginado / mutaciones
    ├── stock/
    │   └── route.ts                            → Route Handler: listado paginado de movimientos de stock
    ├── ventas/
    │   └── route.ts                             → Route Handler: registro de venta (idempotente)
    ├── carga-ia/
    │   └── route.ts                             → Route Handler: procesamiento de imagen por IA (rate-limited)
    ├── webhooks/
    │   └── whatsapp/
    │       └── route.ts                         → Webhook entrante del Bot de WhatsApp
    └── export/
        └── route.ts                             → Exportación CSV/JSON de catálogo y transacciones
```

---

## 2. Roles y Accesos por Ruta

| Ruta | Comerciante (Dueño) | Empleado / Cajero | Administrador NODEXA | Cliente Final (Público) |
| :--- | :---: | :---: | :---: | :---: |
| `/` (landing) | ✦ | ✦ | ✦ | ✦ |
| `/login` | ✦ | ✦ | ✦ | — |
| `/c/[clienteSlug]` (vidriera) | — | — | — | ✦ (solo lectura) |
| `/dashboard` | ✦ | Vista limitada (sin facturación) | — | — |
| `/mostrador` | ✦ | ✦ | — | — |
| `/productos/*` | ✦ | ✦ (sin baja definitiva) | — | — |
| `/stock` | ✦ | ✦ | — | — |
| `/ventas/*` | ✦ | Solo lectura de propias ventas | — | — |
| `/devoluciones/*` | ✦ | Requiere autorización del dueño | — | — |
| `/clientes/*` (fiados) | ✦ | ✦ (sin editar límites de crédito) | — | — |
| `/catalogo-web/*` | ✦ | — | — | — |
| `/whatsapp-bot` | ✦ | — | — | — |
| `/configuracion/*` | ✦ | — | — | — |
| `/configuracion/facturacion` | ✦ | — | ✦ (soporte) | — |
| `/admin/*` | — | — | ✦ | — |
| `/api/*` | Según JWT + `cliente_id` (IDOR/BOLA) | Según JWT | Según rol admin | Solo `webhooks` y lectura pública de catálogo |

> **Nota de acceso:** Todo acceso a rutas del grupo `(app)` requiere sesión activa validada por middleware global (JWT ≤ 1 hora) y verificación de `tenant_modules` según el módulo solicitado. El grupo `(admin)` exige rol `admin` explícito además de sesión válida; ningún comerciante puede acceder a rutas de otro `cliente_id` (RLS + verificación de servidor).

---

## 3. Flujos Clave

**Flujo de Venta en Mostrador (`/mostrador`)**
El comerciante busca o escanea el producto, el sistema valida stock disponible en tiempo real, se agrega al carrito de la venta y se confirma el cobro. La venta se registra con concurrencia optimista para evitar duplicados; el stock se descuenta automáticamente y el movimiento queda auditado como diff en background.

**Flujo de Alta de Producto (`/productos/nuevo` o `/productos/carga-ia`)**
El comerciante ingresa los datos manualmente o sube una foto de etiqueta (Módulo Carga IA). El sistema valida el payload con Zod (Fail-Fast), verifica el conteo de SKUs activos contra el límite contratado (aviso al 90%, bloqueo al 100% con modal de upsell) y comprime automáticamente la imagen a WebP antes de guardar.

**Flujo de Consulta Pública del Catálogo (`/c/[clienteSlug]`)**
Un cliente final accede sin autenticación, navega los productos con `publicado = true`, y desde la ficha de producto es dirigido a WhatsApp para consultar o realizar el pedido. La vista se sirve con caché de Edge para minimizar carga sobre PostgreSQL.

**Flujo de Devolución (`/devoluciones/nueva`)**
El comerciante selecciona una venta previa, indica los ítems a devolver total o parcialmente, el sistema genera la nota de crédito asociada sin alterar el registro original de la venta y reintegra automáticamente el stock correspondiente.

**Flujo de Alta de Comercio (`/admin/clientes/nuevo`)**
El Administrador NODEXA crea el registro del nuevo `cliente_id`, define el `estado_pago` inicial, activa las banderas de `tenant_modules` contratadas y deja preparado el onboarding según el tipo de Setup (Estándar o Asistido), conforme al SOP-01.

**Flujo de Aviso y Bloqueo de Límites (`/dashboard`, `/productos`)**
Al alcanzar el 90% del límite de SKU o de cuota mensual de IA, el sistema muestra una notificación discreta en el panel. Al llegar al 100%, bloquea la acción correspondiente (alta de producto o carga por IA) y presenta un mensaje de bloqueo empático con opción de ampliación gestionable desde `/configuracion/modulos` o WhatsApp.