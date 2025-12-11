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

    const API_VERSION = "v1.0";
    // CORRECTED: Use the /insights endpoint on the graph.threads.net domain
    const baseUrl = `https://graph.threads.net/${API_VERSION}/${mediaId}/insights`;
    // CORRECTED: Request 'likes' and 'replies' metrics, remove 'reposts' for now
    const metrics = "likes,replies"; // Alterado de "likes"
    const requestUrl = `${baseUrl}?metric=${metrics}&access_token=${accessToken}`;

    console.log(`DEBUG: Final Threads analytics request URL: ${requestUrl}`);

    const response = await fetch(requestUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error(
        `Threads API Error (${response.status}):`,
        JSON.stringify(data),
      );
      return null;
    }

    console.log(
      `DEBUG: Threads analytics response data: ${JSON.stringify(data)}`,
    );

    // Parse insights data, which has the structure: data: [{name: 'likes', values: [{value: X}]}]
    const likesData = data.data?.find(
      (insight: any) => insight.name === "likes",
    );
    const repliesData = data.data?.find(
      (insight: any) => insight.name === "replies",
    );
    const repostsData = data.data?.find(
      (insight: any) => insight.name === "reposts",
    );

    const likes = likesData?.values?.[0]?.value || 0;
    const replies = repliesData?.values?.[0]?.value || 0;
    const reposts = repostsData?.values?.[0]?.value || 0; // Will now be 0 as it's not requested

    return { likes, replies, reposts };
  } catch (error) {
    console.error(
      `Error fetching Threads post analytics for media ID ${mediaId}:`,
      error,
    );
    return null;
  }
}
