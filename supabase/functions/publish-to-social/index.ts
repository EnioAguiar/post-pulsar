import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { OAuthClient, HMAC_SHA1, toAuthHeader } from "https://raw.githubusercontent.com/snsinfu/deno-oauth-1.0a/main/mod.ts";

console.log("Publish-to-social function initialized.");

// Note: The generic refreshToken function using OAuth 2.0 is kept for other providers
// but is no longer used by the Twitter OAuth 1.0a flow.
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

  // This part would be completed for other providers
  throw new Error(`Token refresh not implemented for provider: ${provider}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { network, text, mediaUrl, mediaType, pageId } = await req.json(); // Added pageId
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

    const columnsToSelect = network === 'twitter' 
      ? "provider_user_id, oauth_token, oauth_token_secret" 
      : "access_token, provider_user_id";

    // --- MODIFIED LOGIC TO SELECT THE CORRECT FACEBOOK PAGE ---
    let connectionQuery = supabaseAdmin
      .from("social_connections")
      .select(columnsToSelect)
      .eq("user_id", user.id)
      .eq("provider", network);

    if (network === 'facebook') {
      if (!pageId) {
        throw new Error("Facebook Page ID is required for publishing.");
      }
      connectionQuery = connectionQuery.eq("provider_user_id", pageId);
    }

    const { data: connection, error: connectionError }: { data: any; error: any } = await connectionQuery.single();
    // --- END OF MODIFIED LOGIC ---

    if (connectionError || !connection) {
      console.error("Connection Error:", connectionError);
      throw new Error("Social media connection not found for this user.");
    }

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
      const { access_token, provider_user_id } = connection;
      const authorUrn = `urn:li:person:${provider_user_id}`;
      const linkedinApiBody: any = {
        author: authorUrn,
        commentary: text,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED" },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      if (mediaUrl && mediaType === 'VIDEO') {
        console.log("LinkedIn video post detected. Implementing multipart upload flow...");

        const videoFileResponse = await fetch(mediaUrl);
        if (!videoFileResponse.ok) throw new Error(`Failed to fetch video from storage URL: ${mediaUrl}`);
        const videoBlob = await videoFileResponse.blob();
        console.log(`Video fetched. Size: ${videoBlob.size} bytes.`);

        const initializeUploadResponse = await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202508',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn, fileSizeBytes: videoBlob.size } }),
        });

        if (!initializeUploadResponse.ok) {
          const errorBody = await initializeUploadResponse.json();
          console.error("LinkedIn Video API initialization failed:", JSON.stringify(errorBody, null, 2));
          throw new Error(`LinkedIn Video API initialization failed. Status: ${initializeUploadResponse.status}`);
        }
        const initData = await initializeUploadResponse.json();
        const videoUrn = initData.value.video;
        const uploadInstructions = initData.value.uploadInstructions;
        const uploadToken = initData.value.uploadToken;
        console.log(`Video initialization successful. URN: ${videoUrn}. Parts to upload: ${uploadInstructions.length}`);

        const uploadedPartIds: string[] = [];
        for (const instruction of uploadInstructions) {
          console.log(`Uploading part from byte ${instruction.firstByte} to ${instruction.lastByte}`);
          const chunk = videoBlob.slice(instruction.firstByte, instruction.lastByte + 1);
          
          const uploadResponse = await fetch(instruction.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/octet-stream',
              'Authorization': `Bearer ${access_token}`,
              'LinkedIn-Version': '202508'
            },
            body: chunk,
          });

          if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            console.error(`Failed to upload chunk to LinkedIn: ${errorBody}`);
            throw new Error(`Failed to upload video chunk. Status: ${uploadResponse.status}`);
          }
          const etag = uploadResponse.headers.get('etag');
          if (!etag) throw new Error("Etag not found for uploaded chunk.");
          
          console.log(`Successfully uploaded part. ETag: ${etag}`);
          uploadedPartIds.push(etag);
        }

        console.log("All parts uploaded. Finalizing video...");
        const finalizeUploadResponse = await fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202508',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({ finalizeUploadRequest: { video: videoUrn, uploadToken, uploadedPartIds } })
        });

        if (!finalizeUploadResponse.ok) {
            const errorBody = await finalizeUploadResponse.json();
            console.error("LinkedIn Video API finalization failed:", JSON.stringify(errorBody, null, 2));
            throw new Error(`LinkedIn Video API finalization failed. Status: ${finalizeUploadResponse.status}`);
        }
        console.log("Successfully finalized video upload.");

        linkedinApiBody.content = {
          media: {
            id: videoUrn,
            title: "Video posted via PostPulsar"
          }
        };

      } else if (mediaUrl) { // This is the existing image flow
        console.log("LinkedIn post with image detected. Using new Images API flow...");
        
        const initializeUploadResponse = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202508',
          },
          body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }),
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

        const imageResponse = await fetch(mediaUrl);
        if (!imageResponse.ok) throw new Error(`Failed to fetch image from storage URL: ${mediaUrl}`);
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

        linkedinApiBody.content = { media: { id: imageUrn } };
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
      console.log("TWITTER: Processing post...");
      const { oauth_token, oauth_token_secret } = connection;

      const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY");
      const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");

      if (!consumerKey || !consumerSecret || !oauth_token || !oauth_token_secret) {
        throw new Error("Missing Twitter credentials.");
      }

      const client = new OAuthClient({
        consumer: { key: consumerKey, secret: consumerSecret },
        signature: HMAC_SHA1,
      });

      let mediaIdString: string | null = null;

      if (mediaUrl && mediaType) {
        const mediaUploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
        console.log(`TWITTER: Media detected (${mediaType}). Fetching from ${mediaUrl}`);
        const mediaResponse = await fetch(mediaUrl);
        if (!mediaResponse.ok) {
          throw new Error(`Failed to fetch media from storage: ${mediaUrl}`);
        }
        const mediaBlob = await mediaResponse.blob();
        const totalBytes = mediaBlob.size;
        console.log(`TWITTER: Media fetched. Total size: ${totalBytes} bytes.`);

        if (mediaType === 'VIDEO') {
          // --- CHUNKED VIDEO UPLOAD ---
          console.log("TWITTER: Starting chunked video upload process...");

          // 1. INIT
          console.log("TWITTER: Step 1 - INIT");
          const initParams = {
            command: "INIT",
            total_bytes: totalBytes.toString(),
            media_type: mediaBlob.type,
            media_category: "tweet_video",
          };
          const initAuthHeader = toAuthHeader(
            client.sign("POST", mediaUploadUrl, {
              token: { key: oauth_token, secret: oauth_token_secret },
              params: initParams,
            })
          );
          const initResponse = await fetch(mediaUploadUrl, {
            method: "POST",
            headers: {
              "Authorization": initAuthHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(initParams).toString(),
          });

          if (!initResponse.ok) {
            const errorBody = await initResponse.text();
            console.error("TWITTER: INIT command failed:", errorBody);
            throw new Error(`Twitter INIT failed: ${initResponse.status} ${errorBody}`);
          }
          const initData = await initResponse.json();
          const mediaId = initData.media_id_string;
          console.log(`TWITTER: INIT successful. Media ID: ${mediaId}`);

          // 2. APPEND
          console.log("TWITTER: Step 2 - APPEND");
          const chunkSize = 1 * 1024 * 1024; // 1MB chunks
          let bytesSent = 0;
          let segmentIndex = 0;
          while (bytesSent < totalBytes) {
            const chunk = mediaBlob.slice(bytesSent, bytesSent + chunkSize);
            console.log(`TWITTER: Appending chunk ${segmentIndex}. Size: ${chunk.size} bytes.`);
            const appendFormData = new FormData();
            appendFormData.append("command", "APPEND");
            appendFormData.append("media_id", mediaId);
            appendFormData.append("segment_index", segmentIndex.toString());
            appendFormData.append("media", chunk);

            const appendAuthHeader = toAuthHeader(client.sign("POST", mediaUploadUrl, { token: { key: oauth_token, secret: oauth_token_secret } }));
            const appendResponse = await fetch(mediaUploadUrl, {
              method: "POST",
              headers: { "Authorization": appendAuthHeader },
              body: appendFormData,
            });

            if (!appendResponse.ok) {
              const errorBody = await appendResponse.text();
              console.error(`TWITTER: APPEND command failed for segment ${segmentIndex}:`, errorBody);
              throw new Error(`Twitter APPEND failed: ${appendResponse.status} ${errorBody}`);
            }
            console.log(`TWITTER: Chunk ${segmentIndex} uploaded successfully.`);
            bytesSent += chunk.size;
            segmentIndex++;
          }
          console.log("TWITTER: All chunks appended.");

          // 3. FINALIZE
          console.log("TWITTER: Step 3 - FINALIZE");
          const finalizeParams = {
            command: "FINALIZE",
            media_id: mediaId,
          };
          const finalizeAuthHeader = toAuthHeader(
            client.sign("POST", mediaUploadUrl, {
              token: { key: oauth_token, secret: oauth_token_secret },
              params: finalizeParams,
            })
          );
          const finalizeResponse = await fetch(mediaUploadUrl, {
            method: "POST",
            headers: {
              "Authorization": finalizeAuthHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(finalizeParams).toString(),
          });

          if (!finalizeResponse.ok) {
            const errorBody = await finalizeResponse.text();
            console.error("TWITTER: FINALIZE command failed:", errorBody);
            throw new Error(`Twitter FINALIZE failed: ${finalizeResponse.status} ${errorBody}`);
          }
          const finalizeData = await finalizeResponse.json();
          console.log("TWITTER: FINALIZE successful.", finalizeData);

          // 4. STATUS
          if (finalizeData.processing_info) {
            console.log(`TWITTER: Step 4 - STATUS polling required. State: ${finalizeData.processing_info.state}`);
            const maxRetries = 10;
            let attempt = 0;
            while (attempt < maxRetries) {
              const checkAfterSecs = finalizeData.processing_info.check_after_secs || 5;
              console.log(`TWITTER: Waiting ${checkAfterSecs} seconds before checking status...`);
              await new Promise(resolve => setTimeout(resolve, checkAfterSecs * 1000));

              const statusParams = { command: "STATUS", media_id: mediaId };
              const statusAuthHeader = toAuthHeader(
                client.sign("GET", mediaUploadUrl, {
                  token: { key: oauth_token, secret: oauth_token_secret },
                  params: statusParams,
                })
              );
              const statusResponse = await fetch(`${mediaUploadUrl}?${new URLSearchParams(statusParams).toString()}`, {
                headers: { "Authorization": statusAuthHeader },
              });
              
              if (!statusResponse.ok) {
                const errorBody = await statusResponse.text();
                console.error("TWITTER: STATUS command failed:", errorBody);
                throw new Error(`Twitter STATUS check failed: ${statusResponse.status}`);
              }
              const statusData = await statusResponse.json();

              const state = statusData.processing_info.state;
              console.log(`TWITTER: Current processing state: ${state}`);
              if (state === 'succeeded') {
                console.log("TWITTER: Video processing succeeded.");
                mediaIdString = mediaId;
                break;
              }
              if (state === 'failed') {
                console.error("TWITTER: Video processing failed.", statusData.processing_info.error);
                throw new Error(`Twitter video processing failed: ${statusData.processing_info.error.message}`);
              }
              attempt++;
            }
            if (!mediaIdString) {
              throw new Error("Twitter video processing timed out.");
            }
          } else {
            console.log("TWITTER: No processing required. Media is ready.");
            mediaIdString = mediaId;
          }
        } else {
          // --- SIMPLE IMAGE UPLOAD ---
          console.log("TWITTER: Starting simple image upload...");
          const formData = new FormData();
          formData.append("media", mediaBlob);
          const uploadAuthHeader = toAuthHeader(client.sign("POST", mediaUploadUrl, { token: { key: oauth_token, secret: oauth_token_secret } }));
          const mediaUploadResponse = await fetch(mediaUploadUrl, {
            method: "POST",
            headers: { "Authorization": uploadAuthHeader },
            body: formData,
          });

          if (!mediaUploadResponse.ok) {
            const errorBody = await mediaUploadResponse.text();
            console.error("TWITTER: Simple media upload error:", errorBody);
            throw new Error(`Failed to upload media to Twitter. Status: ${mediaUploadResponse.status}`);
          }
          const mediaData = await mediaUploadResponse.json();
          mediaIdString = mediaData.media_id_string;
          console.log(`TWITTER: Successfully uploaded media. Media ID: ${mediaIdString}`);
        }
      }

      // --- CREATE TWEET ---
      console.log("TWITTER: Creating tweet...");
      const tweetApiUrl = "https://api.twitter.com/2/tweets";
      const requestBody: any = { text };

      if (mediaIdString) {
        requestBody.media = { media_ids: [mediaIdString] };
        console.log(`TWITTER: Attaching media ID ${mediaIdString} to tweet.`);
      }

      const tweetAuthHeader = toAuthHeader(client.sign("POST", tweetApiUrl, { token: { key: oauth_token, secret: oauth_token_secret } }));
      const twitterResponse = await fetch(tweetApiUrl, {
        method: "POST",
        headers: {
          "Authorization": tweetAuthHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!twitterResponse.ok) {
        const errorBody = await twitterResponse.json();
        console.error("TWITTER: Create Tweet API Error:", JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to publish to Twitter. Status: ${twitterResponse.status}`);
      }

      const responseData = await twitterResponse.json();
      newPostId = responseData.data.id;
      console.log(`TWITTER: Successfully published tweet. New Tweet ID: ${newPostId}`);

    } else if (network === "instagram") {
      const { access_token, provider_user_id } = connection;
      const siteUrl = Deno.env.get("SITE_URL");
      if (!siteUrl) {
        console.error("CRITICAL: SITE_URL environment variable is not set.");
        throw new Error("Configuration error: The site URL is not set.");
      }
      
      const createContainerUrl = `https://graph.instagram.com/${provider_user_id}/media`;
      const params: any = { caption: text, access_token: access_token };

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
      const { access_token, provider_user_id } = connection;
      const createContainerUrl = `https://graph.threads.net/v1.0/${provider_user_id}/threads`;
      const params: any = { text: text, access_token: access_token };

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

    } else if (network === "facebook") {
      console.log("Processing Facebook post...");
      const { access_token: pageAccessToken, provider_user_id: pageIdFromConn } = connection;

      if (mediaUrl && mediaType === 'VIDEO') {
        // Publishing a video
        console.log("Facebook video post detected.");
        const apiUrl = `https://graph.facebook.com/v20.0/${pageIdFromConn}/videos`;
        const params = new URLSearchParams({
          file_url: mediaUrl,
          description: text,
          access_token: pageAccessToken,
        });

        const response = await fetch(apiUrl, {
          method: "POST",
          body: params,
        });

        if (!response.ok) {
          const errorBody = await response.json();
          console.error("Facebook API Error (Create Video Post):", JSON.stringify(errorBody, null, 2));
          throw new Error(`Failed to publish video to Facebook. Status: ${response.status}`);
        }

        const responseData = await response.json();
        newPostId = responseData.id; // Video posts return an ID for the video object
        console.log(`Successfully published video to Facebook. New Video ID: ${newPostId}`);

      } else if (mediaUrl) {
        // Publishing a photo with a caption
        console.log("Facebook photo post detected.");
        const apiUrl = `https://graph.facebook.com/v20.0/${pageIdFromConn}/photos`;
        const params = new URLSearchParams({
          url: mediaUrl,
          caption: text,
          access_token: pageAccessToken,
        });

        const response = await fetch(apiUrl, {
          method: "POST",
          body: params,
        });

        if (!response.ok) {
          const errorBody = await response.json();
          console.error("Facebook API Error (Create Photo Post):", JSON.stringify(errorBody, null, 2));
          throw new Error(`Failed to publish photo to Facebook. Status: ${response.status}`);
        }

        const responseData = await response.json();
        newPostId = responseData.post_id;
        console.log(`Successfully published photo to Facebook. New Post ID: ${newPostId}`);

      } else {
        // Publishing a text-only post
        console.log("Facebook text-only post.");
        const apiUrl = `https://graph.facebook.com/v20.0/${pageIdFromConn}/feed`;
        const params = new URLSearchParams({
          message: text,
          access_token: pageAccessToken,
        });

        const response = await fetch(apiUrl, {
          method: "POST",
          body: params,
        });

        if (!response.ok) {
          const errorBody = await response.json();
          console.error("Facebook API Error (Create Text Post):", JSON.stringify(errorBody, null, 2));
          throw new Error(`Failed to publish text to Facebook. Status: ${response.status}`);
        }

        const responseData = await response.json();
        newPostId = responseData.id;
        console.log(`Successfully published text post to Facebook. New Post ID: ${newPostId}`);
      }
      
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