-- Migración adicional presupuestos v2b
-- Ejecutar en Supabase SQL Editor después de sql_budget_v2.sql

-- Columnas extra para guardar totales de las 3 opciones de precio
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS total_alternativo  numeric(12,0) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_otro         numeric(12,0) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gran_total_alternativo numeric(12,0) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gran_total_otro    numeric(12,0) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opcion_aceptada    text;

-- Columna en items para precio repuesto original (campo semántico)
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS rep_original numeric(12,0) DEFAULT 0;

-- Sincronizar rep_original con rep_genuino (datos existentes)
UPDATE public.budget_items SET rep_original = rep_genuino WHERE rep_original = 0 AND rep_genuino > 0;

-- Índice en public_token para búsquedas rápidas en página pública
CREATE INDEX IF NOT EXISTS idx_budgets_public_token ON public.budgets (public_token);
