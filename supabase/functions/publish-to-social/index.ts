import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

// Import service functions
import { publishToLinkedIn } from "./services/linkedinService.ts";
import { publishToFacebook } from "./services/facebookService.ts";
import { publishToTwitter } from "./services/twitterService.ts";
import { publishToMeta } from "./services/metaService.ts";

console.log("Publish-to-social function initialized.");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { network, text, mediaUrls, isCarousel, pageId, postId } = body;
    if (!network || !text) {
      throw new Error("network and text are required.");
    }

    const userResponse = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    ).auth.getUser();

    const user = userResponse.data.user;
    if (!user) {
      throw new Error("Authentication error: User not found.");
    }

    console.log(`User ${user.id} is attempting to publish to ${network}.`);

    const columnsToSelect =
      network === "twitter"
        ? "provider_user_id, oauth_token, oauth_token_secret"
        : "access_token, provider_user_id";

    let connectionQuery = supabaseAdmin
      .from("social_connections")
      .select(columnsToSelect)
      .eq("user_id", user.id)
      .eq("provider", network);

    if (network === "facebook" && pageId) {
      connectionQuery = connectionQuery.eq("provider_user_id", pageId);
    }

    const { data: connection, error: connectionError } =
      await connectionQuery.single();

    if (connectionError || !connection) {
      console.error("Connection Error:", connectionError);
      throw new Error("Social media connection not found for this user.");
    }

    const { data: remainingPulses, error: rpcError } = await supabaseAdmin.rpc(
      "charge_for_publication",
      { p_user_id: user.id },
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError.message);
      if (rpcError.message.includes("INSUFFICIENT_PULSES")) {
        throw new Error(
          "You do not have enough pulses to publish. INSUFFICIENT_PULSES",
        );
      }
      throw new Error("Failed to charge pulse for publishing.");
    }

    let newPostId;

    switch (network) {
      case "linkedin":
        newPostId = await publishToLinkedIn(connection, text, mediaUrls);
        break;
      case "facebook":
        newPostId = await publishToFacebook(connection, text, mediaUrls);
        break;
      case "twitter":
        newPostId = await publishToTwitter(connection, text, mediaUrls);
        break;
      case "instagram":
      case "threads":
        newPostId = await publishToMeta(
          network,
          connection,
          text,
          mediaUrls,
          isCarousel,
        );
        break;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }

    console.log(
      `Successfully published to ${network}. New Post ID: ${newPostId}`,
    );

    if (postId && mediaUrls && mediaUrls.length > 0) {
      await supabaseAdmin
        .from("generated_posts")
        .update({ media_urls: mediaUrls })
        .eq("id", postId)
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message: `Successfully published to ${network}!`,
        remainingPulses: remainingPulses,
        postId: newPostId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in publish-to-social:", error.message);
    let responsePayload = {
      status: "error",
      error: error.message,
      errorCode: "UNKNOWN_ERROR",
    };

    if (error.message.includes("INSUFFICIENT_PULSES")) {
      responsePayload.errorCode = "INSUFFICIENT_PULSES";
      responsePayload.error = "You do not have enough pulses to publish.";
    } else if (error.message.includes("Social media connection not found")) {
      responsePayload.errorCode = "CONNECTION_NOT_FOUND";
      responsePayload.error =
        "Your account is not connected to this social network. Please connect it on the connections page.";
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Always return 200 OK
    });
  }
});
