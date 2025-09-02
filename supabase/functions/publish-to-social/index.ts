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
    const { network, text, mediaUrl, mediaType } = await req.json();
    if (!network || !text) {
      throw new Error("network and text are required.");
    }

    const userResponse = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    ).auth.getUser();

    const user = userResponse.data.user;
    if (!user) {
      throw new Error("Authentication error: User not found.");
    }

    console.log(`User ${user.id} is attempting to publish to ${network}.`);

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("social_connections")
      .select("access_token, provider_user_id")
      .eq("user_id", user.id)
      .eq("provider", network)
      .single();

    if (connectionError || !connection) {
      console.error("Connection Error:", connectionError);
      throw new Error("Social media connection not found for this user.");
    }

    const { access_token, provider_user_id } = connection;

    const { data: remainingPulses, error: rpcError } = await supabaseAdmin.rpc(
      "charge_for_publication",
      { p_user_id: user.id }
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError.message);
      if (rpcError.message.includes("INSUFFICIENT_PULSES")) {
        throw new Error("Você não tem pulsos suficientes para publicar.");
      }
      throw new Error("Failed to charge pulse for publishing.");
    }
    console.log(
      `Successfully charged 1 pulse. Remaining pulses: ${remainingPulses}`
    );

    let newPostId;

    if (network === "linkedin") {
      const linkedinApiUrl = "https://api.linkedin.com/rest/posts";
      const linkedinApiBody = {
        author: `urn:li:person:${provider_user_id}`,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      const linkedinResponse = await fetch(linkedinApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
          "LinkedIn-Version": "202508",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(linkedinApiBody),
      });

      if (!linkedinResponse.ok) {
        const errorBody = await linkedinResponse.json();
        console.error(
          "LinkedIn API Error:",
          JSON.stringify(errorBody, null, 2)
        );
        throw new Error(
          `Failed to publish to LinkedIn. Status: ${linkedinResponse.status}`
        );
      }
      newPostId = linkedinResponse.headers.get("x-restli-id");
      console.log(
        `Successfully published to LinkedIn. New Post ID: ${newPostId}`
      );
    } else if (network === "twitter") {
      const twitterApiUrl = "https://api.twitter.com/2/tweets";
      const twitterApiBody = {
        text: text,
      };

      const twitterResponse = await fetch(twitterApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(twitterApiBody),
      });

      if (!twitterResponse.ok) {
        const errorBody = await twitterResponse.json();
        console.error(
          "Twitter API Error:",
          JSON.stringify(errorBody, null, 2)
        );
        throw new Error(
          `Failed to publish to Twitter. Status: ${twitterResponse.status}`
        );
      }
      const responseData = await twitterResponse.json();
      newPostId = responseData.data.id;
      console.log(
        `Successfully published to Twitter. New Tweet ID: ${newPostId}`
      );
    } else if (network === "instagram") {
      const siteUrl = Deno.env.get("SITE_URL");
      if (!siteUrl) {
        console.error("CRITICAL: SITE_URL environment variable is not set.");
        throw new Error("Configuration error: The site URL is not set.");
      }
      
      const createContainerUrl = `https://graph.instagram.com/${provider_user_id}/media`;
      const params = {
        caption: text,
        access_token: access_token,
      };

      if (mediaType === 'VIDEO') {
        if (!mediaUrl) throw new Error("Video URL is required for video posts.");
        params.media_type = 'REELS';
        params.video_url = mediaUrl;
      } else {
        // Default to image, using placeholder if no mediaUrl is provided
        params.image_url = mediaUrl || `${siteUrl}/PostPulsar.png`;
      }

      const createContainerParams = new URLSearchParams(params);

      const createContainerResponse = await fetch(createContainerUrl, {
        method: "POST",
        body: createContainerParams,
      });

      if (!createContainerResponse.ok) {
        const errorBody = await createContainerResponse.json();
        console.error(
          "Instagram API Error (Create Container):",
          JSON.stringify(errorBody, null, 2)
        );
        throw new Error(
          `Failed to create Instagram media container. Status: ${createContainerResponse.status}`
        );
      }

      const containerData = await createContainerResponse.json();
      const creationId = containerData.id;
      console.log(
        `Successfully created Instagram container. Creation ID: ${creationId}`
      );

      // --- Polling Logic for Video ---
      if (mediaType === 'VIDEO') {
        const maxRetries = 12; // 12 retries * 10 seconds = 120 seconds (2 minutes)
        const retryDelay = 10000; // 10 seconds
        let isReady = false;

        for (let i = 0; i < maxRetries; i++) {
          console.log(`Polling attempt ${i + 1}/${maxRetries}...`);
          const statusUrl = `https://graph.instagram.com/${creationId}?fields=status_code&access_token=${access_token}`;
          const statusResponse = await fetch(statusUrl);
          const statusData = await statusResponse.json();

          console.log(`Container status: ${statusData.status_code}`);

          if (statusData.status_code === 'FINISHED') {
            isReady = true;
            break;
          } else if (statusData.status_code === 'ERROR') {
            throw new Error("Video processing failed on Instagram's side.");
          }
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        if (!isReady) {
          throw new Error("Video processing timed out after 2 minutes.");
        }
      }
      // --- End Polling Logic ---


      // Use graph.instagram.com for the publishing step as well
      const publishUrl = `https://graph.instagram.com/${provider_user_id}/media_publish`;
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: access_token,
      });

      const publishResponse = await fetch(publishUrl, {
        method: "POST",
        body: publishParams,
      });

      if (!publishResponse.ok) {
        const errorBody = await publishResponse.json();
        console.error(
          "Instagram API Error (Publish):",
          JSON.stringify(errorBody, null, 2)
        );
        throw new Error(
          `Failed to publish to Instagram. Status: ${publishResponse.status}`
        );
      }

      const publishData = await publishResponse.json();
      newPostId = publishData.id;
      console.log(
        `Successfully published to Instagram. New Post ID: ${newPostId}`
      );
    } else {
      throw new Error(`Unsupported network: ${network}`);
    }

    return new Response(
      JSON.stringify({
        message: `Successfully published to ${network}!`,
        remainingPulses: remainingPulses,
        postId: newPostId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in publish-to-social:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
