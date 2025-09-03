import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

console.log("Publish-to-social function initialized.");

async function refreshToken(provider: string, userId: string) {
  console.log(`Refreshing token for provider: ${provider}, user: ${userId}`);

  const { data: connection, error: connError } = await supabaseAdmin
    .from("social_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();

  if (connError || !connection || !connection.refresh_token) {
    console.error("No refresh token found for user.", connError);
    throw new Error(`SESSION_EXPIRED: No refresh token for ${provider}.`);
  }

  let newTokens;

  switch (provider) {
    case "twitter": {
      const twitterClientId = Deno.env.get("TWITTER_CLIENT_ID");
      if (!twitterClientId) throw new Error("TWITTER_CLIENT_ID not set.");

      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
          client_id: twitterClientId,
        }),
      });

      if (!response.ok) {
        console.error("Twitter token refresh failed:", await response.text());
        throw new Error(`SESSION_EXPIRED: Token refresh failed for ${provider}.`);
      }
      newTokens = await response.json();
      break;
    }
    // Future cases for other providers can be added here
    default:
      throw new Error(`Token refresh not implemented for provider: ${provider}`);
  }

  const { error: updateError } = await supabaseAdmin
    .from("social_connections")
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token, // Twitter provides a new one
      expires_at: new Date(Date.now() + newTokens.expires_in * 1000),
    })
    .eq("user_id", userId)
    .eq("provider", provider);

  if (updateError) {
    console.error("Failed to update new tokens in DB:", updateError);
    // Not throwing here, as we have a valid token for the current request
  }

  console.log(`Successfully refreshed token for ${provider}`);
  return newTokens.access_token;
}

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
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
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

    let { access_token, provider_user_id } = connection;

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
      const authorUrn = `urn:li:person:${provider_user_id}`;
      const linkedinApiBody: any = {
        author: authorUrn,
        commentary: text,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED" },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      if (mediaUrl) {
        console.log("LinkedIn post with media detected. Using new Images API flow...");
        
        // Step 1: Initialize the upload using the new Images API
        const initializeUploadResponse = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202508',
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: authorUrn,
            },
          }),
        });

        if (!initializeUploadResponse.ok) {
          const errorBody = await initializeUploadResponse.json();
          console.error("LinkedIn Image API initialization failed:", JSON.stringify(errorBody, null, 2));
          throw new Error(`LinkedIn Image API initialization failed. Status: ${initializeUploadResponse.status}`);
        }
        const uploadData = await initializeUploadResponse.json();
        const uploadUrl = uploadData.value.uploadUrl;
        const imageUrn = uploadData.value.image;
        console.log(`Image initialization successful. URN: ${imageUrn}`);

        // Step 2: Upload the image binary to the URL provided by LinkedIn
        const imageResponse = await fetch(mediaUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image from storage URL: ${mediaUrl}`);
        }
        const imageBlob = await imageResponse.blob();

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': imageBlob.type,
          },
          body: imageBlob,
        });

        if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            console.error("Failed to upload image binary to LinkedIn:", errorBody);
            throw new Error(`Failed to upload image binary to LinkedIn. Status: ${uploadResponse.status}`);
        }
        console.log("Successfully uploaded image binary to LinkedIn.");

        // Step 3: Attach the image URN to the post body
        linkedinApiBody.content = {
          media: {
            id: imageUrn
          }
        };
      }

      const linkedinResponse = await fetch("https://api.linkedin.com/rest/posts", {
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
        console.error("LinkedIn API Error (Create Post):", JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to publish to LinkedIn. Status: ${linkedinResponse.status}`);
      }
      newPostId = linkedinResponse.headers.get("x-restli-id");
      console.log(`Successfully published to LinkedIn. New Post ID: ${newPostId}`);

    } else if (network === "twitter") {
      const postTweet = async (token) => {
        const twitterApiUrl = "https://api.twitter.com/2/tweets";
        const twitterApiBody = { text: text };
        return await fetch(twitterApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(twitterApiBody),
        });
      };

      let twitterResponse = await postTweet(access_token);

      if (twitterResponse.status === 401) {
        console.log("Initial Twitter post failed with 401. Attempting token refresh...");
        access_token = await refreshToken("twitter", user.id);
        twitterResponse = await postTweet(access_token);
      }

      if (!twitterResponse.ok) {
        const errorBody = await twitterResponse.json();
        console.error("Twitter API Error:", JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to publish to Twitter. Status: ${twitterResponse.status}`);
      }

      const responseData = await twitterResponse.json();
      newPostId = responseData.data.id;
      console.log(`Successfully published to Twitter. New Tweet ID: ${newPostId}`);

    } else if (network === "instagram") {
      const siteUrl = Deno.env.get("SITE_URL");
      if (!siteUrl) {
        console.error("CRITICAL: SITE_URL environment variable is not set.");
        throw new Error("Configuration error: The site URL is not set.");
      }
      
      const createContainerUrl = `https://graph.instagram.com/${provider_user_id}/media`;
      const params = { caption: text, access_token: access_token };

      if (mediaType === 'VIDEO') {
        if (!mediaUrl) throw new Error("Video URL is required for video posts.");
        params.media_type = 'REELS';
        params.video_url = mediaUrl;
      } else {
        params.image_url = mediaUrl || `${siteUrl}/PostPulsar.png`;
      }

      const createContainerResponse = await fetch(createContainerUrl, {
        method: "POST",
        body: new URLSearchParams(params),
      });

      if (!createContainerResponse.ok) {
        const errorBody = await createContainerResponse.json();
        console.error("Instagram API Error (Create Container):", JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to create Instagram media container. Status: ${createContainerResponse.status}`);
      }

      const containerData = await createContainerResponse.json();
      const creationId = containerData.id;
      console.log(`Successfully created Instagram container. Creation ID: ${creationId}`);

      if (mediaType === 'VIDEO') {
        const maxRetries = 12;
        const retryDelay = 10000;
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

      const publishUrl = `https://graph.instagram.com/${provider_user_id}/media_publish`;
      const publishParams = new URLSearchParams({ creation_id: creationId, access_token: access_token });

      const publishResponse = await fetch(publishUrl, { method: "POST", body: publishParams });

      if (!publishResponse.ok) {
        const errorBody = await publishResponse.json();
        console.error("Instagram API Error (Publish):", JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to publish to Instagram. Status: ${publishResponse.status}`);
      }

      const publishData = await publishResponse.json();
      newPostId = publishData.id;
      console.log(`Successfully published to Instagram. New Post ID: ${newPostId}`);

    } else if (network === "threads") {
      const createContainerUrl = `https://graph.threads.net/v1.0/${provider_user_id}/threads`;
      const params = { text: text, access_token: access_token };

      if (mediaUrl) {
        params.media_type = 'IMAGE';
        params.image_url = mediaUrl;
      } else {
        params.media_type = 'TEXT';
      }

      const createContainerResponse = await fetch(createContainerUrl, {
        method: "POST",
        body: new URLSearchParams(params),
      });

      if (!createContainerResponse.ok) {
        const errorBody = await createContainerResponse.json();
        console.error("Threads API Error (Create Container):", JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to create Threads media container. Status: ${createContainerResponse.status}`);
      }

      const containerData = await createContainerResponse.json();
      const creationId = containerData.id;
      console.log(`Successfully created Threads container. Creation ID: ${creationId}`);

      const publishUrl = `https://graph.threads.net/v1.0/${provider_user_id}/threads_publish`;
      const publishParams = new URLSearchParams({ creation_id: creationId, access_token: access_token });

      const publishResponse = await fetch(publishUrl, { method: "POST", body: publishParams });

      if (!publishResponse.ok) {
        const errorBody = await publishResponse.json();
        console.error("Threads API Error (Publish):", JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to publish to Threads. Status: ${publishResponse.status}`);
      }

      const publishData = await publishResponse.json();
      newPostId = publishData.id;
      console.log(`Successfully published to Threads. New Post ID: ${newPostId}`);

    } else {
      throw new Error(`Unsupported network: ${network}`);
    }

    return new Response(
      JSON.stringify({ message: `Successfully published to ${network}!`, remainingPulses: remainingPulses, postId: newPostId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in publish-to-social:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});