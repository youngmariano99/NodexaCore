# ROADMAP UNIFICADO DE AUDITORÍA Y CORRECCIONES (NODEXA CORE)

**Fecha de Consolidación:** 31 de Agosto de 2026
**Objetivo:** Este documento unifica todos los hallazgos de las fases 1 y 2 de la auditoría Enterprise. Sirve como un listado de tareas (Checklist) directamente accionable para sanear la arquitectura, base de datos, backend y frontend del sistema.

---

## 1. Seguridad Zero-Trust y RLS
- [ ] **Fix Crítico de RLS Cuentas Corrientes:** Modificar migración 20260824050000_ampliar_cuentas_corrientes.sql. Reemplazar (auth.jwt() -> 'app_metadata' ->> 'cliente_id') por (auth.jwt() ->> 'cliente_id').
- [ ] **Restringir FOR ALL en RLS:** Eliminar el FOR ALL USING sin WITH CHECK en cuentas corrientes e imputaciones. Dividir explícitamente en FOR SELECT y FOR INSERT para impedir borrados y escaladas.

## 2. Motor Ledger e Integridad Financiera
- [ ] **Fix Inmutabilidad (Append-Only):** Eliminar la sentencia UPDATE sobre movimientos_cuenta_corriente dentro del Server Action egistrarPagoCuentaCorriente.ts. Calcular el saldo pendiente al vuelo (on-the-fly) mediante sumatorias o Vistas en BD.
- [ ] **Desglose Impositivo:** Añadir a entas y enta_items los campos necesarios para facturación fiscal (Ej. ase_imponible, iva_10_5, iva_21, exento, percepciones).
- [ ] **Trazabilidad de Cobro:** Añadir campo metodo_pago directamente a la cabecera de la tabla entas.
- [ ] **Concurrencia Optimista:** Agregar el campo lock_version INTEGER DEFAULT 0 a las tablas transaccionales (entas, movimientos_stock, movimientos_cuenta_corriente) para evitar el problema de "Lost Updates".

## 3. Control de Inventarios y Logística
- [ ] **Contabilidad de Costos:** Agregar costo_promedio y ultimo_costo a la tabla productos.
- [ ] **Costo de Mercadería Vendida (CMV):** Agregar la columna costo_unitario a la tabla movimientos_stock para congelar el valor histórico al momento del movimiento.
- [ ] **Soporte Escáner:** Agregar codigo_barras (EAN-13/UPC) a la tabla productos.
- [ ] **Ruteo y Geolocalización:** Mejorar el trigger n_validar_pedido_web para que verifique estrictamente que el JSONB de entrega contenga latitud y longitud (indispensable para Google Maps).

## 4. Validaciones y Prevención de Errores (Zod/Frontend)
- [ ] **Validación Estricta de Teléfonos:** Actualizar el esquema Zod en crearClienteFinal.ts para usar un Regex que obligue al formato internacional correcto (^\+?[1-9]\d{9,14}$), garantizando que los links de WhatsApp no se rompan.
- [ ] **Prevención de Formularios:** Añadir la validación en tiempo real en los onChange o al perder el foco en el Front (para no consumir requests fallidos al servidor).

## 5. Experiencia de Usuario e Interfaz (Lean UX / UI)
- [ ] **Productividad de Mostrador (Hotkeys):** Integrar atajos de teclado (ej. Enter para cobrar, Esc para cancelar, F3 para buscador) en el módulo POS/Mostrador.
- [ ] **Máscaras de Entrada:** Utilizar eact-imask o similar en los inputs sensibles (teléfonos, montos, CUIT) para guiar al usuario.
- [ ] **Alineación Visual (Ley Cero):** Reemplazar emojis (🟢, 🟡, 🔴) en DashboardRiesgoCaja.tsx por íconos de lucide-react.
- [ ] **Limpieza de Colorimetría:** Cambiar los fondos modales de g-black/60 (negro puro) a la variante oscura corporativa (ej. g-[#090B0B]/80).
- [ ] **Feedback Positivo Sólido:** Asegurar que cada Server Action termine en una notificación/toast clara de "Guardado con éxito" en lugar de cierres silenciosos de modales.


## 6. Saneamiento de Datos y UX de Validaciones (Zod + Frontend)
- [ ] **Saneamiento Automático Backend (Zod Transforms):** En lugar de rechazar datos imperfectos, el backend debe limpiarlos automáticamente:
  - **Teléfonos:** Limpiar espacios y guiones mediante .transform((val) => val.replace(/[\s-]/g, '')) antes de validar el regex internacional.
  - **CUIT/CUIL:** Remover guiones automáticamente y validar longitud estricta de 11 dígitos numéricos.
  - **Emails:** Añadir .toLowerCase().trim() universalmente.
  - **Nombres/Textos:** Reducir espacios múltiples (.replace(/\s+/g, ' ')) para evitar basura en la BD.
  - **SKU/Códigos de Barra:** Forzar .toUpperCase() y eliminar espacios.
- [ ] **Validación Activa en Frontend (React Hook Form):** Mostrar un pequeño tilde verde (✅) al lado del input cuando el dato es válido en tiempo real (onBlur o onChange), evitando que el usuario envíe formularios con error.
- [ ] **Helper Texts Didácticos:** Agregar textos explicativos sutiles debajo de inputs complejos (ej. *"Ingresá solo los números, nosotros agregamos los guiones"*).

## 7. Integridad de Datos Contables (Localización y Prevención de Corrupción)
- [ ] **Corrupción Silenciosa de Moneda (Fix Crítico):** Reemplazar z.coerce.number() en los Server Actions de ingresos financieros (egistrarPagoCuentaCorriente.ts, crearProducto.ts, confirmarVenta.ts). Actualmente, si un usuario ingresa "30.000" (formato argentino), JavaScript lo convierte a 30, generando corrupción contable silenciosa. 
  - **Solución Zod:** Aplicar un .transform() pre-procesador que limpie separadores de miles y convierta comas a puntos *antes* de castear a Number: .transform(val => Number(val.replace(/\./g, '').replace(',', '.'))).
- [ ] **Localización de Inputs (Frontend):** Cambiar los campos de montos de <input type="number"> a <input type="text" inputMode="decimal"> manejados por un formateador (ej. eact-number-format). El 	ype="number" nativo del navegador bloquea o corrompe las comas decimales según la configuración regional del S.O.
- [ ] **Prevención de Extremos (Negativos/Ceros):** Asegurar que Zod tenga siempre los validadores .positive("El monto no puede ser negativo ni cero") mapeados a los códigos de error del catálogo (ej. NX-PRD-004 para productos, NX-FIA-004 para pagos). Si bien los inputs tienen min="0", cualquier salto de validación en HTML pasaría montos perjudiciales al Ledger.
