-- Add 'purpose' column to social_connections table
ALTER TABLE public.social_connections
ADD COLUMN purpose TEXT NOT NULL DEFAULT 'publishing';

-- Drop the old unique constraint
ALTER TABLE public.social_connections
DROP CONSTRAINT unique_user_provider_provider_user_id;

-- Add the new unique constraint
ALTER TABLE public.social_connections
ADD CONSTRAINT unique_user_provider_provider_user_id_purpose UNIQUE (user_id, provider, provider_user_id, purpose);
