ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_discord_chars integer,
ADD COLUMN IF NOT EXISTS default_telegram_chars integer;
