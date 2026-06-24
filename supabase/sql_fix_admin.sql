-- Permite al rol anónimo (cliente público) aceptar un presupuesto
-- Solo si tiene public_token y aún no fue aceptado
CREATE POLICY IF NOT EXISTS "Anon can accept open budgets"
ON public.budgets
FOR UPDATE
TO anon
USING (public_token IS NOT NULL AND status IN ('draft', 'sent'))
WITH CHECK (status = 'accepted');

-- Permite al rol anónimo leer presupuestos para verificar status antes de aceptar
-- (la política de SELECT ya debe existir desde sql_public_access.sql)
-- Si da error "already exists", ya está creada — ignorar.

-- Asegura que profiles permite a cada usuario actualizar su propio registro
-- (necesario para /api/me PATCH sin service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END
$$;
