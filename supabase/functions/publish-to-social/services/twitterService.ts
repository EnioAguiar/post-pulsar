// supabase/functions/publish-to-social/services/twitterService.ts

import {
  OAuthClient,
  HMAC_SHA1,
  toAuthHeader,
} from "https://raw.githubusercontent.com/snsinfu/deno-oauth-1.0a/main/mod.ts";

interface TwitterConnection {
  oauth_token: string;
  oauth_token_secret: string;
}

async function uploadVideo(
  client: OAuthClient,
  connection: TwitterConnection,
  mediaBlob: Blob,
): Promise<string> {
  const mediaUploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
  const totalBytes = mediaBlob.size;

  // 1. INIT
  const initParams = {
    command: "INIT",
    total_bytes: totalBytes.toString(),
    media_type: mediaBlob.type,
    media_category: "tweet_video",
  };
  const initAuthHeader = toAuthHeader(
    client.sign("POST", mediaUploadUrl, {
      token: connection,
      params: initParams,
    }),
  );
  const initResponse = await fetch(mediaUploadUrl, {
    method: "POST",
    headers: {
      Authorization: initAuthHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(initParams).toString(),
  });
  if (!initResponse.ok)
    throw new Error(`Twitter INIT failed: ${await initResponse.text()}`);
  const { media_id_string: mediaId } = await initResponse.json();

  // 2. APPEND
  const chunkSize = 1 * 1024 * 1024;
  let bytesSent = 0;
  let segmentIndex = 0;
  while (bytesSent < totalBytes) {
    const chunk = mediaBlob.slice(bytesSent, bytesSent + chunkSize);
    const appendFormData = new FormData();
    appendFormData.append("command", "APPEND");
    appendFormData.append("media_id", mediaId);
    appendFormData.append("segment_index", segmentIndex.toString());
    appendFormData.append("media", chunk);

    const appendAuthHeader = toAuthHeader(
      client.sign("POST", mediaUploadUrl, { token: connection }),
    );
    const appendResponse = await fetch(mediaUploadUrl, {
      method: "POST",
      headers: { Authorization: appendAuthHeader },
      body: appendFormData,
    });
    if (!appendResponse.ok)
      throw new Error(`Twitter APPEND failed: ${await appendResponse.text()}`);

    bytesSent += chunk.size;
    segmentIndex++;
  }

  // 3. FINALIZE
  const finalizeParams = { command: "FINALIZE", media_id: mediaId };
  const finalizeAuthHeader = toAuthHeader(
    client.sign("POST", mediaUploadUrl, {
      token: connection,
      params: finalizeParams,
    }),
  );
  const finalizeResponse = await fetch(mediaUploadUrl, {
    method: "POST",
    headers: {
      Authorization: finalizeAuthHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(finalizeParams).toString(),
  });
  if (!finalizeResponse.ok)
    throw new Error(
      `Twitter FINALIZE failed: ${await finalizeResponse.text()}`,
    );
  const finalizeData = await finalizeResponse.json();

  // 4. STATUS
  if (finalizeData.processing_info) {
    let state = finalizeData.processing_info.state;
    while (state === "pending" || state === "in_progress") {
      const checkAfterSecs = finalizeData.processing_info.check_after_secs || 5;
      await new Promise((resolve) =>
        setTimeout(resolve, checkAfterSecs * 1000),
      );

      const statusParams = { command: "STATUS", media_id: mediaId };
      const statusAuthHeader = toAuthHeader(
        client.sign("GET", mediaUploadUrl, {
          token: connection,
          params: statusParams,
        }),
      );
      const statusResponse = await fetch(
        `${mediaUploadUrl}?${new URLSearchParams(statusParams).toString()}`,
        { headers: { Authorization: statusAuthHeader } },
      );
      if (!statusResponse.ok)
        throw new Error(
          `Twitter STATUS check failed: ${await statusResponse.text()}`,
        );
      const statusData = await statusResponse.json();
      state = statusData.processing_info.state;

      if (state === "failed")
        throw new Error(
          `Twitter video processing failed: ${statusData.processing_info.error.message}`,
        );
    }
  }
  return mediaId;
}

async function uploadImage(
  client: OAuthClient,
  connection: TwitterConnection,
  mediaBlob: Blob,
): Promise<string> {
  const mediaUploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
  const formData = new FormData();
  formData.append("media", mediaBlob);
  const uploadAuthHeader = toAuthHeader(
    client.sign("POST", mediaUploadUrl, { token: connection }),
  );
  const mediaUploadResponse = await fetch(mediaUploadUrl, {
    method: "POST",
    headers: { Authorization: uploadAuthHeader },
    body: formData,
  });
  if (!mediaUploadResponse.ok)
    throw new Error(
      `Failed to upload image to Twitter: ${await mediaUploadResponse.text()}`,
    );
  const mediaData = await mediaUploadResponse.json();
  return mediaData.media_id_string;
}

export async function publishToTwitter(
  connection: TwitterConnection,
  text: string,
  mediaUrls?: string[],
): Promise<string> {
  const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");
  if (!consumerKey || !consumerSecret)
    throw new Error("Missing Twitter consumer credentials.");

  const client = new OAuthClient({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature: HMAC_SHA1,
  });

  let mediaIdString: string | null = null;
  const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;

  if (mediaUrl) {
    const mediaResponse = await fetch(mediaUrl);
    if (!mediaResponse.ok)
      throw new Error(`Failed to fetch media from storage: ${mediaUrl}`);
    const mediaBlob = await mediaResponse.blob();
    const isVideo = mediaBlob.type.startsWith("video/");

    mediaIdString = isVideo
      ? await uploadVideo(client, connection, mediaBlob)
      : await uploadImage(client, connection, mediaBlob);
  }

  // Create Tweet
  const tweetApiUrl = "https://api.twitter.com/2/tweets";
  const requestBody: any = { text };
  if (mediaIdString) {
    requestBody.media = { media_ids: [mediaIdString] };
  }

  const tweetAuthHeader = toAuthHeader(
    client.sign("POST", tweetApiUrl, { token: connection }),
  );
  const twitterResponse = await fetch(tweetApiUrl, {
    method: "POST",
    headers: {
      Authorization: tweetAuthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!twitterResponse.ok) {
    const errorBody = await twitterResponse.json();
    console.error(
      "Twitter Create Tweet API Error:",
      JSON.stringify(errorBody, null, 2),
    );
    throw new Error(
      `Failed to publish to Twitter. Status: ${twitterResponse.status}`,
    );
  }

  const responseData = await twitterResponse.json();
  return responseData.data.id;
}
