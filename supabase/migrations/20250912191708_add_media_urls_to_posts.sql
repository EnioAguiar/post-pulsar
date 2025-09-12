ALTER TABLE public.generated_posts
ADD COLUMN media_urls TEXT[];

COMMENT ON COLUMN public.generated_posts.media_urls IS 'Stores an array of URLs for the media files associated with a post.';
