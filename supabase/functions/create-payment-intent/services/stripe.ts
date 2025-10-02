import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

/**
 * Retrieves the Stripe customer ID from the profiles table, or creates a
 * new Stripe customer and saves its ID to the profile if one does not exist.
 * This is required due to an old Stripe API version that doesn't support metadata search.
 *
 * @param userId The ID of the user.
 * @param supabaseAdmin The Supabase admin client.
 * @param stripe The Stripe client.
 * @returns The Stripe customer ID.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
): Promise<string> {
  // 1. Check our database for an existing stripe_customer_id
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profileError && profileError.code !== "PGRST116") { // PGRST116 = row not found
    throw profileError;
  }

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // 2. If not, create a new customer in Stripe
  const customer = await stripe.customers.create({
    metadata: {
      // We still pass metadata here, even if we can't search by it.
      // It's useful for manual lookup in the Stripe dashboard.
      user_id: userId,
    },
  });

  // 3. Save the new customer ID to the user's profile in our database
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  if (updateError) {
    // This could fail if the profile doesn't exist yet for the user.
    // For robustness, we should ideally handle this with an upsert or a check.
    // But for now, we throw to see the error.
    throw updateError;
  }

  return customer.id;
}
