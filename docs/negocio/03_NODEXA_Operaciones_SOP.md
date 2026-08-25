# 03. NODEXA: Procedimientos Operativos Estándar (SOP)

## 1. Propósito y Alcance
Este documento define los **Procedimientos Operativos Estándar (SOP)** para la gestión diaria de NODEXA CORE. Al operar con una estructura ágil, el objetivo de este manual es estandarizar procesos repetitivos, asegurar el cumplimiento estricto de los límites y precios definidos en el modelo comercial, minimizar errores operativos y proteger la rentabilidad e infraestructura del sistema.

---

## 2. SOP-01: Onboarding y Alta de Clientes (División Starter)
*Cuándo se aplica:* Inmediatamente después de que un nuevo cliente abona el Setup Fee correspondiente.

1.  **Validación Comercial y Tipo de Setup (Día 0):**
    *   **Setup Core Estándar ($20.000 ARS):** El cliente debe entregar su inventario en la plantilla Excel limpia y estructurada provista por NODEXA.
    *   **Setup Core Asistido / Done-For-You ($30.000 ARS):** Si el cliente entrega datos desestructurados o listas en texto, el equipo de NODEXA asume la depuración y carga inicial (tope máximo de **500 SKUs**; cargas mayores se presupuestan por separado).
    *   **Setup Catálogo Web ($150.000 ARS / Bonificado a $75.000 ARS):** Si aplica al descuento del 50% por *Social Proof*, registrar en el calendario operativo una alerta a los **30 días** para solicitar la reseña pública (escrita o video).
2.  **Configuración en Base de Datos Central (Día 1):**
    *   Ingresar al panel administrativo de Supabase y crear el registro en `clientes`, generando un `cliente_id` único.
    *   Asignar el estado inicial (`estado_pago = true`) y activar las banderas en `tenant_modules` según lo contratado.
3.  **Auditoría de Límite de SKUs e Importación:**
    *   Verificar el conteo total de ítems a importar.
    *   Si el inventario tiene **hasta 1.000 SKUs**, se asigna al abono Core base ($20.000 ARS/mes).
    *   Si supera los 1.000 SKUs, activar los **Packs de Catálogo Extendido** en su facturación mensual según escala decreciente (+1.000 SKUs: +$5.000 ARS; +2.000 SKUs: +$4.000 ARS; +3.000 o más: +$3.000 ARS por bloque).
4.  **Despliegue y Personalización Visual:**
    *   Configurar variables visuales de marca (logo, colores corporativos) en el framework visual.
    *   Si contrató Catálogo Web, vincular el dominio `.com.ar` en Vercel y **verificar que el pipeline de optimización de imágenes Cloudinary (WebP, máx. 1080px, ~70 KB) esté activo por defecto**.
5.  **Capacitación Llave en Mano (Día 2):**
    *   Realizar sesión de onboarding en vivo (30-45 min) mostrando carga de productos, control de stock y mostrador. Entrega oficial del sistema.

---

## 3. SOP-02: Activación de Módulos y Guardrails de Uso (Marketplace)
*Cuándo se aplica:* Un cliente solicita sumar módulos adicionales o packs de volumen a su abono mensual.

1.  **Validación de Dependencia Core:**
    *   Verificar que el cliente tenga activo y al día su abono **NODEXA Core**. Ningún módulo accesorio puede operar de manera independiente sin el núcleo de stock.
2.  **Configuración Técnico-Operativa por Módulo:**
    *   **Catálogo Web (+$15.000 ARS/mes):** Activar flag `catalogo_web: true`. Verificar que las políticas de RLS permitan lectura pública únicamente a productos con estado `publicado = true` para el `cliente_id`.
    *   **Carga por IA (+$10.000 ARS/mes):** Activar flag `ia_vision: true` y establecer estrictamente en la base de datos el contador `cuota_mensual_ia = 40` (límite de 40 cargas/mes por abono base para proteger consumo de API de OpenAI).
    *   **Clientes / Fiados (+$12.000 ARS/mes) o Devoluciones (+$8.000 ARS/mes):** Activar banderas de módulo correspondientes en `tenant_modules`.
3.  **Actualización Administrativa y Notificación:**
    *   Actualizar el registro de facturación recurrente sumando el valor del nuevo módulo al próximo período.
    *   Notificar por WhatsApp al cliente informando la disponibilidad del módulo junto con un micro-tip educativo sobre cómo empezar a usarlo.

---

## 4. SOP-03: Control Preventivo de Límites y Excedentes (SKUs e IA)
*Cuándo se aplica:* En tiempo real dentro de la aplicación y ante la solicitud del comercio para ampliar capacidades.

