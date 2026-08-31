# MANUAL DEFINITIVO DE ESTÁNDARES Y BUENAS PRÁCTICAS (NODEXA CORE)

Este documento establece los pilares arquitectónicos, normativos, algorítmicos y de diseño interactivo de Nodexa Core. Su objetivo es garantizar que el sistema SaaS resuelva la operatividad diaria, actúe como escudo legal y funcione como motor de inteligencia estratégica para las PyMEs[cite: 3].

---

## 1. REGISTRO DE DATOS Y NORMATIVAS CONTABLES (MOTOR LEDGER)

Para asegurar que los datos no contengan errores que generen pérdidas de dinero y cumplan con las leyes, la base de datos debe operar como un motor financiero estricto.

*   **Contabilidad de Partida Doble:** El esquema relacional debe garantizar matemáticamente que la sumatoria de débitos y créditos de cada transacción siempre sea igual a cero (Ecuación Patrimonial Fundamental)[cite: 3]. La base de datos debe contar con entidades segregadas (`transactions`, `accounts`, `entries`) y rechazar cualquier operación que no balancee matemáticamente[cite: 8].
*   **Inmutabilidad (Append-Only Log):** Queda categóricamente prohibido ejecutar comandos SQL de tipo `UPDATE` o `DELETE` sobre el historial de transacciones financieras o de stock[cite: 3, 4, 8]. Cualquier error humano (ej. venta mal cobrada) debe subsanarse exigiendo la emisión de "contra-asientos" (reversiones) que neutralicen el efecto original, dejando un rastro de auditoría prístino[cite: 3, 5, 8].
*   **Cumplimiento Fiscal Argentino:** El sistema debe integrarse nativamente con los Controladores Fiscales de Nueva Tecnología[cite: 3, 4]. Debe obligar sistémicamente a la emisión del **Reporte Z** diario (arqueo ciego) y automatizar la descarga y encriptación de la **Cinta Testigo Digital (CTD)**[cite: 3, 4].
*   **Retención Documental (Ley 11.683):** Para evitar multas y clausuras, la infraestructura cloud debe garantizar la retención digital de los comprobantes fiscales por al menos 11 años[cite: 3, 5]. Se debe usar un esquema de almacenamiento estratificado: *Hot Storage* (0-24 meses), *Warm Storage* (25-48 meses) y *Cold Storage* con candados WORM (Write Once, Read Many) para los años 5 a 11[cite: 3].

---

## 2. RENDIMIENTO, ESCALABILIDAD SaaS Y PREVENCIÓN DE PÉRDIDA DE DATOS

Al ser un SaaS con alto volumen de transacciones concurrentes, el sistema debe proteger la integridad de los datos y su rendimiento.

*   **Idempotencia y Concurrencia Optimista:** Para evitar la creación duplicada de ventas o registros por solicitudes simultáneas (ej. fallos de red), el sistema debe usar llaves de idempotencia y un campo de versión (`lock_version`) en las entidades[cite: 3, 7, 8].
*   **Aislamiento Multi-Tenant:** El aislamiento entre comercios es obligatorio mediante *Row Level Security* (RLS) en PostgreSQL, validando el `cliente_id`[cite: 18]. Queda prohibido usar `USING (true)` en políticas de mutación de datos[cite: 18].
*   **Paginación y Caché:** Toda consulta de listados debe paginarse en el servidor (prohibido `SELECT *` sin `LIMIT`)[cite: 18]. Las vistas públicas deben servirse con caché de Edge para minimizar impactos en la base de datos[cite: 18].
*   **Captura Única (BPR):** Aplicando la Reingeniería de Procesos, la información debe capturarse una sola vez en su origen (cero doble carga)[cite: 3, 5, 11].

---

## 3. TRAZABILIDAD Y AUDITORÍA COMPLETA

*   **Segregación de Funciones (SoD):** Ninguna persona debe tener la capacidad para iniciar, aprobar, ejecutar y reconciliar una transacción por sí misma[cite: 3, 4]. El sistema debe aplicar controles cruzados (ej. bloquear ventas si se excede el límite de crédito sin aprobación gerencial)[cite: 3, 11].
*   **Auditoría Asíncrona por Diffs:** Toda operación crítica debe generar un log de auditoría en *background* (ej. usando `after()` en Next.js) para no penalizar el tiempo de respuesta[cite: 7, 28]. Solo se guardará el diferencial: campo, valor anterior, valor nuevo, usuario y timestamp[cite: 7, 18, 28].
*   **Borrado Lógico:** Queda prohibida la eliminación física de entidades principales de negocio; se utilizará exclusivamente el borrado lógico mediante la columna `eliminado_en`[cite: 7, 18].

