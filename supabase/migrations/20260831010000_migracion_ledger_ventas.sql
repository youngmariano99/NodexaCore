-- Migración: Ampliación de esquema Ventas y control de concurrencia Ledger
-- Ticket: Motor Ledger: Impuestos, Pagos y Concurrencia

-- 1. Ampliación de la tabla ventas con campos de desglose impositivo, método de pago y lock_version
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS base_imponible numeric(12,2) NOT NULL DEFAULT 0 CHECK (base_imponible >= 0),
  ADD COLUMN IF NOT EXISTS iva_10_5 numeric(12,2) NOT NULL DEFAULT 0 CHECK (iva_10_5 >= 0),
  ADD COLUMN IF NOT EXISTS iva_21 numeric(12,2) NOT NULL DEFAULT 0 CHECK (iva_21 >= 0),
  ADD COLUMN IF NOT EXISTS percepciones numeric(12,2) NOT NULL DEFAULT 0 CHECK (percepciones >= 0),
  ADD COLUMN IF NOT EXISTS exento numeric(12,2) NOT NULL DEFAULT 0 CHECK (exento >= 0),
  ADD COLUMN IF NOT EXISTS metodo_pago text NOT NULL DEFAULT 'efectivo',
  ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 0 CHECK (lock_version >= 0);

-- 2. Control de concurrencia optimista en movimientos_stock
ALTER TABLE movimientos_stock
  ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 0 CHECK (lock_version >= 0);

-- 3. Control de concurrencia optimista en movimientos_cuenta_corriente
ALTER TABLE movimientos_cuenta_corriente
  ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 0 CHECK (lock_version >= 0);
