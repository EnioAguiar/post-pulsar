create or replace function public.update_char_preferences(linkedin_chars integer, twitter_chars integer)
returns void as $$
begin
  update public.profiles
  set 
    default_linkedin_chars = linkedin_chars,
    default_twitter_chars = twitter_chars
  where id = auth.uid();
end;
$$ language plpgsql;
