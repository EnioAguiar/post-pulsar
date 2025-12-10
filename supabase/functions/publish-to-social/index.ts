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
import { getInstagramPostAnalytics } from "./services/instagramAnalyticsService.ts";
import { getThreadsPostAnalytics } from "./services/threadsAnalyticsService.ts";
import { getFacebookPostAnalytics } from "./services/facebookAnalyticsService.ts";

console.log("Publish-to-social function initialized.");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body, null, 2)); // DEBUG LOG

    const {
      network,
      text,
      mediaMap, // Changed from mediaUrls and isCarousel
      connectionTargetId, // Renamed from pageId for clarity
      fullContent, // The entire generated content object
      sourceUrl,
      language,
      generatedImageUrl, // New field for the quote image
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
        p_content: fullContent,
        p_generated_image_url: generatedImageUrl, // Pass the new field
        p_language: language,
        p_media_map: mediaMap,
        p_source_url: sourceUrl,
        p_user_id: user.id,
      },
    );

    if (saveError) {
      console.error("Save to History Error:", saveError);
      throw new Error("Failed to save the post to your history.");
    }
    console.log(`Post saved to history with ID: ${savedPostId}`);

    // Step 2: Fetch social connection credentials.
    console.log(`DEBUG: Received connectionTargetId: '${connectionTargetId}'`);

    let columnsToSelect;
    switch (network) {
      case "twitter":
        columnsToSelect = "provider_user_id, oauth_token, oauth_token_secret";
        break;
      case "telegram":
      case "discord":
        columnsToSelect = "access_token, provider_user_id"; // For Discord, access_token is the webhook URL. For Telegram, it's the bot token.
        break;
      default:
        columnsToSelect = "access_token, provider_user_id";
        break;
    }
    console.log(`DEBUG: Columns to select for ${network}: ${columnsToSelect}`);

    let connectionQuery = supabaseAdmin
      .from("social_connections")
      .select(columnsToSelect)
      .eq("user_id", user.id)
      .eq("provider", network)
      .eq("purpose", "publishing"); // Add purpose filter

    // For providers that support multiple destinations, select the specific one.
    if (connectionTargetId) {
      console.log(
        `DEBUG: Applying connectionTargetId filter: '${connectionTargetId}'`,
      );
      connectionQuery = connectionQuery.eq(
        "provider_user_id",
        connectionTargetId,
      );
    } else {
      console.log("DEBUG: No connectionTargetId provided.");
    }

    const { data: connection, error: connectionError } =
      await connectionQuery.single();

    if (connectionError || !connection) {
      console.error(
        "Connection Error Details:",
        JSON.stringify(connectionError, null, 2),
      );
      throw new Error("Social media connection not found for this user.");
    }

    // Step 3: Publish to the actual social network.
    const mediaUrlsForNetwork = mediaMap ? mediaMap[network] || [] : [];
    const isCarousel = mediaUrlsForNetwork.length > 1;

    let publicationResult;
    console.log(`Routing to service for network: ${network}`); // DEBUG LOG

    switch (network) {
      case "linkedin":
        publicationResult = await publishToLinkedIn(
          connection,
          text,
          mediaUrlsForNetwork,
        );
        break;
      case "facebook":
        publicationResult = await publishToFacebook(
          connection,
          text,
          mediaUrlsForNetwork,
        );
        if (publicationResult && publicationResult.postId) {
            const { error: appendProviderError } = await supabaseAdmin.rpc("append_provider_post_id", {
                p_post_id: savedPostId,
                p_provider: network,
                p_provider_post_id: publicationResult.postId
            });

            if (appendProviderError) {
                console.error(`Failed to append provider_post_id for ${network}. Error:`, JSON.stringify(appendProviderError, null, 2));
            }

            if (connectionTargetId) { // Save the page ID for Facebook
                const { error: appendTargetError } = await supabaseAdmin.rpc("append_publication_target", {
                    p_post_id: savedPostId,
                    p_provider: network,
                    p_target_id: connectionTargetId
                });
                if (appendTargetError) {
                    console.error(`Failed to append publication_target for ${network}. Error:`, JSON.stringify(appendTargetError, null, 2));
                }
            }

          // NEW: Fetch and save Facebook analytics
          const fbAnalytics = await getFacebookPostAnalytics(
            supabaseAdmin,
            connection.access_token,
            publicationResult.postId,
          );
          if (fbAnalytics) {
            await supabaseAdmin
              .from("generated_posts")
              .update({
                facebook_likes: fbAnalytics.likes,
                facebook_comments: fbAnalytics.comments,
                facebook_shares: fbAnalytics.shares,
              })
              .eq("id", savedPostId);
          }
        }
        break;
      case "twitter":
        publicationResult = await publishToTwitter(
          connection,
          text,
          mediaUrlsForNetwork,
        );
        if (publicationResult && publicationResult.postId) { // Assuming Twitter also returns postId
            const { error: appendProviderError } = await supabaseAdmin.rpc("append_provider_post_id", {
                p_post_id: savedPostId,
                p_provider: network,
                p_provider_post_id: publicationResult.postId
            });

            if (appendProviderError) {
                console.error(`Failed to append provider_post_id for ${network}. Error:`, JSON.stringify(appendProviderError, null, 2));
            }
        }
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

        console.log(
          `DEBUG: Publication result for ${network}:`,
          JSON.stringify(publicationResult, null, 2),
        );

        if (publicationResult && publicationResult.mediaId) {
            const { error: appendProviderError } = await supabaseAdmin.rpc("append_provider_post_id", {
                p_post_id: savedPostId,
                p_provider: network,
                p_provider_post_id: publicationResult.mediaId
            });

            if (appendProviderError) {
                console.error(`Failed to append provider_post_id for ${network}. Error:`, JSON.stringify(appendProviderError, null, 2));
            }

          console.log(
            `DEBUG: Valid mediaId (${publicationResult.mediaId}) found for ${network}. Proceeding to fetch analytics.`,
          );
          if (network === "instagram") {
            console.log("DEBUG: Calling getInstagramPostAnalytics...");
            const igAnalytics = await getInstagramPostAnalytics(
              supabaseAdmin,
              connection.access_token,
              publicationResult.mediaId,
            );
            console.log(
              "DEBUG: Result from getInstagramPostAnalytics:",
              JSON.stringify(igAnalytics, null, 2),
            );
            if (igAnalytics) {
              console.log(
                "DEBUG: Updating generated_posts table with Instagram analytics.",
              );
              await supabaseAdmin
                .from("generated_posts")
                .update({
                  instagram_likes: igAnalytics.likes,
                  instagram_comments: igAnalytics.comments,
                  instagram_reach: igAnalytics.reach,
                })
                .eq("id", savedPostId);
            }
          } else if (network === "threads") {
            const threadsAnalytics = await getThreadsPostAnalytics(
              supabaseAdmin,
              connection.access_token,
              publicationResult.mediaId,
            );
            if (threadsAnalytics) {
              await supabaseAdmin
                .from("generated_posts")
                .update({
                  threads_likes: threadsAnalytics.likes,
                  threads_replies: threadsAnalytics.replies,
                  threads_reposts: threadsAnalytics.reposts,
                })
                .eq("id", savedPostId);
            }
          }
        } else {
          console.log(
            `DEBUG: No valid mediaId found in publicationResult for ${network}. Skipping analytics.`,
          );
        }
        break;
      case "telegram":
        publicationResult = await publishToTelegram(
          connection,
          text,
          mediaUrlsForNetwork,
        );
        // Telegram doesn't return a "post ID" in the same way, but if it did, save it here.
        // For now, no specific post ID saving for Telegram.
        break;
      case "discord":
        publicationResult = await publishToDiscord(
          connection,
          text,
          mediaUrlsForNetwork,
        );
        // Discord doesn't return a "post ID" in the same way, but if it did, save it here.
        // For now, no specific post ID saving for Discord.
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
        `CRITICAL: Failed to charge pulse for user ${user.id} after successful publication to ${network}. Error: ${rpcError.message}`,
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
