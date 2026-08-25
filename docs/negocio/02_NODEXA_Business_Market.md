# 02. NODEXA: Modelo de Negocio, Mercado y Precios

## 1. Posicionamiento Competitivo y Propuesta de Valor

NODEXA opera como un **Socio Tecnológico** ágil, abarcando desde comercios de barrio hasta PyMEs consolidadas. Su propuesta de valor se divide en tres grandes pilares según la madurez del cliente y el modelo de comercialización:

* **Servicio Llave en Mano (Done-For-You):** Configuración inicial real y asistida, adaptando la herramienta a las necesidades operativas del negocio en lugar de entregar un software genérico vacío.
* **Onboarding Controlado (SaaS Cerrado / Invite-Only):** Comercialización inicial bajo una modalidad de acceso controlado para asegurar una implementación exitosa, estrechar la relación con el cliente y obtener retroalimentación continua de uso en producción.
* **Escalabilidad Total y Soporte Cercano:** El ecosistema acompaña al cliente desde una solución modular y económica hasta un desarrollo corporativo totalmente a medida cuando su operación lo requiere, siempre con atención humana directa.

---

## 2. Estructura de Negocio: El Modelo Híbrido

Para equilibrar la eficiencia operativa con la capacidad de captar clientes complejos sin comprometer los costos de infraestructura, NODEXA se divide en dos grandes divisiones:

### División A: NODEXA Starter (SaaS Modular Controlado)

Enfocado en comercios minoristas y pequeños negocios.

* **Infraestructura Centralizada:** Infraestructura compartida (Supabase + Vercel + Cloudinary) con despliegues globales rápidos mediante un identificador (`cliente_id`) y políticas estables de aislamiento de datos (RLS).
* **Modelo Base + Marketplace:** Un núcleo innegociable de control interno (stock y ventas) al cual se le encienden módulos adicionales según la necesidad operativa.

### División B: NODEXA Custom (Desarrollo a Medida & Enterprise)

Enfocado en PyMEs con procesos complejos de logística, producción o flujos de trabajo específicos que no encajan en los módulos estándar.

* **Infraestructura Dedicada:** Se crean cuentas independientes en la nube a nombre del cliente, siendo este último quien asume los costos de consumo directo.
* **Desarrollo Exclusivo:** Arquitectura, diseño y despliegue a medida con mitigación de riesgos por desvíos de alcance.

---

## 3. Estructura de Precios: División Starter (Modular)

### 3.1 El Núcleo Innegociable: NODEXA Core (Gestión Interna)

* **Incluye:** Maestro de Productos (hasta **1.000 SKU activos**), Control de Stock básico (entradas y salidas), Panel de Ventas/Mostrador (caja interna), carga manual/masiva por Excel y compresión/optimización automática de imágenes.
* **Abono Mensual Base:** **$20.000 ARS / mes**
* **Escalabilidad de Catálogo (Precio Marginal Decreciente):** Para comercios con inventarios extensos (como ferreterías, bazares o autoservicios), la ampliación del límite de SKU sigue un esquema de volumen con costo decreciente:
* **+1.000 SKU adicionales (de 1.001 hasta 2.000):** +$5.000 ARS / mes
* **+1.000 SKU adicionales (de 2.001 hasta 3.000):** +$4.000 ARS / mes
* **+1.000 SKU adicionales (de 3.001 en adelante):** +$3.000 ARS / mes por cada bloque de 1.000 (tope de costo marginal fijo).



### 3.2 Costos de Instalación y Onboarding (Setup Fee Segmentado)

* **Setup Core Estándar: $20.000 ARS (Pago único)**
* Incluye alta de comercio en la base de datos centralizada, parametrización operativa y capacitación inicial, con carga de catálogo autogestionada o mediante Excel estructurado en formato limpio por el cliente.


* **Setup Core Asistido (Done-For-You): $30.000 ARS (Pago único)**
* Incluye todo lo del plan estándar **más** la depuración, formateo y subida inicial del catálogo por parte del equipo de NODEXA (hasta 500 productos; catálogos superiores, sin digitalizar o en formato papel/cuaderno se cotizan a medida según la carga de trabajo).


