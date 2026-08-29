# Procedimiento de Prueba Manual Completo — NODEXA CORE

**Propósito:** Guía paso a paso para que cualquier persona pueda probar la totalidad de las funcionalidades del sistema (desde el Onboarding y Mostrador hasta Cuentas Corrientes Contables, Tablero Kanban de Comandas, Deliverys, Devoluciones y el Panel de Administración Global) de forma guiada en un orden lógico y usando cada rol real.

---

## 1. Usuarios y Credenciales de Prueba (Ambiente Local / Demostración)

La contraseña universal para todos los usuarios pre-sembrados es: **`NodexaDemo123!`**

| Email | Rol | Comercio (Tenant) | Estado del Catálogo / Escenario |
| :--- | :--- | :--- | :--- |
| `admin.demo@nodexa.app` | Administrador NODEXA | — (Acceso Global) | Gestiona clientes, morosidad y módulos globales |
| `comerciante.demo@nodexa.app` | Comerciante | Nodexa Demo Store | Permisos completos (Comandas, Deliverys, Fiados, Bot, IA) |
| `empleado.demo@nodexa.app` | Empleado | Nodexa Demo Store | Permisos operativos (Mostrador, Comandas, Cobros) |
| `pedro@almacendonpedro.com` | Comerciante | Almacén Don Pedro | Catálogo holgado (50 de 1.000 productos) |
| `marta@ferreteriaeltornillo.com` | Comerciante | Ferretería El Tornillo | Catálogo al **91% del límite** (910 de 1.000 productos) |
| `andres@bazarcasasur.com` | Comerciante | Bazar Casa Sur | Catálogo al **100% del límite** (1.000 productos de tope) |

---

## 2. Bloques de Prueba Paso a Paso

### 2.1 Acceso, Sesión y Permisos (`ROLES.md`)
- [ ] **Login Exitoso:** Entrar a `/login` e ingresar con `admin.demo@nodexa.app`. Debe redirigir al panel `/admin`.
- [ ] **Acceso Comercial:** Cerrar sesión e ingresar con `comerciante.demo@nodexa.app`. Debe entrar a `/dashboard`.
- [ ] **Restricción de Rol:** Intentar ingresar a `/admin` estando logueado como comerciante. Debe mostrar el error `NX-SYS-003` o denegar el acceso.
- [ ] **Error de Credenciales:** Ingresar credenciales inválidas. Debe mostrar el error estándar `NX-SYS-006` en lugar de una traza técnica.

### 2.2 Panel de Ventas y Caja (Mostrador)
- [ ] **Búsqueda e Incorporación:** Logueado como comerciante/empleado, ir a `/mostrador`. Buscar un producto por SKU o nombre, y agregarlo al carrito.
- [ ] **Cobro al Contado:** Confirmar el cobro de la venta (`"Confirmar cobro"`). Debe mostrar el mensaje `"Venta confirmada."`, limpiar el carrito automáticamente y descontar 1 unidad del stock del producto.
- [ ] **Falta de Stock:** Intentar vender un producto que tiene stock en 0. La validación en base de datos debe impedir la venta y mostrar el código de error `NX-VTA-001`.

### 2.3 Cuentas Corrientes Contables y Fiados
- [ ] **Alta de Cliente Final:** Ir a `/clientes` y dar de alta un cliente final especificando Límite de Crédito y datos de contacto.
- [ ] **Venta a Fiado dentro del Límite:** En `/mostrador`, seleccionar al cliente en el buscador de fiados, agregar productos y confirmar cobro eligiendo medio de pago "Fiado". Comprobar que el `saldo_deudor` del cliente se incrementa.
- [ ] **Autorización por PIN al Superar Límite:** Intentar realizar una venta a fiado que supere el `limite_credito` del cliente. El sistema debe solicitar el **PIN de Administrador/Dueño** (`ModalOverridePinAdmin`). Ingresar un PIN incorrecto para validar `NX-FIA-008`, e ingresar el PIN de dueño (`1234`) para autorizar exitosamente.
- [ ] **Cobro con Imputación Contable (FIFO / Específica):** Ir a `/clientes/[clienteFinalId]`. Presionar `"Registrar Pago"`. Elegir el monto a cobrar y seleccionar si se aplica automáticamente por FIFO o a una factura/producto específico.
- [ ] **Emisión de Recibo y WhatsApp:** Al confirmar el cobro, verificar que aparece el modal con el recibo de cobro contable (`ComprobanteCobroTicket`) con la aclaración *"Sin validez fiscal / AFIP-ARCA"*, opción de imprimir ticket de 80mm y envío a WhatsApp.

