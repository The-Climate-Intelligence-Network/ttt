-- Create policies to allow public uploads and downloads on 'ttt' storage bucket

-- Allow public read access to objects in 'ttt' bucket
CREATE POLICY "Allow public read access to ttt bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'ttt');

-- Allow anonymous upload access to 'ttt' bucket
CREATE POLICY "Allow public upload access to ttt bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ttt');

-- Allow users to update/overwrite their uploads if needed (e.g. for retakes)
CREATE POLICY "Allow public update access to ttt bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ttt')
WITH CHECK (bucket_id = 'ttt');

-- Allow users to delete their uploads
CREATE POLICY "Allow public delete access to ttt bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'ttt');