* **Setup Catálogo / Vidriera Web: $150.000 ARS (Pago único) — *Bonificable a $75.000 ARS***
* Incluye personalización de la identidad visual de la tienda y registro/configuración del dominio `.com.ar` por un año.
* *Beneficio Social Proof:* Se otorga un **50% de descuento ($75.000 ARS final)** si el cliente se compromete a brindar una reseña comercial pública (escrita o en video) tras completar el primer mes de uso.



### 3.3 El Marketplace de Módulos (A la Carta)

* **Módulo Catálogo Web (Vidriera o Pedido por WhatsApp):** **+$15.000 ARS / mes** *(Incluye CDN e imágenes optimizadas para alto tráfico)*.
* **Módulo Carga con IA (Límite de 40 cargas/mes):** **+$10.000 ARS / mes** *(Permite subida de fotos de etiquetas para alta rápida; paquetes adicionales contratables a demanda)*.
* **Módulo Clientes y Cuentas Corrientes (El Fiado):** **+$12.000 ARS / mes**
* **Módulo Devoluciones y Notas de Crédito:** **+$8.000 ARS / mes**
* **Módulo Bot Estático de WhatsApp:** **+$10.000 ARS / mes**

---

## 4. Estructura de Precios: División Custom (A Medida)

### 4.1 Proyectos Cerrados (Fixed-Price)

* **Cotización Base:** A partir de **$500.000 ARS** según la complejidad analizada en la auditoría inicial.
* **Buffer de Alcance (Scope Creep):** Todo presupuesto incluye un margen de seguridad del 20% para absorber modificaciones menores solicitadas durante el desarrollo.

### 4.2 El Abono de Socio Tecnológico (Retainer Obligatorio)

El mantenimiento post-lanzamiento y la evolución del software se estructuran bajo estándares de la industria tecnológica:

* **Tarifa:** Abono anual equivalente al **15% - 20% del valor total del proyecto original**, facturado en cuotas mensuales (Ej: Proyecto de $2.000.000 ARS genera un abono de **$30.000 a $40.000 ARS / mensuales**).
* **Regla "Use-it-or-lose-it":** Incluye un paquete cerrado de horas mensuales para soporte evolutivo o correctivo. Las horas no utilizadas no son acumulables para el mes siguiente.
* **Cláusula de Desvinculación:** Si el cliente decide no abonar el plan de mantenimiento, se le entrega el código fuente definitivo y NODEXA se desliga de la responsabilidad técnica y actualizaciones de seguridad sobre el servidor.

---

## 5. Reglas Operativas y Prevención de Riesgos

1. **Protección de Infraestructura y Uso Justo (Guardrails):**
* **Imágenes:** Todas las imágenes cargadas por los comercios pasan por un pipeline de compresión obligatoria (conversión a WebP, límite de resolución y reducción de peso a ~70 KB) para resguardar el ancho de banda y almacenamiento de Cloudinary en clientes de alto volumen de SKU.
* **Topes por Plan Core:** El abono base de $20.000 ARS cubre hasta **1.000 SKU activos**. El excedente se factura mediante paquetes escalonados de costo decreciente (+$5.000, +$4.000 y +$3.000 ARS/mes por cada 1.000 SKU adicionales), protegiendo la rentabilidad sin penalizar el crecimiento del comercio.
* **Límites de Inteligencia Artificial:** Las cargas autocompletadas por IA están topadas a **40 consultas mensuales** en su valor base, protegiendo al negocio de picos inesperados en el costo de la API de OpenAI.


2. **Cero Subsidio Cruzado:** Los clientes del modelo Starter que requieran adaptaciones lógicas profundas son migrados formalmente a la división Custom o se les cobra como desarrollo a medida.
3. **Suspensión Automática (Starter):** Cumplidos los 30 días de retraso en el abono mensual, el acceso web y los servicios de infraestructura secundaria se suspenden de forma automática mediante banderas de estado (`estado_pago`).
4. **Fee de Reactivación:** La recuperación de información tras meses de baja inactiva en el modelo modular exige un cargo de reactivación equivalente al 50% del Setup inicial más el abono corriente.