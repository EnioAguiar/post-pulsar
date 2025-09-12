-- Remove a constraint antiga que só considera user_id e provider
ALTER TABLE public.social_connections DROP CONSTRAINT IF EXISTS unique_user_provider;

-- Adiciona a coluna que estava faltando
ALTER TABLE public.social_connections ADD COLUMN IF NOT EXISTS provider_user_id TEXT;

-- Adiciona a nova constraint mais flexível
ALTER TABLE public.social_connections ADD CONSTRAINT unique_user_provider_provider_user_id UNIQUE (user_id, provider, provider_user_id);
