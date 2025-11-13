ALTER TABLE public.newsletter_subscribers
ADD COLUMN confirmation_token TEXT UNIQUE;