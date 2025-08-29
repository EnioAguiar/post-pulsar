import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Publish-to-social function initialized.");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { postId, network } = await req.json();
    if (!postId || !network) {
      throw new Error("postId and network are required.");
    }

    // Step 1: Create an admin client to interact with protected data.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      throw new Error("Server configuration error: Missing service role key.");
    }
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

    // Step 2: Get the authenticated user's ID from the request header.
    const userResponse = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    ).auth.getUser();

    const user = userResponse.data.user;
    if (!user) {
      throw new Error("Authentication error: User not found.");
    }

    console.log(`User ${user.id} is attempting to publish post ${postId} to ${network}.`);

    // Step 3: Fetch the social connection details and the post content in parallel.
    const [connectionResponse, postResponse] = await Promise.all([
      supabaseAdmin.from('social_connections').select('access_token, provider_user_id').eq('user_id', user.id).eq('provider', network).single(),
      supabaseAdmin.from('generated_posts').select('content').eq('id', postId).single()
    ]);

    if (connectionResponse.error || !connectionResponse.data) {
      console.error("Connection Error:", connectionResponse.error);
      throw new Error("Social media connection not found for this user.");
    }
    if (postResponse.error || !postResponse.data) {
      console.error("Post Error:", postResponse.error);
      throw new Error("Post content not found.");
    }

    const { access_token, provider_user_id } = connectionResponse.data;
    const postContent = postResponse.data.content || "Default content if not found.";

    // Step 4: Charge one pulse for the publication. This is an atomic operation.
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

    // Step 5: Call the LinkedIn API to create the post.
    const linkedinApiUrl = 'https://api.linkedin.com/rest/posts';
    const linkedinApiBody = {
      author: `urn:li:person:${provider_user_id}`,
      commentary: postContent,
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

    const newPostId = linkedinResponse.headers.get('x-restli-id');
    console.log(`Successfully published to LinkedIn. New Post ID: ${newPostId}`);

    // Step 6: Return a real success response.
    return new Response(JSON.stringify({
      message: `Successfully published to ${network}!`,
      remainingPulses: remainingPulses,
      linkedinPostId: newPostId,
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