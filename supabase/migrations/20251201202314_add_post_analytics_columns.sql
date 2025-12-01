ALTER TABLE public.generated_posts
ADD COLUMN instagram_likes integer DEFAULT 0 NOT NULL,
ADD COLUMN instagram_comments integer DEFAULT 0 NOT NULL,
ADD COLUMN instagram_reach integer DEFAULT 0 NOT NULL,
ADD COLUMN threads_likes integer DEFAULT 0 NOT NULL,
ADD COLUMN threads_replies integer DEFAULT 0 NOT NULL,
ADD COLUMN threads_reposts integer DEFAULT 0 NOT NULL,
ADD COLUMN facebook_likes integer DEFAULT 0 NOT NULL,
ADD COLUMN facebook_comments integer DEFAULT 0 NOT NULL,
ADD COLUMN facebook_shares integer DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.generated_posts.instagram_likes IS 'Number of likes for the Instagram post.';
COMMENT ON COLUMN public.generated_posts.instagram_comments IS 'Number of comments for the Instagram post.';
COMMENT ON COLUMN public.generated_posts.instagram_reach IS 'Reach for the Instagram post.';
COMMENT ON COLUMN public.generated_posts.threads_likes IS 'Number of likes for the Threads post.';
COMMENT ON COLUMN public.generated_posts.threads_replies IS 'Number of replies for the Threads post.';
COMMENT ON COLUMN public.generated_posts.threads_reposts IS 'Number of reposts for the Threads post.';
COMMENT ON COLUMN public.generated_posts.facebook_likes IS 'Number of likes for the Facebook post.';
COMMENT ON COLUMN public.generated_posts.facebook_comments IS 'Number of comments for the Facebook post.';
COMMENT ON COLUMN public.generated_posts.facebook_shares IS 'Number of shares for the Facebook post.';