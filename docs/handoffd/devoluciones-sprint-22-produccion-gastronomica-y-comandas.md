# Sprint 22: Módulo Gastronómico, Sub-recetas y Tablero de Comandas

## Resumen del Sprint
Este sprint marcó un hito en la arquitectura de **NodexaCore** al consolidar el sistema modular multitenant y desarrollar el ecosistema completo para el rubro gastronómico. Se introdujo la capacidad de activar/desactivar módulos por comercio, se construyó el tablero Kanban para la cocina y se rediseñó por completo el motor de costeo y armado de recetas.

## Objetivos Alcanzados

### 1. Sistema Modular Multitenant
*   **Arquitectura de Base de Datos:** Se implementó el tipo `tenant_modules` en PostgreSQL para permitir habilitar módulos a la carta (`catalogo_web`, `produccion_gastronomica`, etc.) por cada `cliente_id`.
*   **Aislamiento de UI:** Las interfaces críticas (como el Wizard de Productos y el menú principal) ahora renderizan u ocultan opciones basándose en los módulos activos del tenant, reduciendo la carga cognitiva para comercios no gastronómicos.

### 2. Tablero de Comandas Kanban (Cocina)
*   **Interfaz Fluida:** Se implementó una vista Kanban horizontal con columnas fijas (`w-80 shrink-0`) y scroll por arrastre (snap-x), solucionando problemas de superposición.
*   **Diseño de Marca:** Se unificó la paleta de colores oscuros (`#090B0B` de fondo, bordes `#222A27`) para mantener la cohesión visual del Design System de Nodexa.

### 3. Wizard de Gastronomía y Variantes (UX Educativa)
*   **Armado Matriz-Gastronomía:** Se reestructuró el flujo de alta de productos para permitir que un producto padre (ej: Empanadas) tenga una *Receta Base* compartida y que sus variantes (Carne, JyQ, fritas/horno) puedan sumar *Insumos Extra* independientes.
*   **Prevención de Errores (Lote vs Unidad):** Se diseñó una interfaz "a prueba de tontos" con un interruptor visual para decidir si el usuario está armando la receta para "1 unidad" o "Por Lote". Todo el micro-copy y los cálculos de la interfaz mutan dinámicamente según esta decisión.

### 4. Producción de Sub-recetas (Insumos Pre-Elaborados)
*   **BOM Multinivel:** Se habilitó la creación de insumos compuestos (ej: Salsas, Picadillos, Masas Madre). 
*   **Creación Inline Avanzada:** En lugar de forzar al usuario a abandonar su flujo, se agregó un modal superpuesto que permite armar toda la sub-receta, calcular su rendimiento, y devolver su costo unitario en tiempo real para inyectarlo en el producto principal.
*   **Lógica Relacional (Backend):** Actualización del archivo `crearProducto.ts` y creación de `crearInsumoPreElaboradoInline.ts` para insertar en cascada dentro de las tablas `recetas` y `receta_insumos`.

## Próximos Pasos (Siguientes Sprints)
*   Implementar la visualización y edición profunda de estas recetas guardadas dentro de la pantalla de "Editar Producto".
*   Asignar estados dinámicos a las comandas mediante Drag & Drop (WebSockets).
*   Enlazar la baja de stock automático con cada venta de un producto que tenga sub-recetas.
