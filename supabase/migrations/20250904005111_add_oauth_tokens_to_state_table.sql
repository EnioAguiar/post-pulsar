ALTER TABLE public.oauth_state
ADD COLUMN oauth_token TEXT,
ADD COLUMN oauth_token_secret TEXT;