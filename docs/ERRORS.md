# ERRORS.md — Catálogo de Errores Normalizados NODEXA CORE

**Formato de Código:** `NX-[MÓDULO]-[CORRELATIVO]`
**Nota de Redacción:** Todo mensaje de usuario respeta la Brand Voice NODEXA (dialecto rioplatense, tono Aliado Sincero, cero tecnicismos, cero emojis).

---

## 1. Sistema y Transversales (`SYS`)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
| :--- | :--- | :--- | :--- |
| `NX-SYS-001` | No pudimos completar la acción por un error interno. Ya estamos al tanto, probá de nuevo en unos minutos. | Servidor / 500 | Reintentar la operación; si persiste, contactar soporte con el código de error. |
| `NX-SYS-002` | Tu sesión venció por seguridad. Iniciá sesión de nuevo para seguir donde estabas. | Auth / 401 | Redirigir a `/login`; conservar el borrador de datos no guardados si aplica. |
| `NX-SYS-003` | No tenés permiso para acceder a esta sección. | Autorización / 403 | Redirigir al panel principal según el rol del usuario. |
| `NX-SYS-004` | No encontramos lo que estabas buscando. | Recurso / 404 | Verificar el enlace o volver al listado anterior. |
| `NX-SYS-005` | Estás enviando demasiadas solicitudes seguidas. Esperá un momento y volvé a intentar. | Rate Limiting / 429 | Aplicar backoff y reintentar tras el tiempo indicado por el header `Retry-After`. |
| `NX-SYS-006` | Los datos que enviaste no son válidos. Revisá los campos marcados y volvé a intentar. | Validación Zod / 400 | Resaltar en rojo (`border-red-500`) los campos con error, con ícono `AlertCircle` y detalle puntual por campo. |
| `NX-SYS-007` | Este recurso pertenece a otro comercio y no podés acceder a él. | Autorización IDOR/BOLA / 403 | Registrar el intento en `auditoria_diffs`; redirigir al listado propio del tenant. |

---

## 2. Módulo Core: Productos y Stock (`PRD`)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
| :--- | :--- | :--- | :--- |
| `NX-PRD-001` | Alcanzaste el límite de productos de tu plan actual. Contamos con un pack para seguir sumando catálogo sin perder nada de lo que ya cargaste. | Server Action / 409 | Mostrar modal de bloqueo empático con acento `text-blue-500` ofreciendo el Pack de Catálogo Extendido; derivar a `/configuracion/modulos` o WhatsApp. |
| `NX-PRD-002` | Ya tenés un producto cargado con este SKU. Revisá el código o modificá el existente. | Validación / 409 | Resaltar el campo SKU y sugerir buscar el producto en el listado. |
| `NX-PRD-003` | El precio ingresado no es válido. Tiene que ser un número mayor o igual a cero. | Validación Zod / 400 | Resaltar el campo `precio` con borde rojo y mensaje puntual. |
| `NX-PRD-004` | No podés dejar stock en negativo. Revisá la cantidad que estás por descontar. | Validación / 400 | Bloquear el envío del formulario de salida de stock; mostrar saldo disponible actual. |
| `NX-PRD-005` | No pudimos guardar la imagen del producto. Probá con otro archivo o intentá de nuevo. | Integración Cloudinary / 502 | Reintentar la carga; sugerir formato JPG/PNG por debajo de un tamaño razonable. |
| `NX-PRD-006` | Este producto ya fue dado de baja y no se puede modificar. | Lógica de negocio / 409 | Ofrecer reactivar el producto en lugar de editarlo (si aplica) o volver al listado. |
| `NX-PRD-007` | El archivo Excel no tiene el formato esperado. Descargá la plantilla y volvé a intentar. | Validación de importación / 422 | Mostrar enlace de descarga de la plantilla estructurada oficial. |
| `NX-PRD-008` | Estás cerca del límite de tu catálogo. Te quedan pocos productos disponibles en tu plan actual. | Banda informativa / 200 (no bloqueante) | Mostrar banda discreta (`bg-slate-800`, `text-slate-400`) al alcanzar el 90% del `limite_sku`; sin bloquear la carga. |
| `NX-BRD-001` | Alcanzaste el límite de marcas de tu plan actual. Para seguir sumando marcas podés ampliar tu plan. | Server Action / 409 | Mostrar mensaje de alerta indicando que se superó el límite de marcas contratado. |

---

## 3. Módulo Mostrador y Ventas (`VTA`)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
| :--- | :--- | :--- | :--- |
| `NX-VTA-001` | No hay stock suficiente de este producto para completar la venta. | Validación de negocio / 409 | Mostrar el stock disponible real y permitir ajustar la cantidad antes de confirmar. |
| `NX-VTA-002` | Esta venta ya fue registrada. No hace falta confirmarla de nuevo. | Idempotencia / 409 | Deshabilitar el botón de cobro tras el primer clic; mostrar el comprobante ya generado. |
| `NX-VTA-003` | El total de la venta no puede ser negativo. Revisá los productos y cantidades cargadas. | Validación Zod / 400 | Resaltar el resumen del carrito y bloquear la confirmación. |
| `NX-VTA-004` | No encontramos esta venta en tu comercio. | Recurso / 404 | Volver al historial de ventas del tenant. |
| `NX-VTA-005` | No pudimos procesar el cobro por un problema momentáneo. Probá de nuevo. | Server Action / 500 | Reintentar sin duplicar el registro (control por `idempotency_key`). |

---

