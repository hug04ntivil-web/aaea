-- Políticas de acceso público (rol anon) para el portal de cliente
-- Ejecutar en el Editor SQL de Supabase

-- Inspecciones: acceso público para las que tienen token
CREATE POLICY "Acceso público inspecciones" ON public.inspections
  FOR SELECT TO anon USING (public_token IS NOT NULL);

-- Ítems de inspección: acceso público via inspección con token
CREATE POLICY "Acceso público ítems inspección" ON public.inspection_items
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.inspections WHERE id = inspection_id AND public_token IS NOT NULL)
  );

-- Presupuestos: acceso público para los que tienen token
CREATE POLICY "Acceso público presupuestos" ON public.budgets
  FOR SELECT TO anon USING (public_token IS NOT NULL);

-- Ítems presupuesto: acceso público via presupuesto con token
CREATE POLICY "Acceso público ítems presupuesto" ON public.budget_items
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.budgets WHERE id = budget_id AND public_token IS NOT NULL)
  );

-- Datos de soporte para los JOINs
CREATE POLICY "Acceso público clientes" ON public.clients
  FOR SELECT TO anon USING (true);

CREATE POLICY "Acceso público vehículos" ON public.vehicles
  FOR SELECT TO anon USING (true);

CREATE POLICY "Acceso público perfiles" ON public.profiles
  FOR SELECT TO anon USING (true);
