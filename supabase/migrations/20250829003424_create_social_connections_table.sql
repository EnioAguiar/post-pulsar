
-- Create the table to store social media connection details
CREATE TABLE public.social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL, -- Should be encrypted
    refresh_token TEXT, -- Should be encrypted
    scopes TEXT[],
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A user can only have one connection per provider
    CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- Add comments to the table and columns
COMMENT ON TABLE public.social_connections IS 'Stores access tokens and other details for social media connections.';
COMMENT ON COLUMN public.social_connections.access_token IS 'Encrypted access token for the social media API.';
COMMENT ON COLUMN public.social_connections.refresh_token IS 'Encrypted refresh token for the social media API.';

-- Enable Row-Level Security
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for the social_connections table
CREATE POLICY "Users can view their own connections" 
ON public.social_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections" 
ON public.social_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON public.social_connections FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.social_connections FOR DELETE
USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at timestamp on row update
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.social_connections
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
