-- supabase/migrations/20251128000000_create_jvzoo_rpc_functions.sql

-- Helper function to get user id from email
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = p_email;
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


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
  -- ELSEIF p_product_id = 'YOUR_JVZOO_PRODUCT_ID_CLASSIC' THEN
  --   v_plan_type := 'classic';
  --   v_plan_pulses := 210; -- Pulses for Classic Plan
  ELSE
    -- Default or fallback plan if product ID doesn't match
    -- For now, we assume any sale grants the Pro plan as a default.
    v_plan_type := 'pro';
    v_plan_pulses := 500;
    RAISE LOG 'JVZoo Sale: Product ID % not explicitly mapped. Defaulting to Pro plan.', p_product_id;
  END IF;

  -- Check if user exists
  v_user_id := get_user_id_by_email(p_email);

  -- If user does not exist, create them.
  -- NOTE: This part is tricky from SQL. The Edge Function should ideally
  -- handle user creation via auth.admin.createUser if a user is not found.
  -- For simplicity in this SQL, we'll assume the user might need to be created
  -- and then we update their profile. A better approach is to ensure the
  -- user is created *before* calling this RPC, or handle it inside.
  -- The following logic assumes a user/profile row will exist.
  -- Let's rely on the user having signed up first, or handle creation in the Edge Function.
  -- If we must handle it here, it would look more complex.
  -- Let's stick to updating an existing user and let the user know they must sign up first.
  -- A more advanced implementation would create the user.

  IF v_user_id IS NULL THEN
    -- This is a challenge. For now, we'll log it.
    -- The user should ideally have an account first.
    RAISE WARNING 'JVZoo Sale: User with email % does not exist. Cannot grant plan.', p_email;
    RETURN;
  END IF;

  -- Grant the plan to the existing user
  UPDATE public.profiles
  SET
    plan_type = v_plan_type,
    monthly_pulses_remaining = monthly_pulses_remaining + v_plan_pulses,
    plan_expires_at = (now() + interval '30 days')
  WHERE id = v_user_id;

  RAISE LOG 'Granted plan % to user % (ID: %)', v_plan_type, p_email, v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION handle_jvzoo_refund(p_email TEXT, p_product_id TEXT)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := get_user_id_by_email(p_email);

  IF v_user_id IS NULL THEN
    RAISE WARNING 'JVZoo Refund: User with email % does not exist. Cannot process refund.', p_email;
    RETURN;
  END IF;

  -- Downgrade the user to the 'free' plan
  -- We also reset their pulses to the free tier default.
  UPDATE public.profiles
  SET
    plan_type = 'free',
    monthly_pulses_remaining = 70, -- Reset to free plan pulse count
    plan_expires_at = NULL
  WHERE id = v_user_id;

  RAISE LOG 'Processed refund for product % for user % (ID: %). Downgraded to free plan.', p_product_id, p_email, v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
