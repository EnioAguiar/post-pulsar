alter table public.profiles add column default_threads_chars integer;

-- Update the existing RPC function to include the new parameter.
-- This ensures the function is in sync with the latest table structure.
CREATE OR REPLACE FUNCTION public.update_char_preferences(linkedin_chars integer, twitter_chars integer, instagram_chars integer, threads_chars integer)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  update public.profiles
  set 
    default_linkedin_chars = linkedin_chars,
    default_twitter_chars = twitter_chars,
    default_instagram_chars = instagram_chars,
    default_threads_chars = threads_chars
  where id = auth.uid();
$function$;
