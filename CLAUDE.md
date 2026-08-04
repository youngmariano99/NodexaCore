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
  * Auditoría Asíncrona registrando únicamente Diffs de base de datos
  * Catálogo de Errores Normalizados en cliente y servidor (ERRORS.md)
  * Prohibición de logs en consola con datos sensibles o credenciales
- **robustez:**
  * DTOs validados y tipados de extremo a extremo
  * Patrón Repository para desacoplar el ORM de la interfaz
  * Idempotencia y Anti-Race Conditions con concurrencia optimista
  * Borrado Lógico obligatorio (Soft Delete con columna eliminado_en)
- **devops:**
  * Pipelines CI/CD automatizados con validación de tests previa al deploy
  * Aislamiento de Service Role Key exclusiva para servidor/cron jobs
  * Prohibición de hardcoding y exposición de credenciales en NEXT_PUBLIC_

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
