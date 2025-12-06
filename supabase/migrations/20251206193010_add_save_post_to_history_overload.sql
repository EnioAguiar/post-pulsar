-- Create an overloaded function save_post_to_history that accepts 5 parameters
-- This function will call the 6-parameter version, passing NULL for p_generated_image_url.
CREATE OR REPLACE FUNCTION public.save_post_to_history(
  p_user_id uuid,
  p_source_url text,
  p_language text,
  p_content jsonb,
  p_media_map jsonb
)
RETURNS bigint
AS $$
BEGIN
  RETURN public.save_post_to_history(
    p_user_id,
    p_source_url,
    p_language,
    p_content,
    p_media_map,
    NULL -- Explicitly pass NULL for p_generated_image_url
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.save_post_to_history(uuid, text, text, jsonb, jsonb)
IS 'Overloaded function to save a generated post to history without a specific generated_image_url, calling the full version with NULL for the image URL.';

-- No need to drop the 6-parameter version, as CREATE OR REPLACE will update it if its signature changes,
-- and the presence of both functions with different signatures is what overloading is about.
