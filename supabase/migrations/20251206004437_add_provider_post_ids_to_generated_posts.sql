ALTER TABLE public.generated_posts
ADD COLUMN provider_post_ids jsonb;

COMMENT ON COLUMN public.generated_posts.provider_post_ids IS 'Stores the post IDs returned by the social media providers after a successful publication, in a map format like {"instagram": "...", "facebook": "...", "threads": "..."}.';