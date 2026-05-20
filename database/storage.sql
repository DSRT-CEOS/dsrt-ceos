-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('company-documents', 'company-documents', false, 52428800, NULL),
  ('tender-documents', 'tender-documents', false, 104857600, NULL),
  ('generated-documents', 'generated-documents', false, 104857600, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-documents
CREATE POLICY "Authenticated users can upload company docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-documents');

CREATE POLICY "Authenticated users can read company docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'company-documents');

CREATE POLICY "Authenticated users can update company docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-documents');

CREATE POLICY "Authenticated users can delete company docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-documents');

-- Storage policies for tender-documents
CREATE POLICY "Authenticated users can upload tender docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tender-documents');

CREATE POLICY "Authenticated users can read tender docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tender-documents');

CREATE POLICY "Authenticated users can update tender docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tender-documents');

CREATE POLICY "Authenticated users can delete tender docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tender-documents');

-- Storage policies for generated-documents
CREATE POLICY "Authenticated users can upload generated docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'generated-documents');

CREATE POLICY "Authenticated users can read generated docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'generated-documents');

CREATE POLICY "Authenticated users can update generated docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'generated-documents');

CREATE POLICY "Authenticated users can delete generated docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'generated-documents');

SELECT 'Storage buckets and policies created successfully' AS status;