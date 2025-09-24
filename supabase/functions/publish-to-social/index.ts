import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

// Import service functions
import { publishToLinkedIn } from "./services/linkedinService.ts";
import { publishToFacebook } from "./services/facebookService.ts";
import { publishToTwitter } from "./services/twitterService.ts";
import { publishToMeta } from "./services/metaService.ts";
import { publishToTelegram } from "./services/telegramService.ts";
import { publishToDiscord } from "./services/discordService.ts";

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
      mediaMap, // Changed from mediaUrls and isCarousel
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
    const { data: savedPostId, error: saveError } = await supabaseAdmin.rpc(
      "save_post_to_history",
      {
        p_user_id: user.id,
        p_source_url: sourceUrl,
        p_language: language,
        p_content: fullContent,
        p_media_map: mediaMap, // Changed from p_media_urls
      },
    );

    if (saveError) {
      console.error("Save to History Error:", saveError);
      throw new Error("Failed to save the post to your history.");
    }
    console.log(`Post saved to history with ID: ${savedPostId}`);

    // Step 2: Fetch social connection credentials.
    let columnsToSelect;
    switch (network) {
      case "twitter":
        columnsToSelect = "provider_user_id, oauth_token, oauth_token_secret";
        break;
      case "telegram":
        columnsToSelect = "access_token, refresh_token"; // bot_token, channel_id
        break;
      default:
        columnsToSelect = "access_token, provider_user_id";
        break;
    }

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

    // Step 3: Publish to the actual social network.
    const mediaUrlsForNetwork = mediaMap ? mediaMap[network] || [] : [];
    const isCarousel = mediaUrlsForNetwork.length > 1;

    let publicationResult;
    switch (network) {
      case "linkedin":
        publicationResult = await publishToLinkedIn(connection, text, mediaUrlsForNetwork);
        break;
      case "facebook":
        publicationResult = await publishToFacebook(connection, text, mediaUrlsForNetwork);
        break;
      case "twitter":
        publicationResult = await publishToTwitter(connection, text, mediaUrlsForNetwork);
        break;
      case "instagram":
      case "threads":
        publicationResult = await publishToMeta(
          network,
          connection,
          text,
          mediaUrlsForNetwork,
          isCarousel,
        );
        break;
      case "telegram":
        publicationResult = await publishToTelegram(
          connection,
          text,
          mediaUrlsForNetwork,
        );
        break;
      case "discord":
        publicationResult = await publishToDiscord(
          connection,
          text,
          mediaUrlsForNetwork,
        );
        break;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }

    console.log(
      `Successfully published to ${network}. API Response: ${JSON.stringify(publicationResult)}`,
    );

    // Step 4: Charge pulse ONLY after a successful publication.
    const { data: remainingPulses, error: rpcError } = await supabaseAdmin.rpc(
      "charge_for_publication",
      { p_user_id: user.id },
    );

    if (rpcError) {
      // This is a critical error, as the post is published but the user was not charged.
      // Log this for manual review.
      console.error(
        `CRITICAL: Failed to charge pulse for user ${user.id} after successful publication to ${network}. Error: ${rpcError.message}`
      );
      // Even if charging fails, do not show an error to the user, as their post was successful.
    }

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
