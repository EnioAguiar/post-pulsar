-- This migration fixes the parameter type of p_post_id from uuid to bigint
-- to match the 'id' column of the 'generated_posts' table.

CREATE OR REPLACE FUNCTION public.append_provider_post_id(
    p_post_id bigint,
    p_provider text,
    p_provider_post_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atomically append the new provider post ID to the JSONB column.
  -- COALESCE is used to handle the case where provider_post_ids is NULL for the first update.
  -- The || operator merges the existing JSONB with the new one.
  UPDATE public.generated_posts
  SET 
    provider_post_ids = COALESCE(provider_post_ids, '{}'::jsonb) || jsonb_build_object(p_provider, p_provider_post_id)
  WHERE 
    id = p_post_id;
END;
$$;

-- Note: The previous GRANT is likely sufficient, but re-granting ensures correctness.
-- We must first drop the old grant if the function signature has changed.
-- It's often safer just to re-run the CREATE OR REPLACE and GRANT statements.
GRANT EXECUTE ON FUNCTION public.append_provider_post_id(bigint, text, text) TO authenticated;
