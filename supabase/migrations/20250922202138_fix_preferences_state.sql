ALTER TABLE public.profiles ADD COLUMN prefers_twitter_premium boolean DEFAULT false;

ALTER TABLE public.profiles ADD COLUMN prefers_telegram_media_limit boolean DEFAULT false;

CREATE OR REPLACE FUNCTION public.update_char_preferences(
  linkedin_chars integer,
  twitter_chars integer,
  instagram_chars integer,
  threads_chars integer,
  facebook_chars integer,
  pinterest_chars integer,
  discord_chars integer,
  telegram_chars integer,
  twitter_premium boolean,
  telegram_media boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    default_linkedin_chars = linkedin_chars,
    default_twitter_chars = twitter_chars,
    default_instagram_chars = instagram_chars,
    default_threads_chars = threads_chars,
    default_facebook_chars = facebook_chars,
    default_pinterest_chars = pinterest_chars,
    default_discord_chars = discord_chars,
    default_telegram_chars = telegram_chars,
    prefers_twitter_premium = twitter_premium,
    prefers_telegram_media_limit = telegram_media
  WHERE
    id = auth.uid();
END;
$$;
