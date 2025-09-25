// supabase/functions/publish-to-social/services/linkedinService.ts

interface LinkedInConnection {
  access_token: string;
  provider_user_id: string;
}

export async function publishToLinkedIn(
  connection: LinkedInConnection,
  text: string,
  mediaUrls?: string[],
): Promise<string> {
  // Truncate text to be safe for LinkedIn's limit
  const LINKEDIN_CHAR_LIMIT = 2950;
  if (text.length > LINKEDIN_CHAR_LIMIT) {
    console.log(
      `Truncating LinkedIn text from ${text.length} to ${LINKEDIN_CHAR_LIMIT} chars.`,
    );
    const lastSpace = text
      .substring(0, LINKEDIN_CHAR_LIMIT - 3)
      .lastIndexOf(" ");
    if (lastSpace > 0) {
      text = text.substring(0, lastSpace) + "...";
    } else {
      text = text.substring(0, LINKEDIN_CHAR_LIMIT - 3) + "...";
    }
  }

  const { access_token, provider_user_id } = connection;
  const authorUrn = `urn:li:person:${provider_user_id}`;
  const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;

  const linkedinApiBody: any = {
    author: authorUrn,
    commentary: text,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    lifecycleState: "PUBLISHED",
  };

  if (mediaUrl) {
    const isVideo = mediaUrl.includes(".mp4") || mediaUrl.includes(".mov");
    if (isVideo) {
      const videoFileResponse = await fetch(mediaUrl);
      if (!videoFileResponse.ok)
        throw new Error(`Failed to fetch video: ${mediaUrl}`);
      const videoBlob = await videoFileResponse.blob();

      const initResp = await fetch(
        "https://api.linkedin.com/rest/videos?action=initializeUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202509",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: authorUrn,
              fileSizeBytes: videoBlob.size,
            },
          }),
        },
      );
      if (!initResp.ok)
        throw new Error(
          `LinkedIn Video API init failed: ${await initResp.text()}`,
        );
      const initData = await initResp.json();
      const videoUrn = initData.value.video;
      const uploadToken = initData.value.uploadToken;
      const uploadInstructions = initData.value.uploadInstructions;
      const uploadedPartIds: string[] = [];

      console.log(
        `Starting multipart upload for ${videoUrn}. Total parts: ${uploadInstructions.length}`,
      );

      for (let i = 0; i < uploadInstructions.length; i++) {
        const instruction = uploadInstructions[i];
        console.log(`Uploading part ${i + 1}/${uploadInstructions.length}...`);
        const chunk = videoBlob.slice(
          instruction.firstByte,
          instruction.lastByte + 1,
        );
        const uploadResponse = await fetch(instruction.uploadUrl, {
          method: "PUT",
          body: chunk,
        });
        if (!uploadResponse.ok)
          throw new Error(`Failed to upload video chunk ${i + 1}.`);
        const etag = uploadResponse.headers.get("etag");
        if (!etag) throw new Error(`Etag not found for chunk ${i + 1}.`);
        const cleanEtag = etag.replace(/"/g, "");
        console.log(`Part ${i + 1} uploaded. ETag: ${cleanEtag}`);
        uploadedPartIds.push(cleanEtag); // Strip quotes from ETag
      }

      console.log(
        "All parts uploaded. Finalizing upload with ETags:",
        uploadedPartIds,
      );

      const finalizeResponse = await fetch(
        "https://api.linkedin.com/rest/videos?action=finalizeUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202509",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            finalizeUploadRequest: {
              video: videoUrn,
              uploadToken: uploadToken,
              uploadedPartIds,
            },
          }),
        },
      );

      if (!finalizeResponse.ok) {
        throw new Error(
          `LinkedIn Finalize Upload failed: ${await finalizeResponse.text()}`,
        );
      }

      console.log(
        "Finalize upload successful. Starting polling for video processing...",
      );

      // POLLING LOGIC
      let videoIsReady = false;
      const maxRetries = 24; // 24 retries * 5 seconds = 2 minute timeout
      let retries = 0;
      while (!videoIsReady && retries < maxRetries) {
        const statusResponse = await fetch(
          `https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "LinkedIn-Version": "202509",
            },
          },
        );

        if (!statusResponse.ok) {
          throw new Error(
            `Failed to get video processing status: ${await statusResponse.text()}`,
          );
        }

        const statusData = await statusResponse.json();
        const processingStatus = statusData.status;
        console.log(
          `LinkedIn video status check #${retries + 1}: ${processingStatus}`,
        );

        if (processingStatus === "AVAILABLE") {
          videoIsReady = true;
        } else if (processingStatus === "FAILED") {
          throw new Error("LinkedIn video processing failed.");
        } else {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5-second delay
        }
      }

      if (!videoIsReady) {
        throw new Error("LinkedIn video processing timed out after 2 minutes.");
      }

      linkedinApiBody.content = {
        media: { id: videoUrn, title: "PostPulsar Video" },
      };
    } else {
      const initResp = await fetch(
        "https://api.linkedin.com/rest/images?action=initializeUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202509",
          },
          body: JSON.stringify({
            initializeUploadRequest: { owner: authorUrn },
          }),
        },
      );
      if (!initResp.ok) throw new Error(`LinkedIn Image API init failed.`);
      const uploadData = await initResp.json();
      const imageResponse = await fetch(mediaUrl);
      const imageBlob = await imageResponse.blob();

      // Use PUT to upload the image file
      const uploadImageResponse = await fetch(uploadData.value.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": imageBlob.type,
        },
        body: imageBlob,
      });

      if (!uploadImageResponse.ok) {
        throw new Error(
          `LinkedIn Image Upload failed: ${await uploadImageResponse.text()}`,
        );
      }

      linkedinApiBody.content = {
        media: {
          id: uploadData.value.image,
          altText: text.substring(0, 120), // Use commentary as alt text, truncated to a reasonable length
        },
      };
    }
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
      "LinkedIn-Version": "202509",
    },
    body: JSON.stringify(linkedinApiBody),
  });

  // Clone the response so we can read it twice (once for headers, once for body if needed)
  const responseClone = response.clone();

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LinkedIn API Error:", errorText);
    throw new Error(`Failed to publish to LinkedIn: ${errorText}`);
  }

  const newPostId = response.headers.get("x-restli-id");
  if (!newPostId) {
    const responseBody = await responseClone.text();
    console.error(
      "LinkedIn response body did not contain post ID. Body:",
      responseBody,
    );
    // Even if we don't get an ID, the post might have been created.
    // Let's return a generic success marker instead of throwing an error.
    // The UI will show "Published!" but we won't have a specific ID.
    return "urn:li:share:created_without_id";
  }

  return newPostId;
}
