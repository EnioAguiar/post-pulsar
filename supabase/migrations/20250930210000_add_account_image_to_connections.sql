ALTER TABLE public.social_connections
ADD COLUMN account_image_url TEXT;

COMMENT ON COLUMN public.social_connections.account_image_url IS 'URL for the profile picture of the connected social media account.';
