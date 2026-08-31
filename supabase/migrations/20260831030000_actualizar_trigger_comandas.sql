-- Migration: Validación de Geolocalización en Pedidos Web
-- Archivo: supabase/migrations/20260831030000_actualizar_trigger_comandas.sql
-- Módulo: Logística / Pedidos Web

CREATE OR REPLACE FUNCTION fn_validar_pedido_web()
RETURNS TRIGGER AS 
BEGIN
  IF jsonb_typeof(NEW.datos_cliente) <> 'object' THEN
    RAISE EXCEPTION 'NX-SYS-006: Los datos del cliente deben ser un objeto JSON válido.'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.metodo_pago IS NULL OR TRIM(NEW.metodo_pago) = '' THEN
    RAISE EXCEPTION 'NX-SYS-006: El método de pago es obligatorio.'
      USING ERRCODE = '22023';
  END IF;

  -- Validación de geolocalización: Si es entrega a domicilio ('envio'), se exige latitud y longitud
  IF NEW.opcion_entrega = 'envio' THEN
    IF NOT (NEW.datos_cliente ? 'latitud') 
       OR NOT (NEW.datos_cliente ? 'longitud')
       OR (NEW.datos_cliente ->> 'latitud') IS NULL 
       OR TRIM(NEW.datos_cliente ->> 'latitud') = ''
       OR (NEW.datos_cliente ->> 'longitud') IS NULL 
       OR TRIM(NEW.datos_cliente ->> 'longitud') = '' THEN
      RAISE EXCEPTION 'NX-SYS-006: Los pedidos con envío a domicilio deben incluir las coordenadas de geolocalización (latitud y longitud).'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
 LANGUAGE plpgsql;
