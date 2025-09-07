ALTER TABLE public.profiles
ADD COLUMN default_pinterest_chars integer;

-- Drop the existing function to recreate it with the new parameter
-- The previous version had 5 parameters (linkedin, twitter, instagram, threads, facebook)
DROP FUNCTION IF EXISTS public.update_char_preferences(integer, integer, integer, integer, integer);

-- Recreate the function with the new pinterest_chars parameter
CREATE OR REPLACE FUNCTION public.update_char_preferences(
  linkedin_chars integer,
  twitter_chars integer,
  instagram_chars integer,
  threads_chars integer,
  facebook_chars integer,
  pinterest_chars integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    default_linkedin_chars = linkedin_chars,
    default_twitter_chars = twitter_chars,
    default_instagram_chars = instagram_chars,
    default_threads_chars = threads_chars,
    default_facebook_chars = facebook_chars,
    default_pinterest_chars = pinterest_chars
  WHERE
    id = auth.uid();
END;
$$;

-- Reset search_path for security, matching the latest pattern
ALTER FUNCTION public.update_char_preferences(integer, integer, integer, integer, integer, integer) SET search_path = 'public', 'pg_temp';
