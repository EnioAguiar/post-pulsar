ALTER TABLE public.generated_posts
ADD COLUMN generated_image_url TEXT;

COMMENT ON COLUMN public.generated_posts.generated_image_url IS 'Stores the URL of the AI-generated quote image.';
