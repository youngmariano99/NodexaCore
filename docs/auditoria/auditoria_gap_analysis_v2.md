# Reporte de Auditoría y Gap Analysis: NODEXA CORE (Ampliación End-to-End)

**Fecha:** 31 de Agosto de 2026
**Rol:** Auditor Senior de Sistemas (MIS) / Arquitecto de Software Enterprise / Lean UX Experto

Este documento es una extensión exhaustiva de la primera auditoría, cubriendo el ciclo de vida completo de los módulos de interfaz de usuario (UX/UI), integridad transaccional (Ledger), logística/inventarios y las validaciones de datos.

---

## 1. Experiencia de Usuario e Interfaz (Lean UX / UI)

### 🔴 Brechas Detectadas
* **Carencia de Atajos de Teclado (Mostrador/POS):** El módulo de ventas de mostrador (`confirmarVenta.ts` y componentes UI) depende exclusivamente de interacciones con el mouse. No se detectaron *event listeners* globales ni hooks de atajos (hotkeys) para acelerar procesos clave como cobrar (`Enter`), enfocar buscador de productos (`F3` / `Ctrl+K`), o cancelar (`Esc`).
* **Micro-interacciones y Feedback:** Si bien hay estados de carga (`isPending`), no hay un sistema robusto de confirmación visual no intrusiva post-transacción que asegure al 100% que los datos fueron guardados correctamente (eliminando la duda del usuario).
* **Ausencia de Máscaras y Placeholders Estrictos:** Los formularios, como `FormularioCrearClienteFinal.tsx`, utilizan placeholders básicos (`Ej: +5491122334455`) pero no limitan físicamente el input ni guían de forma didáctica al usuario si comete errores temporales antes del envío.

### 🟢 Recomendación
- Implementar la librería `react-hotkeys-hook` para permitir el manejo 100% por teclado del módulo POS.
- Incorporar máscaras de input (ej. `react-imask`) y popovers didácticos ("Tooltips de primer uso") para facilitar la curva de aprendizaje.

---

## 2. Integridad Transaccional y Financiera (Motor Ledger)

### 🔴 Brechas Detectadas
* **Ventas y Desglose Impositivo:** Las tablas `ventas` y `venta_items` solo contemplan `total` y `subtotal`. **No existen columnas** para el desglose fiscal requerido por AFIP (alícuotas de IVA, montos exentos, percepciones/retenciones). Esto hace inviable la facturación electrónica estricta.
* **Partida Doble y Medios de Pago:** La tabla `ventas` no contiene un registro del `metodo_pago` utilizado, ni está vinculada a un libro mayor contable general para ventas al contado. Los pagos solo se registran correctamente si van a cuentas corrientes.
* **Concurrencia Optimista (Lost Updates):** Se verificó la existencia del campo `idempotency_key` en ventas, lo cual es excelente. Sin embargo, **ninguna** de las tablas transaccionales (`ventas`, `movimientos_stock`, `movimientos_cuenta_corriente`) implementa el campo `lock_version` (revisiones). Esto expone al sistema a sobreescrituras concurrentes.

### 🟢 Recomendación
- Ampliar el esquema `ventas` y `venta_items` con campos JSONB estructurados o columnas decimales específicas para base imponible, iva_10_5, iva_21, percepciones_iibb.
- Implementar `lock_version INTEGER DEFAULT 0` y forzar chequeos concurrentes en el UPDATE transaccional.

---

## 3. Control de Inventario y Logística

### 🔴 Brechas Detectadas
* **Contabilidad de Costos Inexistente:** El catálogo de `productos` únicamente posee `precio`, sin contemplar `costo_promedio` ni `ultimo_costo`. Adicionalmente, `movimientos_stock` no graba el costo unitario histórico de la mercadería al momento del ingreso/egreso. **Impacto:** Imposibilidad matemática de calcular el Costo de Mercadería Vendida (CMV) ni la rentabilidad real.
* **Códigos de Barra Universales:** La tabla `productos` se basa en un `sku` interno genérico. Carece de soporte específico para códigos universales (`codigo_barras` EAN-13/UPC), lo cual dificulta la integración fluida con lectores láser estándar.
* **Geolocalización Ineficiente (Delivery):** En `pedidos_web`, los datos del cliente se guardan en un campo `datos_cliente JSONB`. La función de base de datos `fn_validar_pedido_web` **solo valida que sea un objeto**, pero no exige la presencia de coordenadas (latitud/longitud) estructurales. Esto impide la integración directa y automatizada con APIs de ruteo como Google Maps.

### 🟢 Recomendación
- Alterar `productos` agregando `costo_promedio`, `ultimo_costo`, y `codigo_barras`.
- Enriquecer `movimientos_stock` con `costo_unitario`.
- Reforzar el trigger `fn_validar_pedido_web` para exigir esquemas estrictos (JSON Schema validation) que garanticen `latitud` y `longitud` si la `opcion_entrega` es 'envio'.

---

## 4. Validaciones Frontend y Backend

### 🔴 Brechas Detectadas
* **Saneamiento Incompleto (Teléfonos):** En `FormularioCrearClienteFinal.tsx` y su respectivo Server Action (`crearClienteFinal.ts`), la validación Zod del teléfono es: `.string().trim().nullish()`.
**Impacto:** Permite ingresar datos basura como "123" o letras, lo cual rompe posteriormente funcionalidades críticas de negocio, como el botón de reclamo de deudas de WhatsApp (que requiere códigos de área internacionales válidos y longitudes de +10 dígitos).
* **Prevención Temprana Cero:** El cliente puede enviar el formulario con datos de contacto inservibles sin recibir ningún warning preventivo en la UI.

### 🟢 Recomendación
- Ajustar Zod añadiendo un Regex para números internacionales telefónicos: `.regex(/^\+?[1-9]\d{9,14}$/, "Número inválido")`.
- Implementar validación cruzada sincrónica en el `onChange` del Frontend para bloquear el envío antes de saturar el servidor.

---

### Resumen de Próximos Pasos

Este documento sirve como hoja de ruta arquitectónica. De ser aprobado, los desarrollos prioritarios deben enfocarse en:
1. **Fix Crítico:** Refactor del Motor Ledger (Desglose impositivo, CMV, y Concurrencia Optimista).
2. **Fix Crítico:** Esquemas estrictos de validación en Server Actions (Teléfonos, Lat/Long).
3. **UX Upgrade:** Soporte de Hotkeys para mostrador y máscaras de campos.
