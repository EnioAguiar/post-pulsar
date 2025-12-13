// supabase/functions/refresh-post-analytics/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

// Import all analytics services
import { getInstagramPostAnalytics } from "../publish-to-social/services/instagramAnalyticsService.ts";
import { getThreadsPostAnalytics } from "../publish-to-social/services/threadsAnalyticsService.ts";
import { getFacebookPostAnalytics } from "../publish-to-social/services/facebookAnalyticsService.ts";

console.log("Function refresh-post-analytics initialized.");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { postId, provider } = await req.json(); // Expect postId and provider
    if (!postId || !provider) {
      throw new Error("postId and provider are required.");
    }
    console.log(
      `Received request to refresh analytics for post: ${postId}, provider: ${provider}`,
    );

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
    console.log(`User ${user.id} initiated the refresh.`);

    // 1. Fetch the post from our database to get the provider_post_ids and publication_targets object
    const { data: postData, error: postError } = await supabaseAdmin
      .from("generated_posts")
      .select("provider_post_ids, publication_targets") // Add publication_targets
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (postError || !postData) {
      console.error("Error fetching post data:", postError);
      throw new Error(
        "Post not found or you do not have permission to access it.",
      );
    }

    const provider_post_ids = postData.provider_post_ids;
    if (!provider_post_ids || typeof provider_post_ids !== "object") {
      throw new Error("Post has no published provider IDs.");
    }

    const provider_post_id = provider_post_ids[provider];
    if (!provider_post_id) {
      throw new Error(
        `Post was not published to ${provider}, cannot refresh analytics.`,
      );
    }

    // 2. Fetch the corresponding social connection to get the access token
    let connectionQuery = supabaseAdmin
      .from("social_connections")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", provider);

    // If provider is Facebook, we need to filter by the specific page ID
    if (provider === "facebook") {
      const publicationTargets = postData.publication_targets;
      console.log(
        "[DEBUG] Fetched publication_targets:",
        JSON.stringify(publicationTargets),
      );

      if (
        !publicationTargets ||
        typeof publicationTargets !== "object" ||
        !publicationTargets.facebook
      ) {
        throw new Error(
          "Facebook page ID not found for this post in 'publication_targets'.",
        );
      }
      const facebookPageId = publicationTargets.facebook;

      console.log(`[DEBUG] Querying 'social_connections' with:`);
      console.log(`[DEBUG] - user_id: ${user.id}`);
      console.log(`[DEBUG] - provider: ${provider}`);
      console.log(`[DEBUG] - provider_user_id: ${facebookPageId}`);

      connectionQuery = connectionQuery.eq("provider_user_id", facebookPageId);
    }

    const { data: connection, error: connectionError } =
      await connectionQuery.single();

    if (connectionError || !connection) {
      console.error(
        "Error fetching connection for provider:",
        provider,
        connectionError,
      );
      throw new Error(
        `Connection for ${provider} not found. Ensure a connection for this specific page exists and the data is synchronized.`,
      );
    }

    let analyticsResult;
    let updatedMetrics = {};

    // 3. Call the correct analytics service based on the provider
    console.log(`Routing to analytics service for provider: ${provider}`);
    switch (provider) {
      case "instagram":
        analyticsResult = await getInstagramPostAnalytics(
          supabaseAdmin,
          connection.access_token,
          provider_post_id,
        );
        if (analyticsResult) {
          updatedMetrics = {
            instagram_likes: analyticsResult.likes,
            instagram_comments: analyticsResult.comments,
            instagram_reach: analyticsResult.reach,
          };
        }
        break;
      case "threads":
        analyticsResult = await getThreadsPostAnalytics(
          supabaseAdmin,
          connection.access_token,
          provider_post_id,
        );
        if (analyticsResult) {
          updatedMetrics = {
            threads_likes: analyticsResult.likes,
            threads_replies: analyticsResult.replies,
            threads_reposts: analyticsResult.reposts,
          };
        }
        break;
      case "facebook":
        analyticsResult = await getFacebookPostAnalytics(
          supabaseAdmin,
          connection.access_token,
          provider_post_id,
        );
        if (analyticsResult) {
          updatedMetrics = {
            facebook_likes: analyticsResult.likes,
            facebook_comments: analyticsResult.comments,
            facebook_shares: analyticsResult.shares ?? 0,
          };
        }
        break;
      // Add cases for other providers like 'linkedin', 'twitter' if they have analytics
      default:
        console.log(
          `No analytics service configured for provider: ${provider}`,
        );
        break;
    }

    if (!analyticsResult) {
      throw new Error(`Failed to fetch new analytics data for ${provider}.`);
    }

    console.log(
      "Successfully fetched new analytics:",
      JSON.stringify(analyticsResult, null, 2),
    );

    // 4. Update the generated_posts table with the new metrics
    const { error: updateError } = await supabaseAdmin
      .from("generated_posts")
      .update(updatedMetrics)
      .eq("id", postId);

    if (updateError) {
      console.error("Error updating metrics in DB:", updateError);
      throw new Error("Failed to save the updated metrics.");
    }

    console.log(`Successfully updated metrics for post ${postId}`);

    return new Response(
      JSON.stringify({ status: "success", newMetrics: analyticsResult }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in refresh-post-analytics function:", error.message);
    return new Response(
      JSON.stringify({ status: "error", error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Always return 200 OK
      },
    );
  }
});
