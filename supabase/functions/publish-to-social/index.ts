import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { OAuthClient, HMAC_SHA1, toAuthHeader } from "https://raw.githubusercontent.com/snsinfu/deno-oauth-1.0a/main/mod.ts";

console.log("Publish-to-social function initialized.");

async function createSingleMediaContainer(network: 'instagram' | 'threads', provider_user_id: string, access_token: string, mediaUrl: string, isVideo: boolean): Promise<string> {
    console.log(`Creating container for ${network}. Is video: ${isVideo}. URL: ${mediaUrl}`);
    const siteUrl = Deno.env.get("SITE_URL");
    if (!siteUrl) throw new Error("Configuration error: SITE_URL is not set.");

    const isInstagram = network === 'instagram';
    const graphUrl = isInstagram ? `https://graph.instagram.com/v19.0/${provider_user_id}/media` : `https://graph.threads.net/v1.0/${provider_user_id}/threads`;
    
    const params: any = { access_token };

    if (isInstagram) {
        if (isVideo) {
            params.media_type = 'REELS';
            params.video_url = mediaUrl;
        } else {
            params.image_url = mediaUrl;
        }
    } else { // Threads
        if (isVideo) {
            params.media_type = 'REELS';
            params.video_url = mediaUrl;
        } else {
            params.media_type = 'IMAGE';
            params.image_url = mediaUrl;
        }
    }

    const createContainerResponse = await fetch(graphUrl, {
        method: "POST",
        body: new URLSearchParams(params),
    });

    if (!createContainerResponse.ok) {
        const errorBody = await createContainerResponse.json();
        console.error(`${network} API Error (Create Single Container):`, JSON.stringify(errorBody, null, 2));
        throw new Error(`Failed to create ${network} media container. Status: ${createContainerResponse.status}`);
    }

    const containerData = await createContainerResponse.json();
    const creationId = containerData.id;
    console.log(`Successfully created ${network} single container. Creation ID: ${creationId}`);

    if (isVideo) {
        console.log(`Polling status for video container ${creationId}...`);
        const maxRetries = 12;
        const retryDelay = 10000;
        let isReady = false;
        for (let i = 0; i < maxRetries; i++) {
            console.log(`Polling attempt ${i + 1}/${maxRetries} for container ${creationId}...`);
            const statusCheckUrl = isInstagram ? `https://graph.instagram.com/v19.0/${creationId}?fields=status_code&access_token=${access_token}` : `https://graph.threads.net/v1.0/${creationId}?fields=status&access_token=${access_token}`;
            const statusResponse = await fetch(statusCheckUrl);
            const statusData = await statusResponse.json();
            const statusCode = isInstagram ? statusData.status_code : statusData.status;
            
            console.log(`Container ${creationId} status: ${statusCode}`);
            if (statusCode === 'FINISHED') {
                isReady = true;
                break;
            } else if (statusCode === 'ERROR' || statusCode === 'FAILED') {
                throw new Error(`Video processing failed on ${network}'s side.`);
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        if (!isReady) {
            throw new Error(`Video processing timed out for container ${creationId}.`);
        }
        console.log(`Video container ${creationId} is ready.`);
    }

    return creationId;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { network, text, mediaUrls, isCarousel, pageId } = await req.json();
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

    console.log(`User ${user.id} is attempting to publish to ${network}. Carousel: ${isCarousel}`);

    const columnsToSelect = network === 'twitter' 
      ? "provider_user_id, oauth_token, oauth_token_secret" 
      : "access_token, provider_user_id";

    let connectionQuery = supabaseAdmin
      .from("social_connections")
      .select(columnsToSelect)
      .eq("user_id", user.id)
      .eq("provider", network);

    if (network === 'facebook') {
      if (!pageId) throw new Error("Facebook Page ID is required for publishing.");
      connectionQuery = connectionQuery.eq("provider_user_id", pageId);
    }

    const { data: connection, error: connectionError }: { data: any; error: any } = await connectionQuery.single();

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
    console.log(`Successfully charged 1 pulse. Remaining pulses: ${remainingPulses}`);

    let newPostId;

    if (isCarousel && (network === 'instagram' || network === 'threads')) {
        console.log(`Starting carousel post for ${network}.`);
        if (!mediaUrls || mediaUrls.length < 2) {
            throw new Error("Carousel post requires at least two media URLs.");
        }

        const { access_token, provider_user_id } = connection;
        const childrenIds: string[] = [];

        for (const url of mediaUrls) {
            const isVideo = url.includes('.mp4') || url.includes('.mov');
            const containerId = await createSingleMediaContainer(network, provider_user_id, access_token, url, isVideo);
            childrenIds.push(containerId);
        }

        // Add a small delay to allow media containers to be ready on Meta's side.
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log(`All child containers created: ${childrenIds.join(', ')}. Creating carousel container...`);

        const carouselGraphUrl = network === 'instagram' ? `https://graph.instagram.com/v19.0/${provider_user_id}/media` : `https://graph.threads.net/v1.0/${provider_user_id}/threads`;
        const carouselParams: any = {
            media_type: 'CAROUSEL',
            children: childrenIds.join(','),
            caption: text,
            access_token: access_token,
        };
        if (network === 'threads') {
            carouselParams.text = text;
            delete carouselParams.caption;
        }

        const createCarouselContainerResponse = await fetch(carouselGraphUrl, {
            method: "POST",
            body: new URLSearchParams(carouselParams),
        });

        if (!createCarouselContainerResponse.ok) {
            const errorBody = await createCarouselContainerResponse.json();
            console.error(`${network} API Error (Create Carousel Container):`, JSON.stringify(errorBody, null, 2));
            throw new Error(`Failed to create ${network} carousel container. Status: ${createCarouselContainerResponse.status}`);
        }

        const carouselContainerData = await createCarouselContainerResponse.json();
        const carouselCreationId = carouselContainerData.id;
        console.log(`Successfully created ${network} carousel container. Creation ID: ${carouselCreationId}`);

        console.log(`Polling status for carousel container ${carouselCreationId}...`);
        const maxRetries = 12;
        const retryDelay = 5000;
        let isCarouselReady = false;
        for (let i = 0; i < maxRetries; i++) {
            console.log(`Polling attempt ${i + 1}/${maxRetries} for carousel container ${carouselCreationId}...`);
            const isInstagram = network === 'instagram';
            const statusCheckUrl = isInstagram 
                ? `https://graph.instagram.com/v19.0/${carouselCreationId}?fields=status_code&access_token=${access_token}`
                : `https://graph.threads.net/v1.0/${carouselCreationId}?fields=status&access_token=${access_token}`;
            const statusResponse = await fetch(statusCheckUrl);
            const statusData = await statusResponse.json();
            const statusCode = isInstagram ? statusData.status_code : statusData.status;
            
            console.log(`Carousel container ${carouselCreationId} status: ${statusCode}`);
            if (statusCode === 'FINISHED') {
                isCarouselReady = true;
                break;
            } else if (statusCode === 'ERROR' || statusCode === 'FAILED') {
                throw new Error(`Carousel container processing failed on ${network}'s side.`);
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        if (!isCarouselReady) {
            throw new Error(`Carousel container processing timed out for ${carouselCreationId}.`);
        }
        console.log(`Carousel container ${carouselCreationId} is ready for publishing.`);

        const publishUrl = network === 'instagram' ? `https://graph.instagram.com/v19.0/${provider_user_id}/media_publish` : `https://graph.threads.net/v1.0/${provider_user_id}/threads_publish`;
        const publishParams = new URLSearchParams({ creation_id: carouselCreationId, access_token: access_token });

        try {
            const publishResponse = await fetch(publishUrl, { method: "POST", body: publishParams });
            if (!publishResponse.ok) {
                const errorBody = await publishResponse.json();
                // Check for the specific transient error from Meta
                if (errorBody.error && errorBody.error.code === 2 && errorBody.error.is_transient) {
                    console.warn("Caught transient error from Meta API (code 2). Assuming success as post may have gone through.");
                    newPostId = `transient-success-${carouselCreationId}`;
                } else {
                    throw new Error(JSON.stringify(errorBody));
                }
            } else {
                const publishData = await publishResponse.json();
                newPostId = publishData.id;
            }
        } catch (e) {
            console.error(`${network} API Error (Publish Carousel):`, e.message);
            throw new Error(`Failed to publish carousel to ${network}.`);
        }

        console.log(`Successfully published carousel to ${network}. New Post ID: ${newPostId}`);

    } else if (network === "instagram" || network === "threads") {
        const { access_token, provider_user_id } = connection;
        const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;
        if (!mediaUrl) {
            if (network === 'threads') {
                console.log(`Creating text-only post for ${network}`);
                const textOnlyUrl = `https://graph.threads.net/v1.0/${provider_user_id}/threads`;
                const textParams = new URLSearchParams({ text: text, media_type: 'TEXT', access_token: access_token });
                const textPostResponse = await fetch(textOnlyUrl, { method: "POST", body: textParams });
                if (!textPostResponse.ok) {
                     const errorBody = await textPostResponse.json();
                     console.error(`${network} API Error (Text Post):`, JSON.stringify(errorBody, null, 2));
                     throw new Error(`Failed to publish text post to ${network}.`);
                }
                const textPostData = await textPostResponse.json();
                newPostId = textPostData.id;
            } else {
                throw new Error("Instagram requires a media file to post.");
            }
        } else {
            const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');
            const creationId = await createSingleMediaContainer(network, provider_user_id, access_token, mediaUrl, isVideo);
            const publishUrl = network === 'instagram' ? `https://graph.instagram.com/v19.0/${provider_user_id}/media_publish` : `https://graph.threads.net/v1.0/${provider_user_id}/threads_publish`;
            const publishParams = new URLSearchParams({ creation_id: creationId, access_token: access_token });
            const publishResponse = await fetch(publishUrl, { method: "POST", body: publishParams });
            if (!publishResponse.ok) {
                const errorBody = await publishResponse.json();
                console.error(`${network} API Error (Publish Single Media):`, JSON.stringify(errorBody, null, 2));
                throw new Error(`Failed to publish to ${network}. Status: ${publishResponse.status}`);
            }
            const publishData = await publishResponse.json();
            newPostId = publishData.id;
        }
        console.log(`Successfully published single media/text post to ${network}. New Post ID: ${newPostId}`);

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
      const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;
      const mediaType = mediaUrl ? (mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') ? 'VIDEO' : 'IMAGE') : null;

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

    } else if (network === "facebook") {
        const { access_token: pageAccessToken, provider_user_id: pageIdFromConn } = connection;
        const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;
        const isVideo = mediaUrl ? mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') : false;
        let apiUrl: string, params: URLSearchParams;
        if (mediaUrl && isVideo) {
            apiUrl = `https://graph.facebook.com/v20.0/${pageIdFromConn}/videos`;
            params = new URLSearchParams({ file_url: mediaUrl, description: text, access_token: pageAccessToken });
        } else if (mediaUrl) {
            apiUrl = `https://graph.facebook.com/v20.0/${pageIdFromConn}/photos`;
            params = new URLSearchParams({ url: mediaUrl, caption: text, access_token: pageAccessToken });
        } else {
            apiUrl = `https://graph.facebook.com/v20.0/${pageIdFromConn}/feed`;
            params = new URLSearchParams({ message: text, access_token: pageAccessToken });
        }
        const response = await fetch(apiUrl, { method: "POST", body: params });
        if (!response.ok) throw new Error(`Failed to publish to Facebook.`);
        const responseData = await response.json();
        newPostId = responseData.id || responseData.post_id;
    } else if (network === "linkedin") {
        const { access_token, provider_user_id } = connection;
        const authorUrn = `urn:li:person:${provider_user_id}`;
        const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;
        const linkedinApiBody: any = { author: authorUrn, commentary: text, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED" }, lifecycleState: "PUBLISHED" };
        if (mediaUrl) {
            const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');
            if (isVideo) {
                const videoFileResponse = await fetch(mediaUrl);
                if (!videoFileResponse.ok) throw new Error(`Failed to fetch video: ${mediaUrl}`);
                const videoBlob = await videoFileResponse.blob();
                const initResp = await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json', 'LinkedIn-Version': '202508', 'X-Restli-Protocol-Version': '2.0.0' },
                    body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn, fileSizeBytes: videoBlob.size } }),
                });
                if (!initResp.ok) throw new Error(`LinkedIn Video API init failed: ${await initResp.text()}`);
                const initData = await initResp.json();
                const videoUrn = initData.value.video;
                const uploadInstructions = initData.value.uploadInstructions;
                const uploadedPartIds: string[] = [];
                for (const instruction of uploadInstructions) {
                    const chunk = videoBlob.slice(instruction.firstByte, instruction.lastByte + 1);
                    const uploadResponse = await fetch(instruction.uploadUrl, { method: 'PUT', body: chunk });
                    if (!uploadResponse.ok) throw new Error(`Failed to upload video chunk.`);
                    const etag = uploadResponse.headers.get('etag');
                    if (!etag) throw new Error("Etag not found for chunk.");
                    uploadedPartIds.push(etag);
                }
                await fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json', 'LinkedIn-Version': '202508', 'X-Restli-Protocol-Version': '2.0.0' },
                    body: JSON.stringify({ finalizeUploadRequest: { video: videoUrn, uploadedPartIds } })
                });
                linkedinApiBody.content = { media: { id: videoUrn } };
            } else {
                const initResp = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json', 'LinkedIn-Version': '202508' },
                    body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }),
                });
                if (!initResp.ok) throw new Error(`LinkedIn Image API init failed.`);
                const uploadData = await initResp.json();
                const imageResponse = await fetch(mediaUrl);
                const imageBlob = await imageResponse.blob();
                await fetch(uploadData.value.uploadUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': imageBlob.type }, body: imageBlob });
                linkedinApiBody.content = { media: { id: uploadData.value.image } };
            }
        }
        const response = await fetch("https://api.linkedin.com/rest/posts", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}`, "LinkedIn-Version": "202508" }, body: JSON.stringify(linkedinApiBody) });
        if (!response.ok) throw new Error("Failed to publish to LinkedIn.");
        newPostId = response.headers.get("x-restli-id");
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