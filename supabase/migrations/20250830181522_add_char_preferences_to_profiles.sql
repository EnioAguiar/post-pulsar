-- Add columns to store user preferences for character counts
ALTER TABLE public.profiles
ADD COLUMN default_linkedin_chars integer,
ADD COLUMN default_twitter_chars integer;
