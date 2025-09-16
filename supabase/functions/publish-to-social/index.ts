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
    const {
      network,
      text,
      mediaUrls,
      isCarousel,
      pageId,
      fullContent, // The entire generated content object
      sourceUrl,
      language,
    } = body;

    if (!network || !text || !fullContent || !sourceUrl || !language) {
      throw new Error(
        "network, text, fullContent, sourceUrl, and language are required.",
      );
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

    // Step 1: Save the post to history FIRST.
    // This makes the action idempotent and ensures history is a record of publish *attempts*.
    const { data: savedPostId, error: saveError } = await supabaseAdmin.rpc(
      "save_post_to_history",
      {
        p_user_id: user.id,
        p_source_url: sourceUrl,
        p_language: language,
        p_content: fullContent,
        p_media_urls: mediaUrls,
      },
    );

    if (saveError) {
      console.error("Save to History Error:", saveError);
      throw new Error("Failed to save the post to your history.");
    }
    console.log(`Post saved to history with ID: ${savedPostId}`);

    // Step 2: Charge pulse for the publication action.
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

    // Step 3: Fetch social connection credentials.
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

    // Step 4: Publish to the actual social network.
    let publicationResult;
    switch (network) {
      case "linkedin":
        publicationResult = await publishToLinkedIn(connection, text, mediaUrls);
        break;
      case "facebook":
        publicationResult = await publishToFacebook(connection, text, mediaUrls);
        break;
      case "twitter":
        publicationResult = await publishToTwitter(connection, text, mediaUrls);
        break;
      case "instagram":
      case "threads":
        publicationResult = await publishToMeta(
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
      `Successfully published to ${network}. API Response: ${JSON.stringify(publicationResult)}`,
    );

    return new Response(
      JSON.stringify({
        status: "success",
        message: `Successfully published to ${network}!`,
        remainingPulses: remainingPulses,
        postId: savedPostId, // Return the ID from our database
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
