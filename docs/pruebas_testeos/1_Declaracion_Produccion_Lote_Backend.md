# 1. Declaración Producción Lote (Backend)
## Prerequisitos
- Correr supabase start / migraciones al día.
- Tener un cliente_id válido con un producto tipo 'fabricado' (Empanada) y una receta cargada con insumos.
## Pasos
1. Ejecutar el Server Action registrarProduccionLote pasando un FormData con receta_id válido y cantidad_producida (ej: 100).
## Resultado esperado
- Mensaje visible: { exito: true }
- Dónde verificar: En la BD, tabla movimientos_stock. Se debe registrar 1 movimiento de 'entrada' para la Empanada por 100, y movimientos de 'salida' proporcionales para la carne y cebolla.
- Código HTTP esperado: 200
