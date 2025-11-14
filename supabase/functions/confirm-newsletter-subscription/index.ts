// supabase/functions/confirm-newsletter-subscription/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:4321'; // Fallback for local testing

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.');
  Deno.exit(1); // Exit if critical env var is missing
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');

    if (!token || !email) {
      return Response.redirect(`${SITE_URL}/newsletter/error?message=missing_params`, 302);
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the subscriber with the given email, token, and pending status
    const { data: subscriber, error: fetchError } = await supabaseClient
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .eq('confirmation_token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !subscriber) {
      console.error('Error fetching subscriber or subscriber not found:', fetchError);
      return Response.redirect(`${SITE_URL}/newsletter/error?message=invalid_token_or_email`, 302);
    }

    // If subscriber found and status is pending, update to subscribed
    const { error: updateError } = await supabaseClient
      .from('newsletter_subscribers')
      .update({
        status: 'subscribed',
        subscribed_at: new Date().toISOString(),
        confirmation_token: null, // Clear token after use
      })
      .eq('id', subscriber.id);

    if (updateError) {
      console.error('Error updating subscriber status:', updateError);
      return Response.redirect(`${SITE_URL}/newsletter/error?message=update_failed`, 302);
    }

    // Redirect to a success page
    return Response.redirect(`${SITE_URL}/newsletter/success`, 302);
  } catch (error) {
    console.error('Unhandled error in confirmation function:', error);
    return Response.redirect(`${SITE_URL}/newsletter/error?message=internal_error`, 302);
  }
});