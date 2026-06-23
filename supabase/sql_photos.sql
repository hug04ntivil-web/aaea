-- 1. Agregar columna photos a inspections
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

-- 2. Crear bucket de Storage (pública para acceso a imágenes en PDF y portal)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage
-- Inspectores y admins pueden subir fotos
CREATE POLICY "Autenticados pueden subir fotos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspection-photos');

-- Cualquiera puede ver las fotos (necesario para PDF server-side y portal público)
CREATE POLICY "Acceso público fotos inspección"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'inspection-photos');

-- El usuario autenticado puede eliminar sus propias fotos
CREATE POLICY "Autenticados pueden eliminar fotos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inspection-photos');
