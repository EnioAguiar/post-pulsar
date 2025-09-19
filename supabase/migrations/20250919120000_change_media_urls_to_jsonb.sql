-- Rename the old array column to back it up
ALTER TABLE public.generated_posts
RENAME COLUMN media_urls TO _media_urls_old;

-- Add the new JSONB column that will store a map of network -> media URLs
ALTER TABLE public.generated_posts
ADD COLUMN media_map JSONB;
