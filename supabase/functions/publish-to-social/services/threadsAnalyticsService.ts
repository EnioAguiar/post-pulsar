// supabase/functions/publish-to-social/services/threadsAnalyticsService.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ThreadsAnalyticsResponse {
  likes: number;
  replies: number;
  reposts: number;
}

export async function getThreadsPostAnalytics(
  supabaseAdmin: SupabaseClient, // supabaseAdmin not directly used here, but kept for consistency
  accessToken: string,
  mediaId: string, // The ID of the published media on Threads
): Promise<ThreadsAnalyticsResponse | null> {
  try {
    console.log(`Fetching Threads analytics for media ID: ${mediaId}`);

    const API_VERSION = "v18.0"; // Use a stable API version
    const baseUrl = `https://graph.threads.net/${API_VERSION}/${mediaId}/insights`; // Threads API uses graph.threads.net
    const metrics = "likes,replies,reposts";
    const requestUrl = `${baseUrl}?metric=${metrics}&access_token=${accessToken}`;

    const response = await fetch(requestUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error(
        `Threads API Error (${response.status}):`,
        JSON.stringify(data),
      );
      return null;
    }

    // Parse insights data. The structure is usually data: [{name: 'likes', values: [{value: X}]}]
    const likesData = data.data?.find((insight: any) => insight.name === "likes");
    const repliesData = data.data?.find((insight: any) => insight.name === "replies");
    const repostsData = data.data?.find((insight: any) => insight.name === "reposts");

    const likes = likesData?.values?.[0]?.value || 0;
    const replies = repliesData?.values?.[0]?.value || 0;
    const reposts = repostsData?.values?.[0]?.value || 0;

    return { likes, replies, reposts };
  } catch (error) {
    console.error(
      `Error fetching Threads post analytics for media ID ${mediaId}:`,
      error,
    );
    return null;
  }
}
