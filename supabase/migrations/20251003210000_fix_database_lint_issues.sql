-- 1. Optimize RLS policies on public.purchases by wrapping auth.uid() in a SELECT
-- This prevents the function from being re-evaluated for each row, improving performance.

-- Drop the old, non-performant policies
DROP POLICY IF EXISTS "Users can view their own purchases" ON "public"."purchases";
DROP POLICY IF EXISTS "Users can insert their own purchases" ON "public"."purchases";

-- Recreate the policies with the optimized subquery
CREATE POLICY "Users can view their own purchases" ON "public"."purchases"
    FOR SELECT USING (((SELECT auth.uid()) = user_id));

CREATE POLICY "Users can insert their own purchases" ON "public"."purchases"
    FOR INSERT WITH CHECK (((SELECT auth.uid()) = user_id));

-- 2. Fix mutable search_path for database functions
-- This enhances security by preventing function hijacking and ensures stable behavior.

-- Fix for charge_pulse_for_generation
CREATE OR REPLACE FUNCTION public.charge_pulse_for_generation(
  p_user_id uuid,
  p_pulse_cost int DEFAULT 1
)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = monthly_pulses_remaining - p_pulse_cost
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix for save_post_to_history
CREATE OR REPLACE FUNCTION public.save_post_to_history(
  p_user_id uuid,
  p_source_url text,
  p_language text,
  p_content jsonb,
  p_media_map jsonb
)
RETURNS bigint
AS $$
DECLARE
  post_count int;
  post_limit int := 20;
  existing_post_id bigint;
BEGIN
  SELECT id INTO existing_post_id
  FROM public.generated_posts
  WHERE user_id = p_user_id AND source_url = p_source_url AND content = p_content
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.generated_posts
    SET media_map = media_map || p_media_map
    WHERE id = existing_post_id;
    RETURN existing_post_id;
  ELSE
    SELECT count(*)
    INTO post_count
    FROM public.generated_posts
    WHERE user_id = p_user_id;

    IF post_count >= post_limit THEN
      DELETE FROM public.generated_posts
      WHERE id = (
        SELECT id
        FROM public.generated_posts
        WHERE user_id = p_user_id
        ORDER BY created_at ASC
        LIMIT 1
      );
    END IF;

    INSERT INTO public.generated_posts (user_id, source_url, language, content, media_map)
    VALUES (p_user_id, p_source_url, p_language, p_content, p_media_map)
    RETURNING id INTO existing_post_id;

    RETURN existing_post_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix for reset_monthly_pulses
CREATE OR REPLACE FUNCTION public.reset_monthly_pulses()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_pulses_remaining = monthly_pulses_remaining + CASE
    WHEN replace(plan_type::text, '''', '') = 'free' THEN 70
    WHEN replace(plan_type::text, '''', '') = 'classic' THEN 210
    WHEN replace(plan_type::text, '''', '') = 'pro' THEN 500
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql SET search_path = public;
