-- Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Public read access for post-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder in post-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in post-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in post-images" ON storage.objects;

-- Policy 1: Public read access
-- Allows anyone to read files from the 'post-images' bucket.
CREATE POLICY "Public read access for post-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'post-images' );

-- Policy 2: User can upload to their own folder
-- Allows authenticated users to insert files into a folder path where the second folder is their UID.
-- e.g., post-images/user-media/<user_id>/...
CREATE POLICY "Users can upload to their own folder in post-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( (bucket_id = 'post-images') AND ((storage.foldername(name))[2] = (auth.uid())::text) );

-- Policy 3: User can update their own files
-- Allows authenticated users to update files within their own folder.
CREATE POLICY "Users can update their own files in post-images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( (bucket_id = 'post-images') AND ((storage.foldername(name))[2] = (auth.uid())::text) );

-- Policy 4: User can delete their own files
-- Allows authenticated users to delete files from their own folder.
CREATE POLICY "Users can delete their own files in post-images"
ON storage.objects FOR DELETE
TO authenticated
USING ( (bucket_id = 'post-images') AND ((storage.foldername(name))[2] = (auth.uid())::text) );
