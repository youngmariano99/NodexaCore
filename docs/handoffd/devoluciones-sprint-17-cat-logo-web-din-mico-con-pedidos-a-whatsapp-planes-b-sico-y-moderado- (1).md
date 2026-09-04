# Handoffs y Entregables del Sprint - Sprint 17: Catálogo Web Dinámico con Pedidos a WhatsApp (Planes Básico y Moderado)

**Objetivo:** Habilitar la landing de pedidos con carrito optimizado sin registro (guardado en caché/localStorage), reglas dinámicas de envío, descuentos por método de pago, envío estructurado de comandas a WhatsApp y soporte PWA.
**Capacidad:** 20 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** PLANIFICADO

--- 

## 🎯 HU: Landing de Pedidos sin Fricción (PWA)
*Criterios de Aceptación/Descripción:*
```text
Como cliente final quiero navegar por el catálogo en mi celular e instalarlo como una PWA para realizar pedidos de forma rápida y sencilla sin necesidad de registrarme.
```

### 📄 [✔ COMPLETADA] Soporte PWA e Instalación Local
- **Rol:** Frontend
- **Componente/Ruta:** `Manifiesto PWA y Service Workers` (public/manifest.json / src/app/sw.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el soporte completo de PWA dinámica por comercio en src/app/manifest.ts, resolviendo en tiempo de ejecución el subdominio/tenant actual para personalizar el nombre comercial, los colores de su plantilla y su logo nativo. Se incluyeron el manifiesto estático de respaldo public/manifest.json, el Service Worker para caché offline en public/sw.js y el componente discreto BannerInstalacionPwa.tsx. Se validaron lint, build y pruebas unitarias en verde, enviando la PR #91 en GitHub.

**Archivos Modificados:**
- `src/app/manifest.ts`
- `public/manifest.json`
- `public/sw.js`
- `src/app/sw.ts`
- `src/app/layout.tsx`
- `src/components/pwa/BannerInstalacionPwa.tsx`
- `src/components/pwa/BannerInstalacionPwa.test.tsx`

**Contratos y API signatures:**
- `manifest(): Promise<MetadataRoute.Manifest>`
- `BannerInstalacionPwa(): JSX.Element`


### 📄 [✔ COMPLETADA] Checkout de Pedidos con Datos Persistidos en LocalStorage
- **Rol:** Frontend
- **Componente/Ruta:** `CheckoutPedidoForm` (src/components/catalogo-web/CheckoutPedidoForm.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el formulario de checkout de pedidos CheckoutPedidoForm.tsx y el hook personalizado usePersistedForm.ts. El formulario solicita Nombre, Teléfono, Dirección de Envío, Método de Pago y Notas, persistiendo todos los campos en tiempo real en localStorage para pre-cargarlos automáticamente en futuras visitas del comprador sin necesidad de re-escritura. Se validaron lint, build y pruebas unitarias en verde, registrando la PR #93 en GitHub.

**Archivos Modificados:**
- `src/components/catalogo-web/CheckoutPedidoForm.tsx`
- `src/components/catalogoWeb/CheckoutPedidoForm.tsx`
- `src/components/catalogo-web/CheckoutPedidoForm.test.tsx`
- `src/hooks/usePersistedForm.ts`

**Contratos y API signatures:**
- `CheckoutPedidoForm({ onConfirmarPedido, estaEnviando }: CheckoutPedidoFormProps): JSX.Element`
- `usePersistedForm<T extends object>(key: string, initialValues: T)`
- `DatosFormularioCheckout: { nombre: string, telefono: string, direccion: string, metodoPago: string, opcionEntrega: 'envio' | 'retiro', notas: string }`


--- 

## 🎯 HU: Configuración de Envío, Descuentos y Cierre en WhatsApp
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero definir costos de envío y descuentos automáticos por método de pago para que el carrito envíe el total exacto de la orden a mi WhatsApp de soporte.
```

### 📄 [✔ COMPLETADA] Lógica de Negocio en Frontend para Descuentos y Métodos de Pago
- **Rol:** Frontend
- **Componente/Ruta:** `useCarritoCatalogo` (src/hooks/useCarritoCatalogo.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó el hook useCarritoCatalogo.ts con la lógica completa para cálculo dinámico del subtotal, costo de envío por zona seleccionada, porcentaje configurable de descuento o recargo según el método de pago seleccionado, y generación del mensaje formateado de comanda para la API pública de WhatsApp (incluyendo datos de cliente, desglose de items, opción de entrega y resumen de totales). Se incluyeron las pruebas unitarias en Vitest, se verificaron build y lint en verde y se envió la PR #92 en GitHub.

**Archivos Modificados:**
- `src/hooks/useCarritoCatalogo.ts`
- `src/hooks/useCarritoCatalogo.test.ts`

**Contratos y API signatures:**
- `useCarritoCatalogo(reglasPagoPersonalizadas?: ReglaMetodoPago[], zonasEnvio?: ZonaEnvio[])`
- `ReglaMetodoPago: { metodoPago: string, etiqueta: string, tipoAjuste: 'descuento' | 'recargo' | 'ninguno', porcentaje: number }`
- `ZonaEnvio: { id: string, nombre: string, costo: number }`
- `ItemCarrito: { productoId: string, nombre: string, precio: number, cantidad: number, varianteNombre?: string, imagenUrl?: string | null }`
- `DatosClienteCheckout: { nombre: string, telefono: string, direccion?: string, notas?: string }`


### 📄 [✔ COMPLETADA] Configuración Administrativa de Horarios y Pedidos
- **Rol:** Frontend
- **Componente/Ruta:** `FormularioConfiguracionCatalogo` (src/app/(app)/catalogo-web/personalizacion/FormularioConfiguracionCatalogo.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se creó el componente administrativo FormularioConfiguracionCatalogo.tsx para permitir la configuración de horarios de atención (apertura/cierre), banners flotantes de ofertas promocionales y tarifas de envío por zonas. Se implementó el helper verificarHorarioAtencion.ts que valida en tiempo real si el comercio se encuentra abierto y genera el aviso informativo para reemplazar el botón de compra cuando el local está cerrado. Se validaron lint, build y pruebas unitarias en verde, enviando la PR #94 en GitHub.

**Archivos Modificados:**
- `src/app/(app)/catalogo-web/personalizacion/FormularioConfiguracionCatalogo.tsx`
- `src/app/(app)/catalogo-web/personalizacion/FormularioConfiguracionCatalogo.test.tsx`
- `src/lib/dominio/catalogoWeb/verificarHorarioAtencion.ts`

**Contratos y API signatures:**
- `FormularioConfiguracionCatalogo({ configuracionInicial }: FormularioConfiguracionCatalogoProps): JSX.Element`
- `verificarHorarioAtencion(horarioApertura?: string | null, horarioCierre?: string | null, horarioActivo?: boolean, fechaEvaluar?: Date): ResultadoHorarioAtencion`
- `ConfiguracionCatalogoData: { horarioApertura: string, horarioCierre: string, horarioActivo: boolean, bannerTexto: string, bannerActivo: boolean, zonasEnvio: ZonaEnvioConfig[] }`


--- 