### 2.4 Tablero Kanban de Comandas (Ventas / Pedidos Web)
- [ ] **Visualización en Tiempo Real:** Ir a `/ventas/comandas`. Verificar que los pedidos web aparecen clasificados en las columnas Kanban: `Pendientes`, `En Preparación`, `Listos`, `En Camino`, `Entregados`.
- [ ] **Cambio de Estado vía Drag & Drop:** Arrastrar una comanda entre columnas o presionar las flechas de avance rápido. Comprobar que el estado de la comanda y la auditoría se actualizan sin recargar la página (Realtime).
- [ ] **Notificación de Estado por WhatsApp:** Hacer clic en el botón de WhatsApp dentro de la tarjeta de la comanda para abrir la conversación pre-redactada para el cliente con el estado actual de su pedido.

### 2.5 Gestión de Deliverys y Hoja Móvil de Reparto
- [ ] **Asignación de Repartidor:** En `/ventas/comandas`, asignar un repartidor activo a un pedido en estado "Listo".
- [ ] **Vista Móvil del Repartidor:** Navegar a `/delivery/[repartidorId]`. Verificar que el repartidor ve únicamente sus pedidos asignados con dirección de entrega, teléfono con clic directo a WhatsApp y botón para marcar como "Entregado".

### 2.6 Inventario, Stock, Marcas y Proveedores
- [ ] **Aviso preventivo al 91%:** Iniciar sesión con `marta@ferreteriaeltornillo.com`. En el `/dashboard`, debe aparecer un banner discreto indicando que se está cerca del límite SKU (910 de 1.000 productos).
- [ ] **Bloqueo al 100%:** Iniciar sesión con `andres@bazarcasasur.com`. Intentar crear un nuevo producto en `/productos/nuevo`. Debe dispararse el bloqueo por tope de catálogo (`NX-PRD-001`).
- [ ] **Gestión de Proveedores y Marcas:** Ir a `/proveedores` y `/productos` para verificar el filtrado por marca y datos de contacto de proveedores.

### 2.7 Devoluciones y Notas de Crédito
- [ ] **Registro de Devolución:** Ir a `/devoluciones/nueva`. Buscar una venta confirmada, seleccionar los ítems a devolver y confirmar.
- [ ] **Reintegro y Nota de Crédito:** Comprobar que el stock del producto devuelto se reingresa automáticamente (`movimientos_stock` tipo `entrada`) y que se emite una Nota de Crédito secuencial (`NC-C-000001`).

### 2.8 Carga con IA (Alta por Visión)
- [ ] **Extracción de Datos:** Ir a `/productos/carga-ia` y subir una foto de etiqueta. Comprobar la extracción automática de Nombre, Precio y Categoría.
- [ ] **Exceso de Cuota:** Al superar la cuota mensual de 40 análisis, se dispara el aviso de límite `NX-IA-001`.

### 2.9 Catálogo Web Público y Bot de WhatsApp
- [ ] **Vidriera Pública:** Ingresar a `/c/demo-nodexa`. Verificar que los productos marcados como `publicado = true` son visibles públicamente con la identidad visual configurada.
- [ ] **Bot de Respuestas en WhatsApp:** Ir a `/whatsapp-bot`. Configurar mensajes automáticos de horarios, ubicación y catálogo.

### 2.10 Control Administrativo Global (Rol: `admin_nodexa`)
- [ ] **Alta de Comercio:** Logueado como `admin.demo@nodexa.app`, ir a `/admin/clientes/nuevo`. Crear un tenant asignándole módulos.
- [ ] **Morosidad y Suspensión:** Ir a `/admin/morosidad`. Seleccionar un comercio y presionar "Suspender". Intentar loguearse con las credenciales de ese comercio suspendido; el sistema debe redirigir a `/login?error=NX-ADM-002`.
