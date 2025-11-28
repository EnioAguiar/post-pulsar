-- supabase/migrations/20251128110000_update_jvzoo_sale_handler.sql
-- This migration updates the handle_jvzoo_sale function to simplify its logic.
-- The responsibility of checking for and creating a user is now handled entirely
-- by the 'jvzoo-ipn-handler' Edge Function. This function now only
-- assumes a user exists and is responsible for granting the plan.

CREATE OR REPLACE FUNCTION handle_jvzoo_sale(p_email TEXT, p_product_id TEXT)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_plan_type TEXT;
  v_plan_pulses INTEGER;
BEGIN
  -- =================================================================
  -- TODO: Map JVZoo Product ID to your internal plan IDs.
  -- This is a placeholder. You should replace 'YOUR_JVZOO_PRODUCT_ID_PRO'
  -- with the actual product ID from your JVZoo seller dashboard.
  -- =================================================================
  IF p_product_id = 'YOUR_JVZOO_PRODUCT_ID_PRO' THEN
    v_plan_type := 'pro';
    v_plan_pulses := 500; -- Pulses for Pro Plan
  ELSE
    -- Default to Pro plan if product ID doesn't match a specific rule
    v_plan_type := 'pro';
    v_plan_pulses := 500;
    RAISE LOG 'JVZoo Sale: Product ID % not explicitly mapped. Defaulting to Pro plan.', p_product_id;
  END IF;

  -- Get the user ID. The Edge Function ensures the user exists.
  v_user_id := get_user_id_by_email(p_email);

  IF v_user_id IS NULL THEN
    -- This should not happen if the Edge Function is working correctly.
    RAISE EXCEPTION 'JVZoo Sale: User with email % was not found, but should have been created by the Edge Function.', p_email;
    RETURN;
  END IF;

  -- Grant the plan to the existing user
  -- Note: We use COALESCE to safely add pulses even if the current value is NULL.
  UPDATE public.profiles
  SET
    plan_type = v_plan_type,
    monthly_pulses_remaining = COALESCE(monthly_pulses_remaining, 0) + v_plan_pulses,
    plan_expires_at = (now() + interval '30 days')
  WHERE id = v_user_id;

  RAISE LOG 'Granted plan % to user % (ID: %)', v_plan_type, p_email, v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
