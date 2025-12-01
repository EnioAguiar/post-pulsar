// supabase/functions/publish-to-social/services/instagramAnalyticsService.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface InstagramAnalyticsResponse {
  likes: number;
  comments: number;
  reach: number;
}

export async function getInstagramPostAnalytics(
  supabaseAdmin: SupabaseClient, // supabaseAdmin not directly used here, but kept for consistency
  accessToken: string,
  mediaId: string, // The ID of the published media on Instagram
): Promise<InstagramAnalyticsResponse | null> {
  try {
    console.log(`Fetching Instagram analytics for media ID: ${mediaId}`);

    const API_VERSION = "v18.0"; // Use a stable API version
    const baseUrl = `https://graph.facebook.com/${API_VERSION}/${mediaId}`;
    const fields = "like_count,comments_count,insights.metric(reach)"; // Request basic counts and reach insights
    const requestUrl = `${baseUrl}?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(requestUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error(
        `Instagram API Error (${response.status}):`,
        JSON.stringify(data),
      );
      return null;
    }

    const likes = data.like_count || 0;
    const comments = data.comments_count || 0;
    const reachData = data.insights?.data?.find(
      (insight: any) => insight.name === "reach",
    );
    const reach = reachData?.values?.[0]?.value || 0;

    return { likes, comments, reach };
  } catch (error) {
    console.error(
      `Error fetching Instagram post analytics for media ID ${mediaId}:`,
      error,
    );
    return null;
  }
}
