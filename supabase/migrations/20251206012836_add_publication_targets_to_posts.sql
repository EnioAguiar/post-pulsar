ALTER TABLE public.generated_posts
ADD COLUMN publication_targets jsonb;

COMMENT ON COLUMN public.generated_posts.publication_targets IS 'Stores the specific target ID for a publication, like a Facebook Page ID. E.g., {"facebook": "page_id_123"}.';
