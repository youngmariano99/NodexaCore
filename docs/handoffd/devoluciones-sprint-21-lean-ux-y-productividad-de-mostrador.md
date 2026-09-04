# Handoffs y Entregables del Sprint - Sprint 21: Lean UX y Productividad de Mostrador

**Objetivo:** Optimizar la velocidad operativa en el mostrador usando atajos de teclado y aplicar las leyes de diseño mejorando máscaras y feedback visual.
**Capacidad:** 20 Ptos | **Duración:** 2 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: Atajos de Teclado para el POS
*Criterios de Aceptación/Descripción:*
```text
Como cajero quiero operar el módulo de ventas mediante el teclado para cobrar y buscar productos más rápido frente al cliente.
```

### 📄 [✔ COMPLETADA] Implementar gestor de atajos en vistas de Mostrador
- **Rol:** Frontend
- **Componente/Ruta:** `Vistas de Mostrador` (src/app/(app)/mostrador/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el hook modular useHotkeys para el manejo de atajos de teclado y se integró en las vistas de Mostrador/POS para permitir el ciclo completo de venta (búsqueda con F2//, navegación con flechas, selección con Enter, cobro con Enter y cancelación con Esc) sin requerir interacción con mouse.

**Archivos Modificados:**
- `src/hooks/useHotkeys.ts`
- `src/hooks/useHotkeys.test.ts`
- `src/app/(app)/mostrador/BuscadorProductos.tsx`
- `src/app/(app)/mostrador/ConfirmarCobro.tsx`
- `src/app/(app)/mostrador/SelectorClienteMostrador.tsx`
- `src/app/layout.tsx`

**Contratos y API signatures:**
- `export function useHotkeys(keys: string | string[], callback: (event: KeyboardEvent) => void, options?: HotkeyOptions): void`
- `export function coincideEventoConCombinacion(event: EventoTecladoMinimo, combo: string): boolean`
- `export function parsearCombinacion(combo: string): { ctrl: boolean, shift: boolean, alt: boolean, meta: boolean, key: string }`
- `export function esElementoInput(elemento: unknown): boolean`


--- 

## 🎯 HU: Saneamiento Visual y Máscaras Contables
*Criterios de Aceptación/Descripción:*
```text
Como experto UX quiero corregir colores puros, remover emojis e implementar máscaras nativas para prevenir errores de tipeo.
```

### 📄 [✔ COMPLETADA] Refactor de Inputs y Feedback en Frontend
- **Rol:** Frontend
- **Componente/Ruta:** `Varios Componentes` (src/app/(app)/)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el componente de máscara contable InputDinero para entradas monetarias locales, se estandarizaron los backdrops de modales a la paleta corporativa bg-[#090B0B]/80, se eliminaron los emojis nativos reemplazándolos por iconografía vectorial de lucide-react y se integró un sistema global de notificaciones ToastProvider consumido en todas las Server Actions clave.

**Archivos Modificados:**
- `src/components/ui/InputDinero.tsx`
- `src/components/ui/InputDinero.test.ts`
- `src/components/ui/Toast.tsx`
- `src/components/layout/AppLayoutClient.tsx`
- `src/components/fiados/DashboardRiesgoCaja.tsx`
- `src/components/fiados/PadronClientesTabla.tsx`
- `src/app/(app)/clientes/FormularioCrearClienteFinal.tsx`
- `src/app/(app)/clientes/[clienteFinalId]/FormularioPagoCuentaCorriente.tsx`
- `src/app/(app)/proveedores/FormularioProveedores.tsx`
- `src/app/(app)/stock/movimientos-stock.tsx`
- `src/app/(app)/productos/[productoId]/formulario-edicion-producto.tsx`
- `src/app/(app)/productos/nuevo/Paso1DatosGenerales.tsx`
- `src/app/(app)/productos/nuevo/formulario-alta-producto.tsx`
- `src/app/(app)/catalogo-web/personalizacion/FormularioConfiguracionCatalogo.tsx`

**Contratos y API signatures:**
- `export function InputDinero(props: InputDineroProps): JSX.Element`
- `export function formatearMascaraMoneda(valor: string | number | undefined | null): string`
- `export function desformatearMascaraMoneda(valor: string): number`
- `export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element`
- `export function useToast(): { toast: { exito, error, advertencia, info }, removerToast }`


--- 

