// Supabase Edge Function: jvzoo-ipn-handler/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { SupabaseClient, createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

// A simple SHA-1 implementation using Web Crypto API
async function sha1(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

console.log('JVZoo IPN Handler v2 function initialized');

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('This function only accepts POST requests', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const postData: { [key: string]: any } = {};
    for (const [key, value] of formData.entries()) {
      postData[key] = value;
    }
    
    console.log('--- JVZOO IPN V2 RECEIVED ---');
    console.log('Received Form Data:', JSON.stringify(postData, null, 2));

    // --- Verification ---
    const jvzooSecret = Deno.env.get('JVZOO_SECRET_KEY');
    if (!jvzooSecret) {
      console.error('JVZOO_SECRET_KEY is not set in Supabase secrets.');
      return new Response('Internal Server Error: Secret key not configured', { status: 500 });
    }
    
    const {
      paykey = '',
      customer_email = '',
      product_name = '',
      transaction_type = '',
      date = '',
      cverify = ''
    } = postData;

    const verificationString = `${paykey}|${customer_email}|${product_name}|${transaction_type}|${date}${jvzooSecret}`;
    
    const calculatedHash = await sha1(verificationString);
    const calculatedCverify = calculatedHash.toUpperCase().substring(0, 8);
    
    if (calculatedCverify !== cverify) {
      console.error('cverify mismatch. Potential fraudulent request.');
      return new Response('INVALID CVERIFY', { status: 400 });
    }
    
    console.log('cverify validation successful.');

    // --- Business Logic ---
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { status, customer_email: email, product_id, customer_first_name, customer_last_name } = postData;
    const fullName = `${customer_first_name} ${customer_last_name}`;

    // For SALE, handle user creation and plan update
    if (transaction_type === 'SALE' && status === 'COMPLETED') {
      // Check if user exists
      const { data: existingUser, error: findError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
        console.error('Error finding user:', findError);
        return new Response('Error finding user', { status: 500 });
      }

      let userId = existingUser?.id;

      // If user does not exist, create them
      if (!userId) {
        console.log(`User with email ${email} not found. Creating new user.`);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          email_confirm: true, // User will need to confirm email, but we send a magic link
          user_metadata: {
            full_name: fullName,
          }
        });

        if (createError) {
          console.error('Error creating user:', createError);
          return new Response('Error creating user', { status: 500 });
        }
        
        userId = newUser.user.id;
        console.log(`Successfully created new user with ID: ${userId}`);

        // Send a magic link for the new user to log in
        const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
        });

        if (magicLinkError) {
          console.error('Error generating magic link for new user:', magicLinkError);
          // Non-fatal, continue to grant plan
        } else {
            console.log(`Magic link sent to new user ${email}.`);
        }
      } else {
        console.log(`User with email ${email} already exists with ID: ${userId}`);
      }

      // Now that user is guaranteed to exist, grant the plan
      const { error: rpcError } = await supabaseAdmin.rpc('handle_jvzoo_sale', {
          p_email: email,
          p_product_id: product_id.toString()
      });

      if (rpcError) {
          console.error('Error in handle_jvzoo_sale RPC:', rpcError);
          return new Response('Error granting plan', { status: 500 });
      }
      console.log('Successfully called handle_jvzoo_sale.');
    
    // For RFND or CGBK, simply log and ignore as the product is non-refundable
    } else if (transaction_type === 'RFND' || transaction_type === 'CGBK') {
        console.log(`Received ${transaction_type} for product ${product_id} for user ${email}. Product is non-refundable, so logging and ignoring.`);
    } else {
        console.log(`Received unhandled transaction_type: ${transaction_type} with status: ${status}. Logging and ignoring.`);
    }

    return new Response('IPN Processed', { status: 200 });

  } catch (error) {
    console.error('Critical Error processing JVZoo IPN:', error.message);
    return new Response('Error processing IPN', { status: 500 });
  }
});