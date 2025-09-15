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
            "LinkedIn-Version": "202508",
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
      const uploadInstructions = initData.value.uploadInstructions;
      const uploadedPartIds: string[] = [];

      for (const instruction of uploadInstructions) {
        const chunk = videoBlob.slice(
          instruction.firstByte,
          instruction.lastByte + 1,
        );
        const uploadResponse = await fetch(instruction.uploadUrl, {
          method: "PUT",
          body: chunk,
        });
        if (!uploadResponse.ok)
          throw new Error(`Failed to upload video chunk.`);
        const etag = uploadResponse.headers.get("etag");
        if (!etag) throw new Error("Etag not found for chunk.");
        uploadedPartIds.push(etag);
      }

      await fetch(
        "https://api.linkedin.com/rest/videos?action=finalizeUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202508",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            finalizeUploadRequest: { video: videoUrn, uploadedPartIds },
          }),
        },
      );

      linkedinApiBody.content = { media: { id: videoUrn } };
    } else {
      const initResp = await fetch(
        "https://api.linkedin.com/rest/images?action=initializeUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202508",
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
      await fetch(uploadData.value.uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": imageBlob.type,
        },
        body: imageBlob,
      });
      linkedinApiBody.content = { media: { id: uploadData.value.image } };
    }
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
      "LinkedIn-Version": "202508",
    },
    body: JSON.stringify(linkedinApiBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LinkedIn API Error:", errorText);
    throw new Error(`Failed to publish to LinkedIn: ${errorText}`);
  }

  const newPostId = response.headers.get("x-restli-id");
  if (!newPostId) {
    throw new Error("Did not receive new post ID from LinkedIn.");
  }

  return newPostId;
}
