-- Update user-files bucket to allow larger files (up to 5GB)
UPDATE storage.buckets
SET file_size_limit = 5368709120
WHERE id = 'user-files';