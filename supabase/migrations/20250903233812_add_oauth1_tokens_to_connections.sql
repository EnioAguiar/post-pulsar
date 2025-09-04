ALTER TABLE public.social_connections
ADD COLUMN oauth_token TEXT,
ADD COLUMN oauth_token_secret TEXT;
