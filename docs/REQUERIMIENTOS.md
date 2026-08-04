# REQUISITOS_NODEXA_CORE.md

## Requisitos Funcionales
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

## Requisitos No Funcionales
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