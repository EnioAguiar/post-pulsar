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

    // 1. Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User not found.");
    }

    // 2. Charge 1 pulse for publishing via RPC
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      throw new Error("Server configuration error.");
    }
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

    console.log(`User ${user.id} is attempting to publish post ${postId} to ${network}.`);

    const { data: remainingPulses, error: rpcError } = await supabaseAdmin.rpc(
      'charge_for_publication',
      { p_user_id: user.id }
    );

    if (rpcError) {
      // The RPC function raises an exception, which is caught here.
      console.error("RPC Error:", rpcError.message);
      // Check for our custom error code
      if (rpcError.message.includes('INSUFFICIENT_PULSES')) {
        throw new Error("Você não tem pulsos suficientes para publicar.");
      }
      throw new Error("Failed to charge pulse for publishing.");
    }

    console.log(`Successfully charged 1 pulse for publishing. Remaining pulses: ${remainingPulses}`);

    // 3. TODO: Fetch post content from generated_posts table
    // const { data: post, error: postError } = await supabaseAdmin
    //   .from('generated_posts')
    //   .select('content')
    //   .eq('id', postId)
    //   .single();
    // if (postError || !post) { throw new Error('Post not found.'); }

    // 4. TODO: Fetch user's social media credentials (encrypted)
    // This will depend on how you store them.
    // const apiToken = await fetchApiTokenFor(user.id, network);

    // 5. TODO: Call the actual social media API
    console.log(`// MOCK: Publishing post ${postId} to ${network}...`);
    // await postToSocialMedia(network, apiToken, post.content);
    console.log(`// MOCK: Successfully published.`);


    // 6. Return success response
    return new Response(JSON.stringify({
      message: `Successfully published to ${network}! (This is a mock response)`,
      remainingPulses: remainingPulses,
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