1.  **Monitoreo y Bloqueo Preventivo de SKUs:**
    *   **Aviso Temprano (90%):** Al alcanzar los 900 productos activos en un plan Core (o el 90% de su límite ampliado actual), el panel muestra una notificación discreta informando el uso del catálogo.
    *   **Bloqueo y Upsell Empático (100%):** Al alcanzar el tope exacto contratado (ej. 1.000 SKUs), el sistema bloquea la creación manual o masiva de nuevos productos para no generar cargos sorpresa.
    *   **Gestión de Ampliación:** Si el usuario intenta agregar un ítem extra, la interfaz despliega un mensaje felicitándolo por su crecimiento y ofreciendo activar un **Pack de Catálogo Extendido** (+1.000 SKUs por +$5.000 ARS/mes).
    *   **Ejecución Operativa:** Cuando el cliente confirma por WhatsApp, se actualiza el límite en la base de datos (`limite_sku = 2000`) y se suma el valor al próximo vencimiento de facturación.
2.  **Monitoreo y Bloqueo de Tokens de Inteligencia Artificial:**
    *   **Límite Operativo:** Cada carga autocompletada por IA reduce el contador mensual disponible del cliente (`cuota_mensual_ia`).
    *   **Bloqueo al 100% (40/40):** Al consumirse la cuota del abono, la opción de "Cargar foto con IA" se deshabilita temporalmente hasta el próximo mes calendario.
    *   **Gestión de Ampliación:** El sistema muestra un mensaje amigable ofreciendo la contratación de un paquete de recarga (+40 consultas por +$10.000 ARS) gestionable desde WhatsApp o el panel.

## 5. SOP-04: Gestión Humanizada de Morosidad y Suspensión
*Cuándo se aplica:* El cliente registra demoras en el pago del abono mensual y no ha reportado inconvenientes previamente.
*Nota de Alcance:* Durante la fase actual de comercialización cerrada y trato directo, se prioriza el acuerdo mutuo y la retención del cliente por sobre las penalidades automáticas.

1.  **Recordatorio Amigable (Días 1 al 10 de mora):**
    *   Envío de un mensaje personal por WhatsApp informando el vencimiento del abono mensual en tono cordial y consultivo.
2.  **Contacto Directo y Evaluación del Caso (Día 15 de mora):**
    *   Si no hubo pago, escribir o llamar directamente para entender la situación. 
    *   Si el cliente atraviesa una dificultad económica puntual y temporal, se podrá acordar un **período de gracia** de común acuerdo sin cortar el servicio ni aplicar recargos.
3.  **Suspensión Técnica Preventiva (Día 30 de mora o por falta de respuesta):**
    *   Solo se procederá a la suspensión temporal si **no hubo respuesta del cliente** o si se venció el plazo de gracia acordado sin regularización.
    *   Se actualiza en Supabase la columna `estado_pago = false` para el `cliente_id`, cortando el acceso al panel y apagando la vidriera web para evitar costos innecesarios de infraestructura y base de datos.
4.  **Proceso de Reactivación (Sin Multas en Fase Actual):**
    *   Para restaurar el servicio, únicamente se requerirá el pago del mes pendiente (y/o el mes en curso según el acuerdo).
    *   **No se aplicará el Fee de Reactivación del 50%** mientras se mantenga el modelo de trato cercano. Se volverá a cambiar `estado_pago = true` inmediatamente al acreditarse el pago.
    *   *(Nota futura: La aplicación de multas o suspensiones automáticas quedará reservada exclusivamente para cuando el sistema evolucione a un modelo de auto-servicio abierto y masivo).*

## 6. SOP-05: Ciclo de Vida de Proyectos Custom (A Medida)
*Cuándo se aplica:* Requerimientos operacionales o industriales que superan los límites del sistema SaaS modular.

1.  **Auditoría y Scope Técnico:**
    *   Relevamiento formal de requerimientos y firma de un documento de alcance cerrado (*Scope of Work*).
2.  **Cotización y Margen de Seguridad:**
    *   Cotización base a partir de **$500.000 ARS** según complejidad técnica.
    *   Incorporar obligatoriamente en la propuesta un **20% de buffer de alcance** (*Scope Creep Buffer*) para absorber ajustes operativos menores durante el sprint de desarrollo.
3.  **Anticipo y Despliegue Dedicado:**
    *   Cobro de anticipo del 50% antes del inicio de escritura de código.
    *   Creación y despliegue de infraestructura **dedicada** en Vercel/Supabase donde el cliente asume directamente los costos de consumo de la nube de terceros.
4.  **Retainer Obligatorio (Socio Tecnológico):**
    *   Al entregar el software, se firma el contrato de abono evolutivo equivalente al **15% a 20% anual del valor total del proyecto** (fraccionado mensualmente con horas *Use-it-or-lose-it*).
    *   Si el cliente rechaza o cancela el abono de mantenimiento, se entrega el código fuente definitivo bajo cláusula de desvinculación total de garantía técnica y soporte de infraestructura por parte de NODEXA.