---

## 4. INTERFAZ INTUITIVA (NUX) Y EFICIENCIA OPERATIVA

La interfaz debe absorber toda la complejidad técnica y contable, permitiendo que cualquier persona aprenda a usar el sistema en tiempo récord.

*   **Leyes Cero de Nodexa:** 
    1. **Cero Emojis:** Uso exclusivo de íconos vectoriales (`lucide-react`) para proyectar madurez corporativa[cite: 3, 17, 19].
    2. **Prevención Fail-Fast:** Los formularios deben validar los datos instantáneamente en el cliente (con Zod) antes de enviar peticiones al servidor, arrojando mensajes claros referenciados en `ERRORS.md`[cite: 3, 7, 13, 18].
    3. **Colorimetría Semántica:** Uso del **Fondo Base Oscuro (#090B0B)** para evitar fatiga visual, y el **Verde Nodexa (#16D39A)** reservado exclusivamente para botones de acción primarios[cite: 3, 13, 17, 19].
    4. **Áreas Táctiles Accesibles:** Ningún botón o enlace tendrá dimensiones inferiores a **44x44 píxeles** para evitar toques accidentales en terminales POS móviles o táctiles[cite: 3, 17, 18].
*   **Jerarquía Tipográfica:** Uso de la fuente **Inter** para la lectura general de la interfaz, y obligatoriamente **JetBrains Mono** para alinear verticalmente datos críticos, importes y tablas financieras[cite: 3, 17].
*   **Trinidad de Conversión y Gestiones Inline:** Para evitar que el usuario pierda el contexto (interrupciones cognitivas), las altas rápidas (ej. nuevo cliente durante una venta) deben hacerse de forma *inline* mediante cajones laterales o modales[cite: 3]. Todo flujo debe tener: Contexto claro, Llamada a la acción (CTA) evidente y Retroalimentación de estado inmediata[cite: 3, 10].

---

## 5. INFORMACIÓN ESTRATÉGICA Y BUSINESS INTELLIGENCE (CMI)

El sistema no debe saturar al comerciante con tablas masivas de datos; debe sintetizar la información para la toma de decisiones utilizando el enfoque del Cuadro de Mando Integral (Balanced Scorecard)[cite: 6, 9, 16, 26].

*   **Tableros (Dashboards) Minimalistas:** Mostrar únicamente Indicadores Clave (KPIs) estratégicos de primer nivel, como el DSO (Días de Cobro Pendiente), la Rotación de Inventario y el Margen Neto Estimado[cite: 3].
*   **Técnica Drill-Down:** La interfaz analítica debe permitir desglosar la información (perforación) de lo macro a lo micro únicamente cuando el usuario lo solicite (ej. de Rentabilidad Global a la factura causante de una anomalía)[cite: 3, 6].

---

## 6. PREPARACIÓN PARA CIENCIA DE DATOS E INTELIGENCIA ARTIFICIAL

Cada dato debe estructurarse para ser consumido por motores analíticos que brinden un valor prescriptivo al negocio.

*   **Modelos Predictivos (Data Mining):** El backend aprovisionará microservicios (Python, Scikit-learn, Apache Superset) para aplicar Suavizamiento Exponencial en productos de alta rotación, modelos ARIMA para tendencias estacionales, y simulaciones Monte Carlo para el cálculo de inventario de seguridad frente a rupturas de stock[cite: 3].
*   **Visión Artificial Multimodal:** Para la carga automatizada de comprobantes, se superará el OCR tradicional integrando modelos Transformers como **LayoutLMv3**[cite: 3, 5]. Estos modelos entienden el texto, la imagen y la disposición espacial (coordenadas bidimensionales), permitiendo extraer datos con precisión casi humana y almacenándolos en bases JSONB[cite: 3, 5]. Se requerirá intervención humana (Human-in-the-Loop) solo si el umbral de confianza de la IA es bajo[cite: 5].
*   **Asistentes RAG para Procesos (SOPs):** La digitalización del conocimiento interno utilizará Generación Aumentada por Recuperación (RAG) para que los manuales de la empresa sean consultados por los empleados mediante un chat interactivo, reduciendo tiempos de entrenamiento y errores operativos[cite: 15].