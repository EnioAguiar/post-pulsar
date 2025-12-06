CREATE OR REPLACE FUNCTION public.append_publication_target(
    p_post_id bigint,
    p_provider text,
    p_target_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atomically append the new publication target ID to the JSONB column.
  UPDATE public.generated_posts
  SET 
    publication_targets = COALESCE(publication_targets, '{}'::jsonb) || jsonb_build_object(p_provider, p_target_id)
  WHERE 
    id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_publication_target(bigint, text, text) TO authenticated;
