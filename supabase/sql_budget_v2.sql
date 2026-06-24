-- ================================================
-- BUDGET V2 MIGRATION
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- 1. Agregar título profesional a profiles (para inspector)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS professional_title text;

-- 2. Campos de vehículo directo en budgets (para presupuestos sin inspección)
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vehicle_patente text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vehicle_marca text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vehicle_modelo text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vehicle_anio integer;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vehicle_version text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vehicle_vin text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vehicle_num_motor text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vehicle_color text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vehicle_km integer;

-- 3. Campos de cliente libre (sin perfil registrado)
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS cliente_nombre text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS cliente_rut text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS cliente_telefono text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS cliente_email text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS cliente_ciudad text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS cliente_direccion text;

-- 4. Nuevos campos de totales y configuración
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS descuento_global numeric(12,0) DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS descripcion_servicio text;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS vigencia_dias integer DEFAULT 30;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS total_repuestos numeric(12,0) DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS total_mano_obra numeric(12,0) DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS gran_total numeric(12,0) DEFAULT 0;

-- 5. Nuevas columnas en budget_items (nuevo formato: gestión + repuesto + mano obra)
ALTER TABLE public.budget_items ADD COLUMN IF NOT EXISTS gestion text DEFAULT 'MECÁNICO';
ALTER TABLE public.budget_items ADD COLUMN IF NOT EXISTS gestion_custom text;
ALTER TABLE public.budget_items ADD COLUMN IF NOT EXISTS val_repuesto numeric(12,0) DEFAULT 0;
ALTER TABLE public.budget_items ADD COLUMN IF NOT EXISTS val_mano_obra numeric(12,0) DEFAULT 0;

-- 6. Nuevas claves en settings (datos bancarios y empresa)
INSERT INTO public.settings (key, value) VALUES
  ('company_address2', ''),
  ('company_services', 'SERVICIOS INTEGRALES DE INSPECCIÓN Y ASESORÍA AUTOMOTRIZ'),
  ('payment_bank', ''),
  ('payment_account_type', 'Cuenta Corriente'),
  ('payment_account_number', ''),
  ('payment_rut', ''),
  ('payment_email', ''),
  ('payment_note', 'Monto a pagar en efectivo o transferencia. Pago a fecha recarga 10% del valor total.')
ON CONFLICT (key) DO NOTHING;

-- 7. Actualizar la función de numeración a formato PTO_000001
CREATE OR REPLACE FUNCTION public.get_next_budget_number()
RETURNS text AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT (value::integer) INTO next_num FROM public.settings WHERE key = 'budget_next_number';
  UPDATE public.settings SET value = (next_num + 1)::text, updated_at = now() WHERE key = 'budget_next_number';
  RETURN 'PTO_' || lpad(next_num::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Actualizar el número existente en settings si aún es PR-
-- (si ya hay presupuestos con PR-, esto no los afecta)
-- Solo actualiza la función de formato, los existentes conservan su número

-- Verificar todo correcto:
SELECT column_name FROM information_schema.columns WHERE table_name = 'budgets' ORDER BY ordinal_position;
SELECT column_name FROM information_schema.columns WHERE table_name = 'budget_items' ORDER BY ordinal_position;
SELECT key, value FROM public.settings ORDER BY key;
