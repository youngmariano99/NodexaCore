[
  {
    "sprintNombre": "Sprint 10: Cimientos Visuales, Navegación y CRUD de Catálogo",
    "sprintObjetivo": "Construir la infraestructura visual común (Sidebar y Topbar con control de accesos por tenant_modules) y habilitar la gestión manual/masiva de productos en frontend con subida de imágenes.",
    "sprintDuracionSemanas": 2,
    "sprintCapacidad": 30,
    "historias": [
      {
        "epicaNombre": "Épica 2: Autenticación, Roles y Aislamiento Multi-Tenant",
        "epicaDescripcion": "",
        "titulo": "UI de Navegación y Sidebar con Control de Módulos (Transversal/Layout)",
        "descripcion": "Como comerciante o empleado del comercio quiero contar con un Sidebar y Topbar que respete el área táctil mínima de 44x44px y la paleta Verde Nodexa, y que bloquee dinámicamente los accesos a los módulos no contratados para navegar de forma limpia, consistente y segura.",
        "prioridad": "Alta",
        "estimacion": 8,
        "actividades": [
          {
            "titulo": "Implementación del Sidebar de Navegación y Topbar en el Layout General",
            "rol": "Frontend",
            "componente": "AppLayout",
            "ruta": "src/app/(app)/layout.tsx",
            "modulo": "Transversal",
            "etiquetas": ["frontend", "layout", "nav"],
            "pasos": [
              "Paso 1: Modificar src/app/(app)/layout.tsx para incorporar la estructura del Sidebar y Topbar.",
              "Paso 2: Obtener los módulos activos del comercio desde tenant_modules en base de datos utilizando el cliente de Supabase.",
              "Paso 3: Validar que el Sidebar filtre los enlaces mostrados en base a los flags activos en tenant_modules.",
              "Paso 4: Asegurar que los botones interactivos del Sidebar cumplan con el área táctil mínima de 44x44px e incorporen la paleta de colores Verde Nodexa (#16D39A) según docs/DESIGN.md."
            ],
            "criteriosAceptacion": [
              "Dado un usuario comerciante autenticado, cuando accede al sistema, entonces visualiza la navegación Sidebar con todos sus módulos habilitados si están contratados.",
              "Dado un módulo desactivado en tenant_modules, cuando se carga la UI, entonces el Sidebar no muestra el enlace correspondiente.",
              "Dado un dispositivo táctil, cuando se presiona cualquier enlace del Sidebar, entonces el área reactiva cumple estrictamente con el estándar mínimo de 44x44px."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 4: Gestión de Catálogo de Productos (Core)",
        "epicaDescripcion": "",
        "titulo": "UI de Edición y Baja de Producto",
        "descripcion": "Como comerciante o empleado del comercio quiero editar los datos de un producto existente e iniciar su baja lógica desde la interfaz de listado de productos para mantener la información del catálogo actualizada.",
        "prioridad": "Alta",
        "estimacion": 8,
        "actividades": [
          {
            "titulo": "Desarrollo de la Página de Edición de Producto",
            "rol": "Frontend",
            "componente": "FormularioEdicionProducto",
            "ruta": "src/app/(app)/productos/[productoId]/page.tsx",
            "modulo": "Catálogo de Productos",
            "etiquetas": ["frontend", "productos", "edicion"],
            "pasos": [
              "Paso 1: Crear la estructura de rutas dinámicas src/app/(app)/productos/[productoId]/page.tsx.",
              "Paso 2: Crear el componente de formulario precargado con los datos del producto actual desde el repositorio de productos.",
              "Paso 3: Conectar el envío del formulario a la Server Action actualizarProducto.ts para persistir los cambios.",
              "Paso 4: Implementar control de errores normalizados usando MensajeError y códigos de ERRORS.md."
            ],
            "criteriosAceptacion": [
              "Dado un producto existente, cuando el usuario ingresa a /productos/[productoId], entonces visualiza los campos precargados con la información actual del producto.",
              "Dado un formulario modificado con datos válidos, cuando se presiona guardar, entonces el sistema persiste los cambios en base de datos y redirige al listado."
            ]
          },
          {
            "titulo": "Integración de Baja Lógica desde la UI",
            "rol": "Frontend",
            "componente": "ListadoProductos",
            "ruta": "src/app/(app)/productos/listado-productos.tsx",
            "modulo": "Catálogo de Productos",
            "etiquetas": ["frontend", "productos", "baja"],
            "pasos": [
              "Paso 1: Incorporar una columna de acciones al listado de productos.",
              "Paso 2: Añadir botón de eliminación que dispare un diálogo de confirmación de borrado lógico.",
              "Paso 3: Conectar la confirmación a la Server Action eliminarProducto.ts.",
              "Paso 4: Actualizar el listado local mediante invalidación de caché de TanStack Query tras el borrado."
            ],
            "criteriosAceptacion": [
              "Dado el listado de productos, cuando el usuario hace clic en el botón de eliminar, entonces se despliega un modal confirmando la acción.",
              "Dado el modal de confirmación aceptado, cuando se ejecuta el flujo, entonces el producto se elimina lógicamente (eliminado_en seteado) y desaparece del listado."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 4: Gestión de Catálogo de Productos (Core)",
        "epicaDescripcion": "",
        "titulo": "Integración de Compresión y Subida de Imágenes a Cloudinary",
        "descripcion": "Como comerciante quiero que el formulario de alta y edición de producto permita subir una imagen para que se comprima automáticamente en background a WebP (~70 KB) y se almacene en la ficha del producto.",
        "prioridad": "Alta",
        "estimacion": 8,
        "actividades": [
          {
            "titulo": "Integración de Imágenes en las Acciones de Productos",
            "rol": "Backend",
            "componente": "crearProducto / actualizarProducto",
            "ruta": "src/services/productos/",
            "modulo": "Catálogo de Productos",
            "etiquetas": ["backend", "imagenes", "cloudinary"],
            "pasos": [
              "Paso 1: Modificar los esquemas de validación Zod de crear y actualizar producto para aceptar archivos de imagen.",
              "Paso 2: En la Server Action, verificar si viene una imagen en el FormData.",
              "Paso 3: Invocar la función comprimirImagenProducto para subir la imagen a Cloudinary en formato WebP.",
              "Paso 4: Guardar la URL resultante en la columna imagen_url de la tabla productos."
            ],
            "criteriosAceptacion": [
              "Dado un archivo de imagen JPG/PNG subido en el formulario, cuando se procesa el alta, entonces se almacena en Cloudinary como WebP y se guarda su URL en la base de datos.",
              "Dado un fallo en el servicio de Cloudinary, cuando se intenta crear el producto, entonces se retorna el código de error NX-PRD-005 de forma Fail-Fast sin romper el flujo de creación si es opcional."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 4: Gestión de Catálogo de Productos (Core)",
        "epicaDescripcion": "",
        "titulo": "UI de Carga Masiva por Excel",
        "descripcion": "Como comerciante quiero subir mi inventario masivamente mediante una plantilla de Excel estructurada para no tener que cargar los productos individualmente.",
        "prioridad": "Media",
        "estimacion": 6,
        "actividades": [
          {
            "titulo": "Pantalla de Importación de Plantilla Excel",
            "rol": "Frontend",
            "componente": "CargaMasivaExcel",
            "ruta": "src/app/(app)/productos/carga-masiva/page.tsx",
            "modulo": "Catálogo de Productos",
            "etiquetas": ["frontend", "excel", "productos"],
            "pasos": [
              "Paso 1: Crear la página src/app/(app)/productos/carga-masiva/page.tsx con área de arrastrar y soltar (drag & drop).",
              "Paso 2: Incluir un botón estático para descargar la plantilla de Excel oficial del sistema.",
              "Paso 3: Conectar la carga del archivo a la ruta de API POST /api/productos/importar.",
              "Paso 4: Mostrar el resultado del procesamiento: número de registros exitosos y lista de errores en caso de fallo."
            ],
            "criteriosAceptacion": [
              "Dado el formulario de carga masiva, cuando se arrastra un archivo de plantilla Excel válido, entonces se inicia la subida y se visualiza un loader.",
              "Dado un archivo con errores de formato, cuando la API devuelve NX-PRD-007, entonces se muestra el error claramente en la pantalla orientando al usuario a usar la plantilla correcta."
            ]
          }
        ]
      }
    ]
  },
  {
    "sprintNombre": "Sprint 11: Gestión Visual de Stock, Configuración del Catálogo Web y Bot de WhatsApp",
    "sprintObjetivo": "Desarrollar la gestión visual de movimientos de stock y habilitar los paneles de administración del bot y de la vidriera pública para los comerciantes.",
    "sprintDuracionSemanas": 2,
    "sprintCapacidad": 30,
    "historias": [
      {
        "epicaNombre": "Épica 5: Control de Stock",
        "epicaDescripcion": "",
        "titulo": "UI de Registro de Movimientos de Stock",
        "descripcion": "Como comerciante o empleado del comercio quiero abrir un modal desde la sección de stock para registrar entradas o salidas manuales de productos para ajustar el inventario.",
        "prioridad": "Alta",
        "estimacion": 8,
        "actividades": [
          {
            "titulo": "Modal de Carga de Movimientos de Stock",
            "rol": "Frontend",
            "componente": "ModalMovimientoStock",
            "ruta": "src/app/(app)/stock/movimientos-stock.tsx",
            "modulo": "Control de Stock",
            "etiquetas": ["frontend", "stock", "movimientos"],
            "pasos": [
              "Paso 1: Agregar un botón 'Registrar Movimiento' en la cabecera de la sección de stock.",
              "Paso 2: Construir el modal con selector de productos (buscador debounced por SKU/nombre), tipo de movimiento (entrada/salida) y cantidad.",
              "Paso 3: Conectar el envío del formulario a las Server Actions registrarEntradaStock y registrarSalidaStock.",
              "Paso 4: Validar en cliente que no se permitan cantidades negativas y aplicar patrones Fail-Fast."
            ],
            "criteriosAceptacion": [
              "Dado el listado de stock, cuando se pulsa en 'Registrar Movimiento', entonces se abre un modal con un formulario limpio.",
              "Dado el formulario completo con cantidad mayor a cero, cuando se confirma, entonces se registra el movimiento correspondiente y se recarga el historial."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 5: Control de Stock",
        "epicaDescripcion": "",
        "titulo": "Suscripción en Tiempo Real para Stock en UI (Realtime)",
        "descripcion": "Como comerciante quiero que el stock disponible de los productos se actualice en tiempo real en mi pantalla de mostrador y listados para evitar inconsistencias de inventario.",
        "prioridad": "Media",
        "estimacion": 6,
        "actividades": [
          {
            "titulo": "Integración de Supabase Realtime para Productos y Stock",
            "rol": "Frontend",
            "componente": "useProductosPaginados / useBuscarProductos",
            "ruta": "src/hooks/",
            "modulo": "Control de Stock",
            "etiquetas": ["frontend", "realtime", "supabase"],
            "pasos": [
              "Paso 1: Configurar el cliente de Supabase para suscribirse al canal público de productos del cliente_id.",
              "Paso 2: Al recibir eventos de UPDATE en la tabla productos, invalidar el estado de caché de TanStack Query para productos.",
              "Paso 3: Refrescar de forma atómica la UI de los componentes del mostrador y el listado de productos.",
              "Paso 4: Validar el correcto desecho (cleanup) de la suscripción al desmontar los componentes."
            ],
            "criteriosAceptacion": [
              "Dado el mostrador abierto en el navegador A, cuando se realiza una venta desde el navegador B que descuenta stock, entonces la cantidad de stock disponible en el navegador A se actualiza automáticamente sin refrescar la página."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 7: Módulo Catálogo Web (Vidriera y Pedido por WhatsApp)",
        "epicaDescripcion": "",
        "titulo": "UI de Publicación de Vidriera",
        "descripcion": "Como comerciante quiero configurar qué productos expongo en la vidriera pública mediante interruptores rápidos para controlar las ventas en línea.",
        "prioridad": "Alta",
        "estimacion": 8,
        "actividades": [
          {
            "titulo": "Pantalla de Publicación y Toggles del Catálogo Web",
            "rol": "Frontend",
            "componente": "ConfiguracionVidriera",
            "ruta": "src/app/(app)/catalogo-web/page.tsx",
            "modulo": "Catálogo Web",
            "etiquetas": ["frontend", "catalogo", "publicacion"],
            "pasos": [
              "Paso 1: Crear la página de configuración src/app/(app)/catalogo-web/page.tsx.",
              "Paso 2: Mostrar la tabla de productos del comerciante con un interruptor (switch toggle) por fila para el estado 'publicado'.",
              "Paso 3: Conectar el toggle a la Server Action alternarPublicacionProducto.ts.",
              "Paso 4: Validar antes de cambiar el estado de publicado que el producto tenga nombre, precio e imagen, mostrando el error NX-WEB-002 en caso contrario."
            ],
            "criteriosAceptacion": [
              "Dado un producto completo sin publicar, cuando el comerciante activa el toggle de publicación, entonces se cambia su estado a publicado y el cambio se refleja en la vidriera pública inmediatamente.",
              "Dado un producto incompleto (sin precio o imagen), cuando se intenta activar el toggle, entonces se deniega el cambio y se muestra el mensaje de error NX-WEB-002."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 11: Módulo Bot Estático de WhatsApp",
        "epicaDescripcion": "",
        "titulo": "UI de Configuración del Bot de WhatsApp",
        "descripcion": "Como comerciante quiero configurar los mensajes predefinidos de horarios, ubicación y catálogo de mi bot para automatizar respuestas a clientes finales.",
        "prioridad": "Media",
        "estimacion": 8,
        "actividades": [
          {
            "titulo": "Formulario de Configuración del Bot Estático",
            "rol": "Frontend",
            "componente": "ConfiguracionBot",
            "ruta": "src/app/(app)/whatsapp-bot/page.tsx",
            "modulo": "Bot de WhatsApp",
            "etiquetas": ["frontend", "bot", "configuracion"],
            "pasos": [
              "Paso 1: Crear la página de configuración src/app/(app)/whatsapp-bot/page.tsx.",
              "Paso 2: Crear el formulario con campos de texto para mensaje de horarios, mensaje de ubicación y mensaje de catálogo, además del switch para derivar a WhatsApp.",
              "Paso 3: Conectar el formulario a la Server Action actualizarConfiguracionBot.ts.",
              "Paso 4: Validar que si el bot se activa, al menos uno de los tres mensajes informativos esté relleno, lanzando NX-BOT-002 si no."
            ],
            "criteriosAceptacion": [
              "Dado el formulario del bot de WhatsApp, cuando se guardan datos válidos, entonces el bot in-app (FAQ) de la vidriera pública actualiza sus preguntas y respuestas en tiempo real.",
              "Dado el bot activo con todos los campos vacíos, cuando se intenta guardar, entonces el sistema rechaza el envío mostrando el código NX-BOT-002."
            ]
          }
        ]
      }
    ]
  },
  {
    "sprintNombre": "Sprint 12: Módulo de Clientes (Fiados), Historial de Ventas y Gestión de Devoluciones",
    "sprintObjetivo": "Habilitar la gestión y cobro a clientes registrados (Fiado) y toda la interfaz para consultar ventas y registrar notas de crédito por devoluciones.",
    "sprintDuracionSemanas": 2,
    "sprintCapacidad": 30,
    "historias": [
      {
        "epicaNombre": "Épica 9: Módulo Clientes y Cuentas Corrientes (Fiado)",
        "epicaDescripcion": "",
        "titulo": "UI de Listado y Registro de Clientes (Fiados)",
        "descripcion": "Como comerciante quiero acceder a la sección de clientes para ver mi cartera de clientes fiados y dar de alta nuevos clientes de forma visual.",
        "prioridad": "Alta",
        "estimacion": 8,
        "actividades": [
          {
            "titulo": "Listado General y Formulario de Alta de Clientes",
            "rol": "Frontend",
            "componente": "ListadoClientesFinales",
            "ruta": "src/app/(app)/clientes/page.tsx",
            "modulo": "Clientes y Fiados",
            "etiquetas": ["frontend", "clientes", "fiados"],
            "pasos": [
              "Paso 1: Crear la página principal de clientes src/app/(app)/clientes/page.tsx.",
              "Paso 2: Desarrollar el listado paginado de clientes registrados con su nombre, teléfono y saldo deudor actual.",
              "Paso 3: Crear el formulario de alta de nuevo cliente que invoque la Server Action crearClienteFinal.ts.",
              "Paso 4: Validar el teléfono para evitar duplicados capturando el código de error NX-FIA-005."
            ],
            "criteriosAceptacion": [
              "Dado el panel de clientes, cuando se ingresan los datos de un nuevo cliente final, entonces se crea el registro con saldo_deudor en 0 y se actualiza el listado.",
              "Dado un teléfono repetido en el alta, cuando se envía el formulario, entonces se bloquea la inserción y se muestra en pantalla el error NX-FIA-005."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 9: Módulo Clientes y Cuentas Corrientes (Fiado)",
        "epicaDescripcion": "",
        "titulo": "Selector de Clientes en el Mostrador y Pago Integrado",
        "descripcion": "Como cajero quiero seleccionar un cliente registrado en el mostrador para imputar el cobro a su cuenta corriente como fiado de forma directa.",
        "prioridad": "Alta",
        "estimacion": 8,
        "actividades": [
          {
            "titulo": "Integración de Cuentas Corrientes en el Panel de Ventas",
            "rol": "Frontend",
            "componente": "SelectorClienteMostrador",
            "ruta": "src/app/(app)/mostrador/",
            "modulo": "Clientes y Fiados",
            "etiquetas": ["frontend", "mostrador", "cobro"],
            "pasos": [
              "Paso 1: Agregar un selector de cliente final debounced en BuscadorProductos.tsx.",
              "Paso 2: Pasar el cliente_final_id seleccionado al componente ConfirmarCobro.tsx como input oculto.",
              "Paso 3: Modificar la Server Action confirmarVenta para enviar el clienteFinalId al RPC de Supabase.",
              "Paso 4: Validar en el mostrador que si se selecciona un cliente, se actualice su saldo deudor en base de datos al confirmar."
            ],
            "criteriosAceptacion": [
              "Dado un carrito de ventas activo con un cliente final seleccionado, cuando se confirma el cobro, entonces el saldo deudor del cliente final aumenta en la base de datos por el total de la venta.",
              "Dado el flujo de fiado, si la venta falla por stock insuficiente, entonces la transacción se revierte por completo (rollback) sin alterar el saldo deudor."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 9: Módulo Clientes y Cuentas Corrientes (Fiado)",
        "epicaDescripcion": "",
        "titulo": "Registro de Pagos de Cuenta Corriente",
        "descripcion": "Como comerciante o empleado quiero registrar un pago parcial o total de la deuda de un cliente en su ficha para deducir su saldo deudor.",
        "prioridad": "Alta",
        "estimacion": 4,
        "actividades": [
          {
            "titulo": "Formulario de Cobro en Ficha de Cuenta Corriente",
            "rol": "Frontend",
            "componente": "FormularioPagoCuentaCorriente",
            "ruta": "src/app/(app)/clientes/[clienteFinalId]/page.tsx",
            "modulo": "Clientes y Fiados",
            "etiquetas": ["frontend", "fiados", "pagos"],
            "pasos": [
              "Paso 1: Añadir un botón 'Registrar Pago' en la página de estado de cuenta corriente.",
              "Paso 2: Mostrar un formulario para ingresar el monto del pago.",
              "Paso 3: Conectar el envío del formulario a la Server Action registrarPagoCuentaCorriente.ts.",
              "Paso 4: Validar en cliente y servidor que el monto de pago no exceda el saldo deudor actual (control de error NX-FIA-003)."
            ],
            "criteriosAceptacion": [
              "Dado el detalle de un cliente con saldo deudor, cuando se registra un pago menor o igual a la deuda, entonces el saldo deudor se reduce en tiempo real en la UI y se añade al historial de movimientos.",
              "Dado un monto de pago que excede la deuda actual, cuando se procesa, entonces se muestra el error explicativo NX-FIA-003."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 6: Panel de Ventas / Mostrador",
        "epicaDescripcion": "",
        "titulo": "UI de Historial y Detalle de Ventas",
        "descripcion": "Como comerciante o empleado del comercio quiero ver el historial de ventas concretadas y consultar su desglose de productos para tener control de caja e iniciar devoluciones.",
        "prioridad": "Alta",
        "estimacion": 5,
        "actividades": [
          {
            "titulo": "Desarrollo del Historial de Ventas y Vista de Detalle",
            "rol": "Frontend",
            "componente": "HistorialVentas",
            "ruta": "src/app/(app)/ventas/",
            "modulo": "Ventas",
            "etiquetas": ["frontend", "ventas", "historial"],
            "pasos": [
              "Paso 1: Crear la página principal de historial src/app/(app)/ventas/page.tsx con listado paginado.",
              "Paso 2: Crear la vista dinámica de desglose de venta src/app/(app)/ventas/[ventaId]/page.tsx.",
              "Paso 3: Cargar los ítems vendidos, precio unitario de persistencia, fecha y datos de cobro.",
              "Paso 4: Añadir en el detalle de la venta el botón 'Iniciar Devolución' redirigiendo a la pantalla correspondiente."
            ],
            "criteriosAceptacion": [
              "Dado un comerciante, cuando accede a /ventas, entonces visualiza el listado de ventas ordenado cronológicamente.",
              "Dado el detalle de una venta en /ventas/[ventaId], cuando se visualiza, entonces muestra los productos y el botón para iniciar la devolución."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 10: Módulo Devoluciones y Notas de Crédito",
        "epicaDescripcion": "",
        "titulo": "UI de Listado y Registro de Devoluciones",
        "descripcion": "Como comerciante quiero registrar devoluciones de productos y emitir notas de crédito para mantener el stock y la facturación cuadrados.",
        "prioridad": "Alta",
        "estimacion": 5,
        "actividades": [
          {
            "titulo": "Interfaz para Registrar Devolución de Ventas",
            "rol": "Frontend",
            "componente": "FormularioDevolucion",
            "ruta": "src/app/(app)/devoluciones/nueva/page.tsx",
            "modulo": "Devoluciones",
            "etiquetas": ["frontend", "devoluciones", "notas_credito"],
            "pasos": [
              "Paso 1: Crear la pantalla de registro src/app/(app)/devoluciones/nueva/page.tsx.",
              "Paso 2: Permitir seleccionar qué ítems de la venta se devuelven e ingresar la cantidad a devolver y el motivo de la devolución.",
              "Paso 3: Enviar el formulario a la Server Action registrarDevolucion.ts.",
              "Paso 4: Crear la página src/app/(app)/devoluciones/page.tsx para listar las devoluciones procesadas y sus notas de crédito."
            ],
            "criteriosAceptacion": [
              "Dado el formulario de devolución, cuando se confirma la devolución total o parcial de ítems, entonces se reduce el total de la venta, se incrementa el stock de los productos correspondientes y se emite la nota de crédito.",
              "Dado un intento de devolver más unidades de las compradas originalmente, cuando se envía el formulario, entonces el sistema rechaza el proceso lanzando el código NX-DEV-002."
            ]
          }
        ]
      }
    ]
  },
  {
    "sprintNombre": "Sprint 13: Portal de Administración de NODEXA y Cobertura de Pruebas",
    "sprintObjetivo": "Entregar las interfaces para el Administrador NODEXA, la autogestión de módulos para el comerciante y asegurar la calidad del frontend mediante pruebas E2E.",
    "sprintDuracionSemanas": 2,
    "sprintCapacidad": 30,
    "historias": [
      {
        "epicaNombre": "Épica 3: Alta y Onboarding de Comercios (Administrador NODEXA)",
        "epicaDescripcion": "",
        "titulo": "UI de Alta y Detalle de Comercios para Admin",
        "descripcion": "Como administrador de NODEXA quiero crear clientes/comercios y ver sus fichas de control de forma visual para gestionar la base de clientes según el SOP-01.",
        "prioridad": "Alta",
        "estimacion": 6,
        "actividades": [
          {
            "titulo": "Panel de Alta de Comercio y Ficha de Onboarding",
            "rol": "Frontend",
            "componente": "FormularioAltaClienteAdmin",
            "ruta": "src/app/(admin)/admin/clientes/nuevo/page.tsx",
            "modulo": "Administración de Clientes",
            "etiquetas": ["frontend", "admin", "onboarding"],
            "pasos": [
              "Paso 1: Crear la página de alta en la ruta src/app/(admin)/admin/clientes/nuevo/page.tsx.",
              "Paso 2: Desarrollar el formulario con campos para el nombre del comercio, slug de vidriera, límite SKU inicial y módulos activos iniciales.",
              "Paso 3: Conectar a la Server Action crearCliente (o servicio equivalente de onboarding).",
              "Paso 4: Crear la vista principal del panel en src/app/(admin)/admin/page.tsx."
            ],
            "criteriosAceptacion": [
              "Dado un administrador de NODEXA, cuando completa el formulario en /admin/clientes/nuevo, entonces se da de alta al comercio en la base de datos y se activa su sesión.",
              "Dado un slug de comercio ya existente, cuando se guarda, entonces la validación previene el alta duplicada."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 3: Alta y Onboarding de Comercios (Administrador NODEXA)",
        "epicaDescripcion": "",
        "titulo": "UI de Activación de Módulos (Admin & Comerciante)",
        "descripcion": "Como administrador de NODEXA quiero gestionar los módulos de cada comercio de forma visual, y como comerciante quiero gestionar mis suscripciones a los mismos.",
        "prioridad": "Media",
        "estimacion": 6,
        "actividades": [
          {
            "titulo": "Gestión Visual de Módulos Contratados",
            "rol": "Frontend",
            "componente": "MarketplaceModulos",
            "ruta": "src/app/(app)/configuracion/modulos/page.tsx",
            "modulo": "Administración de Clientes",
            "etiquetas": ["frontend", "configuracion", "modulos"],
            "pasos": [
              "Paso 1: Crear la pantalla de visualización de módulos contratados src/app/(app)/configuracion/modulos/page.tsx.",
              "Paso 2: Crear el panel de activación administrativa en la ruta src/app/(admin)/admin/clientes/[clienteId]/modulos/page.tsx.",
              "Paso 3: Conectar el panel administrativo a las mutaciones de tenant_modules.",
              "Paso 4: Ofrecer botón de solicitud de activación para comerciantes si no lo tienen contratado."
            ],
            "criteriosAceptacion": [
              "Dado el administrador en la ficha del comercio, cuando activa el flag del módulo, entonces las funciones RLS e interfaces de ese cliente habilitan el módulo inmediatamente.",
              "Dado el comerciante en su configuración de módulos, cuando solicita activar uno, entonces se registra la solicitud o se activa si es autogestionable."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 13: Facturación, Límites y Gestión de Morosidad",
        "epicaDescripcion": "",
        "titulo": "UI de Reporte de Morosidad y General de Admin",
        "descripcion": "Como administrador de NODEXA quiero ver los comercios en mora y suspender o reactivar su acceso de forma visual según el SOP-04.",
        "prioridad": "Media",
        "estimacion": 6,
        "actividades": [
          {
            "titulo": "Panel de Control de Mora y Suspensiones",
            "rol": "Frontend",
            "componente": "ControlMorosidad",
            "ruta": "src/app/(admin)/admin/morosidad/page.tsx",
            "modulo": "Administración de Clientes",
            "etiquetas": ["frontend", "admin", "morosidad"],
            "pasos": [
              "Paso 1: Crear la vista de morosidad src/app/(admin)/admin/morosidad/page.tsx.",
              "Paso 2: Listar los clientes con abonos pendientes y estado_pago.",
              "Paso 3: Integrar botón para suspender (estado_pago = false) o reactivar (estado_pago = true) llamando a actualizarEstadoPago.ts.",
              "Paso 4: Mostrar el enlace de notificación de WhatsApp pregenerado según construirNotificacionEstadoPago.ts."
            ],
            "criteriosAceptacion": [
              "Dado el panel de morosidad, cuando el administrador pulsa en suspender, entonces el estado de pago cambia a inactivo y el comercio es redirigido a la pantalla de suspensión al intentar loguearse.",
              "Dado el comercio regularizado, cuando el administrador pulsa reactivar, entonces se restaura el acceso al instante."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 13: Facturación, Límites y Gestión de Morosidad",
        "epicaDescripcion": "",
        "titulo": "UI de Datos del Comercio y Centro de Ayuda",
        "descripcion": "Como comerciante quiero ver y configurar mis datos básicos de comercio y acceder a micro-tips para entender el uso de la plataforma.",
        "prioridad": "Media",
        "estimacion": 6,
        "actividades": [
          {
            "titulo": "Páginas de Configuración y Centro de Ayuda Educativa",
            "rol": "Frontend",
            "componente": "AyudaYConfiguracion",
            "ruta": "src/app/(app)/configuracion/page.tsx",
            "modulo": "Configuración",
            "etiquetas": ["frontend", "ayuda", "configuracion"],
            "pasos": [
              "Paso 1: Crear la página de configuración src/app/(app)/configuracion/page.tsx con datos básicos (nombre, whatsapp, logo).",
              "Paso 2: Crear el centro de ayuda interactivo src/app/(app)/ayuda/page.tsx.",
              "Paso 3: Diseñar micro-tips educativos contextuales en base al perfil del comercio.",
              "Paso 4: Respetar la tipografía, diseño y paleta Verde Nodexa según el sistema de diseño."
            ],
            "criteriosAceptacion": [
              "Dado el centro de ayuda, cuando el usuario navega por las secciones, entonces los textos explicativos e iconos de lucide-react cargan de forma limpia y responsiva."
            ]
          }
        ]
      },
      {
        "epicaNombre": "Épica 15: Calidad, Testing y Aseguramiento de Cobertura",
        "epicaDescripcion": "",
        "titulo": "Pruebas de Componentes y E2E de Vistas de Recuperación (Playwright)",
        "descripcion": "Como equipo de desarrollo quiero escribir pruebas unitarias de componentes y flujos de Playwright para las nuevas vistas creadas, garantizando el 80% de cobertura mínima de calidad.",
        "prioridad": "Alta",
        "estimacion": 6,
        "actividades": [
          {
            "titulo": "Suite de Pruebas de Interfaces de Recuperación",
            "rol": "QA",
            "componente": "auditoria-frontend-especs",
            "ruta": "e2e/flujos-criticos/",
            "modulo": "Calidad y Testing",
            "etiquetas": ["testing", "playwright", "e2e", "qa"],
            "pasos": [
              "Paso 1: Crear archivos de pruebas e2e para la navegación del Sidebar y el comportamiento ante bloqueos de tenant_modules.",
              "Paso 2: Escribir pruebas de edición de producto y registro de stock.",
              "Paso 3: Automatizar el flujo de cobro a cuenta corriente de fiados y registro de pagos.",
              "Paso 4: Escribir pruebas de integración con mocks de Cloudinary e importación de Excel en la UI."
            ],
            "criteriosAceptacion": [
              "Dado el pipeline de CI/CD, cuando se ejecutan las pruebas automatizadas de e2e, entonces el 100% de los flujos críticos visuales finalizan en verde y la cobertura cumple el mínimo del 80%."
            ]
          }
        ]
      }
    ]
  }
]
