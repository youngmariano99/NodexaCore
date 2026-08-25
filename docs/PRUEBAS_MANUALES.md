# Procedimiento de Prueba Manual Completo — NODEXA CORE

**Propósito:** Guía paso a paso para que cualquier persona pueda probar la totalidad de las funcionalidades del sistema (desde el Onboarding y Mostrador hasta las Devoluciones y el Panel de Administración Global) de forma guiada en un orden lógico y usando cada rol real.

---

## 1. Usuarios y Credenciales de Prueba (Ambiente Local / Demostración)

La contraseña para todos los usuarios pre-sembrados es: **`NodexaDemo123!`**

| Email | Rol | Comercio | Estado del Catálogo / Rol |
| :--- | :--- | :--- | :--- |
| `admin.demo@nodexa.app` | Administrador NODEXA | — (acceso global) | Gestiona clientes, morosidad y módulos globales |
| `comerciante.demo@nodexa.app` | Comerciante | demo-nodexa | Permisos completos de comercio (inventario, configuraciones) |
| `empleado.demo@nodexa.app` | Empleado | demo-nodexa | Permisos operativos de mostrador, sin configuración |
| `pedro@almacendonpedro.com` | Comerciante | Almacén Don Pedro | Catálogo con margen libre (50 de 1.000 productos) |
| `marta@ferreteriaeltornillo.com` | Comerciante | Ferretería El Tornillo | Catálogo al **91% del límite** (910 productos) |
| `andres@bazarcasasur.com` | Comerciante | Bazar Casa Sur | Catálogo al **100% del límite** (1.000 productos) |

---

## 2. Bloques de Prueba Paso a Paso

### 2.1 Acceso, Sesión y Permisos
- [ ] **Login Exitoso:** Entrar a `/login` e ingresar con `admin.demo@nodexa.app`. Debe redirigir al panel `/admin`.
- [ ] **Acceso Comercial:** Cerrar sesión e ingresar con `comerciante.demo@nodexa.app`. Debe entrar a `/dashboard`.
- [ ] **Restricción de Rol:** Intentar ingresar a `/admin` estando logueado como comerciante. Debe mostrar el error `NX-SYS-003` o denegar el acceso.
- [ ] **Error de Credenciales:** Ingresar credenciales inválidas. Debe mostrar el error estándar `NX-SYS-006` en lugar de una traza técnica.

### 2.2 Panel de Ventas y Caja (Mostrador)
- [ ] **Búsqueda e Incorporación:** Logueado como comerciante/empleado, ir a `/mostrador`. Buscar un producto por SKU o nombre, y agregarlo al carrito.
- [ ] **Cobro al Contado:** Confirmar el cobro de la venta. Debe mostrar un mensaje de éxito, limpiar el carrito automáticamente y descontar 1 unidad del stock de ese producto.
- [ ] **Falta de Stock:** Intentar vender un producto que tiene stock en 0. La validación en base de datos debe impedir la venta y mostrar el código de error `NX-VTA-001`.

### 2.3 Inventario y Gestión de SKU
- [ ] **Aviso preventivo al 90%:** Iniciar sesión con `marta@ferreteriaeltornillo.com`. En el `/dashboard`, debe aparecer un banner discreto indicando que se está cerca del límite SKU de su plan.
- [ ] **Bloqueo al 100%:** Iniciar sesión con `andres@bazarcasasur.com`. Intentar crear un nuevo producto en `/productos/nuevo`. Debe dispararse un modal que indique que se ha alcanzado la cuota límite (`NX-PRD-001`) bloqueando la carga y sugiriendo la ampliación de plan.
- [ ] **Registro de Stock:** Ir a `/stock`, presionar "Registrar Movimiento". Buscar un producto, seleccionar "Entrada", completar la cantidad y confirmar. El saldo resultante en la tabla debe actualizarse inmediatamente.

### 2.4 Carga con IA (Alta por Visión)
- [ ] **Auto-completar Formulario:** Ir a `/productos/carga-ia` y subir una foto de etiqueta o producto. La IA debe analizar la imagen y completar automáticamente Nombre, Precio y Categoría.
- [ ] **Bloqueo de Cuota:** Si el comercio supera las 40 cargas de IA mensuales, el sistema debe impedir nuevos análisis arrojando el error `NX-IA-001`.

### 2.5 Clientes y Fiados (Cuenta Corriente)
- [ ] **Alta de Cliente Final:** Ir a `/clientes` y dar de alta a un cliente final con su nombre y número telefónico.
- [ ] **Venta al Fiado:** En `/mostrador`, seleccionar al cliente recientemente creado en el dropdown de deudores, cargar productos al carrito y confirmar la venta.
- [ ] **Verificación de Saldo:** Ir a `/clientes` y comprobar que el `saldo_deudor` del cliente se ha incrementado por el monto exacto de la venta.
- [ ] **Abono de Cuenta Corriente:** Ir a la ficha del cliente en `/clientes/[clienteFinalId]`. Presionar "Registrar Pago", ingresar un monto (menor o igual a su deuda) y presionar "Confirmar". El saldo del cliente debe disminuir al instante.

### 2.6 Devoluciones y Notas de Crédito
- [ ] **Registro de Devolución:** Ir a `/devoluciones/nueva`. Buscar una venta anteriormente realizada, seleccionar qué productos se van a devolver y confirmar.
- [ ] **Reintegro y Auditoría:** Comprobar que el stock del producto devuelto se incrementó automáticamente y que se generó una nota de crédito sin borrar la venta original.

### 2.7 Catálogo Web y Personalización
- [ ] **Identidad Visual:** Ir a `/catalogo-web/personalizacion` y cambiar la paleta de colores o logo.
- [ ] **Vidriera Pública:** Ir a `/c/[slug-del-comercio]`. Confirmar que los productos marcados como `publicado = true` son visibles públicamente sin necesidad de autenticarse, mostrando la identidad configurada.

### 2.8 Configuración y Centro de Ayuda
- [ ] **Datos del Comercio:** Ir a `/configuracion` y actualizar el nombre y número de WhatsApp de la tienda.
- [ ] **Preguntas Frecuentes:** Ir a `/ayuda`. Corroborar que las preguntas frecuentes y los consejos de uso (micro-tips) se muestren dinámicamente según los módulos que tiene activos ese tenant.

### 2.9 Control Administrativo (Rol: admin_nodexa)
- [ ] **Alta de Comercio:** Ingresar como administrador e ir a `/admin/clientes/nuevo`. Rellenar los campos, asignar un límite de SKU y activar módulos de prueba. El comercio debe crearse de inmediato.
- [ ] **Control de Morosidad:** Ir a `/admin/morosidad`. Seleccionar un comercio y presionar "Suspender". El estado debe cambiar a "Suspendido" y aparecer el botón de WhatsApp para notificarle.
- [ ] **Bloqueo por Suspensión:** Intentar loguearse con las credenciales de un comercio suspendido. El proxy del sistema debe interceptar la sesión y redirigir a `/login?error=NX-ADM-002` prohibiendo el acceso.
