import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

console.log("Publish-to-social function initialized.");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // The frontend now sends the final text content directly.
    const { network, text } = await req.json();
    if (!network || !text) {
      throw new Error("network and text are required.");
    }

    // Step 1: Get the authenticated user's ID from the request header.
    const userResponse = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    ).auth.getUser();

    const user = userResponse.data.user;
    if (!user) {
      throw new Error("Authentication error: User not found.");
    }

    console.log(`User ${user.id} is attempting to publish to ${network}.`);

    // Step 2: Fetch the social connection details.
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('social_connections')
      .select('access_token, provider_user_id')
      .eq('user_id', user.id)
      .eq('provider', network)
      .single();

    if (connectionError || !connection) {
      console.error("Connection Error:", connectionError);
      throw new Error("Social media connection not found for this user.");
    }

    const { access_token, provider_user_id } = connection;

    // Step 3: Charge one pulse for the publication. This is an atomic operation.
    const { data: remainingPulses, error: rpcError } = await supabaseAdmin.rpc(
      'charge_for_publication',
      { p_user_id: user.id }
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError.message);
      if (rpcError.message.includes('INSUFFICIENT_PULSES')) {
        throw new Error("Você não tem pulsos suficientes para publicar.");
      }
      throw new Error("Failed to charge pulse for publishing.");
    }
    console.log(`Successfully charged 1 pulse. Remaining pulses: ${remainingPulses}`);

    // Step 4: Call the appropriate social media API based on the network.
    let newPostId;

    if (network === 'linkedin') {
      const linkedinApiUrl = 'https://api.linkedin.com/rest/posts';
      const linkedinApiBody = {
        author: `urn:li:person:${provider_user_id}`,
        commentary: text, // Use the text directly from the request
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      const linkedinResponse = await fetch(linkedinApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
          'LinkedIn-Version': '202508',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(linkedinApiBody),
      });

      if (!linkedinResponse.ok) {
        const errorBody = await linkedinResponse.json();
        console.error("LinkedIn API Error:", JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to publish to LinkedIn. Status: ${linkedinResponse.status}`);
      }
      newPostId = linkedinResponse.headers.get('x-restli-id');
      console.log(`Successfully published to LinkedIn. New Post ID: ${newPostId}`);

    } else if (network === 'twitter') {
      const twitterApiUrl = 'https://api.twitter.com/2/tweets';
      const twitterApiBody = {
        text: text, // Use the text directly from the request
      };

      const twitterResponse = await fetch(twitterApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
        body: JSON.stringify(twitterApiBody),
      });

      if (!twitterResponse.ok) {
        const errorBody = await twitterResponse.json();
        console.error("Twitter API Error:", JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to publish to Twitter. Status: ${twitterResponse.status}`);
      }
      const responseData = await twitterResponse.json();
      newPostId = responseData.data.id;
      console.log(`Successfully published to Twitter. New Tweet ID: ${newPostId}`);

    } else {
      throw new Error(`Unsupported network: ${network}`);
    }

    // Step 5: Return a real success response.
    return new Response(JSON.stringify({
      message: `Successfully published to ${network}!`,
      remainingPulses: remainingPulses,
      postId: newPostId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in publish-to-social:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});