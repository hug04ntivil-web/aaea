-- Función para crear usuario + perfil en una sola transacción atómica.
-- SECURITY DEFINER → corre como postgres, con acceso a auth.users.
-- Requiere extensión pgcrypto (viene habilitada por defecto en Supabase).
-- Ejecutar en el Editor SQL de Supabase.

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email    text,
  p_password text,
  p_name     text,
  p_phone    text,
  p_role     text
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Solo administradores pueden llamar esta función
  IF get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  -- Validar rol
  IF p_role NOT IN ('admin', 'inspector', 'client') THEN
    RAISE EXCEPTION 'Rol inválido: %', p_role;
  END IF;

  -- Crear usuario directamente en auth.users (atómico con el perfil)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),  -- auto-confirmado, sin necesidad de verificar email
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', p_name, 'role', p_role),
    now(),
    now(),
    '', '', '', ''
  )
  RETURNING id INTO new_id;

  -- Crear perfil en la misma transacción
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (new_id, p_name, p_email, p_phone, p_role);

  RETURN new_id;
END;
$$;

-- Revocar acceso público y solo permitir desde roles autenticados
REVOKE ALL ON FUNCTION public.admin_create_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user TO authenticated;
