-- Reparar perfiles con role='client' que deberían ser inspector o admin.
-- El trigger on_auth_user_created los crea con 'client' por defecto.
-- Este script toma el rol correcto desde raw_user_meta_data de auth.users.

-- 1. Ver los perfiles afectados (revisar antes de corregir)
SELECT p.id, p.email, p.role AS rol_actual,
       u.raw_user_meta_data->>'role' AS rol_correcto
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'client'
  AND u.raw_user_meta_data->>'role' IN ('inspector', 'admin');

-- 2. Corregir el rol en profiles según lo que se guardó en metadata
UPDATE public.profiles p
SET role = u.raw_user_meta_data->>'role'
FROM auth.users u
WHERE p.id = u.id
  AND p.role = 'client'
  AND u.raw_user_meta_data->>'role' IN ('inspector', 'admin');
