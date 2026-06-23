-- Función para auto-confirmar email de un usuario recién creado
-- Ejecutar en el Editor SQL de Supabase dashboard
-- Necesaria para que inspectores/admins creados puedan iniciar sesión inmediatamente

CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;
