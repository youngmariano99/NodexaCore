# CLAUDE.md - Resumen Ejecutivo del Proyecto

## 1. Información General del Proyecto
- **Nombre:** Nodexa Core
- **Descripción:** No especificado
- **Idioma Principal:** Español (Latinoamérica) para variables, funciones, parámetros y comentarios.

## 3. Comandos Frecuentes
- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Construcción de producción.
- `npm run test`: Ejecución de pruebas unitarias e integración.

## 4. Reglas Críticas e Innegociables
- **seguridad:**
  * OWASP Top 10 aplicado en todas las capas
  * Autenticación JWT (1 hora) y Autorización RLS en PostgreSQL
  * Prevención IDOR/BOLA por validación de cliente_id
  * Sanitización estricta de input/output con Zod y DOMPurify
- **escalabilidad:**
  * Clean Architecture y Diseño Guiado por el Dominio (DDD)
  * Modularidad Plug & Play mediante Feature Flags por Tenant
  * Paginación obligatoria en servidor (Cero SELECT * sin LIMIT)
  * Normalización de base de datos en Tercera Forma Normal (3FN)
- **dx:**
  * Tipado Estático Fuerte en TypeScript (Prohibido el tipo 'any')
  * Límite máximo de 500 a 600 líneas de código por archivo
  * Idioma de desarrollo obligatoriamente en Español Latinoamericano
  * Patrón de validación en puerta (Fail-Fast)
- **testing:**
  * TDD (Test-Driven Development) para lógica core de negocio
  * Pirámide 70% Unitarias (Vitest), 20% Integración, 10% E2E (Playwright)
- **trazabilidad:**
  * Auditoría Asíncrona registrando únicamente Diffs de base de datos (con after())
  * Catálogo de Errores Normalizados en cliente y servidor (ERRORS.md)
  * Prohibición de logs en consola con datos sensibles o credenciales
- **robustez:**
  * DTOs validados y tipados de extremo a extremo
  * Patrón Repository para desacoplar el ORM de la interfaz
  * Idempotencia y Anti-Race Conditions con concurrencia optimista (lock_version)
  * Borrado Lógico obligatorio (Soft Delete con columna eliminado_en)
- **devops:**
  * Pipelines CI/CD automatizados con validación de tests previa al deploy
  * Aislamiento de Service Role Key exclusiva para servidor/cron jobs
  * Prohibición de hardcoding y exposición de credenciales en NEXT_PUBLIC_
- **motor_ledger:**
  * Contabilidad de Partida Doble: sumatoria de débitos y créditos igual a cero (entidades segregadas transactions, accounts, entries)
  * Inmutabilidad estricta (Append-Only Log): prohibido UPDATE o DELETE sobre historial financiero o movimientos de stock; corrección exclusiva vía contra-asientos/reversiones
  * Cumplimiento fiscal argentino: integración con controladores fiscales, emisión obligatoria de Reporte Z y Cinta Testigo Digital (CTD)
  * Retención documental (Ley 11.683): almacenamiento estratificado Hot (0-24m), Warm (25-48m) y Cold con candados WORM (5-11 años)
- **rendimiento_saas:**
  * Concurrencia Optimista con lock_version e Idempotencia con idempotency_key
  * Aislamiento Multi-Tenant estricto vía RLS con cliente_id (prohibido USING (true) en mutaciones)
  * Paginación en servidor y Edge Caching en vistas públicas
  * Captura Única de Datos (BPR): cero doble carga
- **trazabilidad_sod:**
  * Segregación de Funciones (SoD): controles cruzados de autorización/ejecución/reconciliación
  * Auditoría asíncrona por Diffs en background (after())
  * Borrado Lógico universal (eliminado_en) en todas las tablas principales
- **nux_interfaz:**
  * Leyes Cero de Nodexa: Cero Emojis (solo lucide-react), Fail-Fast con Zod y ERRORS.md, Fondo Base Oscuro (#090B0B) con Verde Nodexa (#16D39A) exclusivo para CTA primario, y Áreas Táctiles mínimas de 44x44px
  * Jerarquía tipográfica: Inter para lectura/UI general y JetBrains Mono para precios, datos y tablas
  * Trinidad de conversión y gestiones inline: altas rápidas contextuales, CTA evidente y feedback inmediato con toasts
- **bi_estrategico:**
  * Tableros minimalistas con KPIs estratégicos (DSO, Rotación de Inventario, Margen Neto Estimado)
  * Técnica Drill-Down para desglosar métricas de lo macro a lo micro bajo demanda
- **ai_data_science:**
  * Modelos predictivos: Suavizamiento Exponencial, ARIMA y Monte Carlo para inventario de seguridad
  * Visión artificial multimodal: LayoutLMv3 para comprobantes con validación Human-in-the-Loop
  * Asistentes RAG interactivos para digitalización de SOPs y manuales operativos

## 5. Índice de Documentación (Leer Bajo Demanda)
Antes de planificar o ejecutar una tarea compleja, lee el documento correspondiente en la carpeta `docs/`:
- **Base de Datos y Entidades:** Para crear tablas, modificar migraciones o consultar el modelo físico, lee `docs/SCHEMA.md`.
- **Rutas, Navegación y Flujos:** Para agregar vistas, controladores o consultar el mapa de rutas del sitio, lee `docs/SITEMAP.md`.
- **Roles, Accesos y RLS:** Para chequear permisos y políticas RLS de base de datos, lee `docs/ROLES.md`.
- **Estrategia de Datos Semilla:** Para sembrar fixtures o mock de pruebas locales, lee `docs/SEED.md`.
- **Diccionario de Excepciones:** Para verificar códigos de error estandarizados, lee `docs/ERRORS.md`.
- **Inicialización y CI/CD:** Para revisar pipelines, tsconfig, docker y scripts DevOps de inicio, lee `docs/SETUP.md`.

## 6. Guía de Comportamiento e Instrucciones de Handoff
1. **Cero Placeholders:** Todos los componentes generados deben incluir el código completo listo para producción.
2. **Estructura Modular:** Sigue rigurosamente la arquitectura limpia y convenciones descritas.
3. **Flujo de Handoff:** Al finalizar una tarea, responde con el resumen técnico y el checklist auto-tildado en el formato JSON requerido.
