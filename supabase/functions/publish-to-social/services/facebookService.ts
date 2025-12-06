// supabase/functions/publish-to-social/services/facebookService.ts

interface FacebookConnection {
  access_token: string;
  provider_user_id: string;
}

export async function publishToFacebook(
  connection: FacebookConnection,
  text: string,
  mediaUrls?: string[],
): Promise<{ postId: string }> {
  const { access_token: pageAccessToken, provider_user_id: pageId } =
    connection;
  const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;
  const isVideo = mediaUrl
    ? mediaUrl.includes(".mp4") || mediaUrl.includes(".mov")
    : false;

  let apiUrl: string;
  let params: URLSearchParams;

  if (mediaUrl && isVideo) {
    apiUrl = `https://graph.facebook.com/v20.0/${pageId}/videos`;
    params = new URLSearchParams({
      file_url: mediaUrl,
      description: text,
      access_token: pageAccessToken,
    });
  } else if (mediaUrl) {
    apiUrl = `https://graph.facebook.com/v20.0/${pageId}/photos`;
    params = new URLSearchParams({
      url: mediaUrl,
      caption: text,
      access_token: pageAccessToken,
    });
  } else {
    apiUrl = `https://graph.facebook.com/v20.0/${pageId}/feed`;
    params = new URLSearchParams({
      message: text,
      access_token: pageAccessToken,
    });
  }

  const response = await fetch(apiUrl, { method: "POST", body: params });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Facebook API Error:", errorText);
    throw new Error(`Failed to publish to Facebook: ${errorText}`);
  }

  const responseData = await response.json();
  const newPostId = responseData.id || responseData.post_id;

  if (!newPostId) {
    throw new Error("Did not receive new post ID from Facebook.");
  }

  return { postId: newPostId };
}
