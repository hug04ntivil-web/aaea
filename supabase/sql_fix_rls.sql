-- ================================================
-- FIX: Reemplazar recursión en políticas RLS
-- Todas las subqueries a profiles se reemplazan con get_my_role()
-- que usa SECURITY DEFINER y no activa RLS
-- ================================================

-- PROFILES
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuario actualiza su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin inserta perfiles" ON public.profiles;

CREATE POLICY "Ver perfiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR get_my_role() = 'admin');

CREATE POLICY "Actualizar propio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Insertar perfiles" ON public.profiles
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'inspector'));

-- CLIENTS
DROP POLICY IF EXISTS "Inspector ve sus clientes" ON public.clients;
DROP POLICY IF EXISTS "Inspector/admin inserta clientes" ON public.clients;
DROP POLICY IF EXISTS "Inspector/admin actualiza clientes" ON public.clients;

CREATE POLICY "Ver clientes" ON public.clients
  FOR SELECT USING (
    created_by = auth.uid() OR get_my_role() = 'admin' OR profile_id = auth.uid()
  );

CREATE POLICY "Insertar clientes" ON public.clients
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'inspector'));

CREATE POLICY "Actualizar clientes" ON public.clients
  FOR UPDATE USING (
    created_by = auth.uid() OR get_my_role() = 'admin'
  );

-- VEHICLES
DROP POLICY IF EXISTS "Usuarios autenticados ven vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Inspector/admin inserta vehículos" ON public.vehicles;
DROP POLICY IF EXISTS "Inspector/admin actualiza vehículos" ON public.vehicles;

CREATE POLICY "Ver vehículos" ON public.vehicles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Insertar vehículos" ON public.vehicles
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'inspector'));

CREATE POLICY "Actualizar vehículos" ON public.vehicles
  FOR UPDATE USING (get_my_role() IN ('admin', 'inspector'));

-- INSPECTIONS
DROP POLICY IF EXISTS "Inspector ve sus inspecciones" ON public.inspections;
DROP POLICY IF EXISTS "Inspector inserta inspecciones" ON public.inspections;
DROP POLICY IF EXISTS "Inspector actualiza sus inspecciones" ON public.inspections;

CREATE POLICY "Ver inspecciones" ON public.inspections
  FOR SELECT USING (
    inspector_id = auth.uid() OR get_my_role() = 'admin' OR
    client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Insertar inspecciones" ON public.inspections
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'inspector'));

CREATE POLICY "Actualizar inspecciones" ON public.inspections
  FOR UPDATE USING (
    inspector_id = auth.uid() OR get_my_role() = 'admin'
  );

-- INSPECTION ITEMS
DROP POLICY IF EXISTS "Ve ítems de sus inspecciones" ON public.inspection_items;
DROP POLICY IF EXISTS "Inspector inserta/actualiza ítems" ON public.inspection_items;

CREATE POLICY "Ver ítems inspección" ON public.inspection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id AND (
        i.inspector_id = auth.uid() OR get_my_role() = 'admin' OR
        i.client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "Gestionar ítems inspección" ON public.inspection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id AND (i.inspector_id = auth.uid() OR get_my_role() = 'admin')
    )
  );

-- BUDGETS
DROP POLICY IF EXISTS "Ve sus presupuestos" ON public.budgets;
DROP POLICY IF EXISTS "Inspector inserta presupuestos" ON public.budgets;
DROP POLICY IF EXISTS "Inspector actualiza presupuestos" ON public.budgets;

CREATE POLICY "Ver presupuestos" ON public.budgets
  FOR SELECT USING (
    inspector_id = auth.uid() OR get_my_role() = 'admin' OR
    client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Insertar presupuestos" ON public.budgets
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'inspector'));

CREATE POLICY "Actualizar presupuestos" ON public.budgets
  FOR UPDATE USING (
    inspector_id = auth.uid() OR get_my_role() = 'admin'
  );

-- BUDGET ITEMS
DROP POLICY IF EXISTS "Ve ítems de sus presupuestos" ON public.budget_items;
DROP POLICY IF EXISTS "Inspector gestiona ítems presupuesto" ON public.budget_items;

CREATE POLICY "Ver ítems presupuesto" ON public.budget_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_id AND (
        b.inspector_id = auth.uid() OR get_my_role() = 'admin' OR
        b.client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "Gestionar ítems presupuesto" ON public.budget_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_id AND (b.inspector_id = auth.uid() OR get_my_role() = 'admin')
    )
  );

-- MESSAGES
DROP POLICY IF EXISTS "Ve sus mensajes" ON public.messages;
DROP POLICY IF EXISTS "Inserta mensajes" ON public.messages;

CREATE POLICY "Ver mensajes" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid() OR get_my_role() = 'admin' OR
    client_id IN (SELECT id FROM public.clients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Insertar mensajes" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- SETTINGS
DROP POLICY IF EXISTS "Todos leen settings" ON public.settings;
DROP POLICY IF EXISTS "Admin actualiza settings" ON public.settings;

CREATE POLICY "Ver settings" ON public.settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin actualiza settings" ON public.settings
  FOR UPDATE USING (get_my_role() = 'admin');
