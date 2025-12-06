CREATE OR REPLACE FUNCTION public.append_provider_post_id(
    p_post_id uuid,
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

GRANT EXECUTE ON FUNCTION public.append_provider_post_id(uuid, text, text) TO authenticated;