## 4. Módulo Catálogo Web (`WEB`)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
| :--- | :--- | :--- | :--- |
| `NX-WEB-001` | Este módulo todavía no está activo en tu cuenta. Activalo para publicar tu vidriera. | Feature Flag / 403 | Redirigir a `/configuracion/modulos` con la ficha del Módulo Catálogo Web. |
| `NX-WEB-002` | No pudimos publicar este producto. Verificá que tenga nombre, precio e imagen cargados. | Validación de negocio / 422 | Resaltar los campos faltantes antes de permitir el flag `publicado = true`. |
| `NX-WEB-003` | El dominio que ingresaste ya está en uso. Probá con otro. | Validación / 409 | Sugerir verificar la disponibilidad antes de reintentar la vinculación en Vercel. |
| `NX-WEB-004` | Esta vidriera no está disponible en este momento. | Vista pública / 404 | Mostrar página de error genérica sin datos internos del comercio. |

---

## 5. Módulo Carga con IA (`IA`)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
| :--- | :--- | :--- | :--- |
| `NX-IA-001` | Este módulo todavía no está activo en tu cuenta. | Feature Flag / 403 | Redirigir a `/configuracion/modulos` con la ficha del Módulo Carga con IA. |
| `NX-IA-002` | Ya usaste todas tus cargas por IA de este mes. Podés seguir cargando productos de forma manual mientras tanto. | Cuota mensual / 429 | Mostrar modal amigable ofreciendo paquete de recarga (+40 consultas); deshabilitar botón "Cargar foto con IA" hasta el próximo período. |
| `NX-IA-003` | No pudimos leer los datos de la foto que subiste. Probá con una imagen más clara o cargá el producto manualmente. | Integración OpenAI / 502 | Ofrecer alternancia inmediata al formulario de alta manual con los campos vacíos. |
| `NX-IA-004` | El archivo que subiste no es una imagen válida. | Validación / 400 | Aceptar únicamente JPG/PNG/WebP; mostrar formatos permitidos. |

---

## 6. Módulo Clientes y Cuentas Corrientes / Fiados (`FIA`)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
| :--- | :--- | :--- | :--- |
| `NX-FIA-001` | Este módulo todavía no está activo en tu cuenta. | Feature Flag / 403 | Redirigir a `/configuracion/modulos` con la ficha del Módulo Fiados. |
| `NX-FIA-002` | No encontramos este cliente en tu comercio. | Recurso / 404 | Volver al listado de clientes del tenant. |
| `NX-FIA-003` | El monto del pago no puede ser mayor a la deuda actual del cliente. | Validación de negocio / 400 | Mostrar el saldo deudor vigente y ajustar el monto máximo permitido en el formulario. |
| `NX-FIA-004` | El monto ingresado tiene que ser mayor a cero. | Validación Zod / 400 | Resaltar el campo `monto` con borde rojo. |
| `NX-FIA-005` | Ya existe un cliente cargado con estos datos de contacto. | Validación / 409 | Sugerir buscar al cliente existente antes de crear uno nuevo. |

---

## 7. Módulo Devoluciones y Notas de Crédito (`DEV`)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
| :--- | :--- | :--- | :--- |
| `NX-DEV-001` | Este módulo todavía no está activo en tu cuenta. | Feature Flag / 403 | Redirigir a `/configuracion/modulos` con la ficha del Módulo Devoluciones. |
| `NX-DEV-002` | No podés devolver más unidades de las que se vendieron originalmente. | Validación de negocio / 400 | Mostrar la cantidad vendida disponible para devolver por ítem. |
| `NX-DEV-003` | Esta venta ya fue devuelta por completo. | Lógica de negocio / 409 | Mostrar la nota de crédito ya generada asociada a la venta. |
| `NX-DEV-004` | No pudimos generar la nota de crédito. Probá de nuevo en unos minutos. | Server Action / 500 | Reintentar la operación sin duplicar la devolución ya registrada. |

---

## 8. Módulo Bot Estático de WhatsApp (`BOT`)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
| :--- | :--- | :--- | :--- |
| `NX-BOT-001` | Este módulo todavía no está activo en tu cuenta. | Feature Flag / 403 | Redirigir a `/configuracion/modulos` con la ficha del Módulo Bot de WhatsApp. |
| `NX-BOT-002` | Los mensajes automáticos no pueden quedar vacíos. Completá al menos uno para activar el bot. | Validación / 400 | Resaltar los campos de mensaje vacíos antes de permitir `activo = true`. |
| `NX-BOT-003` | No pudimos cargar las respuestas automáticas del bot en este momento. | Repositorio / Vidriera pública / interno (no bloqueante) | Registrar el fallo en Sentry sin interrumpir la carga del catálogo; el resto de la vidriera se sigue sirviendo con normalidad. |

---

## 9. Módulo Administración y Facturación NODEXA (`ADM`)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
| :--- | :--- | :--- | :--- |
| `NX-ADM-001` | Ya existe un comercio registrado con este slug o dominio. | Validación / 409 | Sugerir un slug alternativo antes de reintentar el alta. |
| `NX-ADM-002` | El comercio tiene el pago suspendido. Regularizá la situación para reactivar el acceso. | Estado de cuenta / 402 | Mostrar contacto directo por WhatsApp según SOP-04, sin aplicar fee de reactivación en la fase actual. |
| `NX-ADM-003` | No podés ampliar el catálogo por debajo del uso actual de productos. | Validación de negocio / 400 | Mostrar el conteo de SKUs activos como referencia mínima al modificar `limite_sku`. |
| `NX-ADM-004` | No pudimos actualizar el estado del comercio. Probá de nuevo. | Server Action / 500 | Reintentar la actualización de `estado_pago` o `tenant_modules` desde el panel admin. |