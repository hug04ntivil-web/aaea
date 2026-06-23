-- Políticas DELETE para admin (ejecutar en SQL Editor de Supabase)
CREATE POLICY "Admin elimina perfiles" ON public.profiles
  FOR DELETE USING (get_my_role() = 'admin');

CREATE POLICY "Admin elimina clientes" ON public.clients
  FOR DELETE USING (get_my_role() = 'admin');

CREATE POLICY "Admin elimina inspecciones" ON public.inspections
  FOR DELETE USING (get_my_role() = 'admin');

CREATE POLICY "Admin elimina presupuestos" ON public.budgets
  FOR DELETE USING (get_my_role() = 'admin');
