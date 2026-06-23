-- Función para crear/actualizar perfil de un usuario recién creado
-- Ejecutar en el Editor SQL de Supabase dashboard
-- Usa SECURITY DEFINER para evitar restricciones RLS sin necesitar service role key

CREATE OR REPLACE FUNCTION public.admin_upsert_profile(
  p_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (p_id, p_full_name, p_email, p_phone, p_role)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    updated_at = NOW();
END;
$$;
