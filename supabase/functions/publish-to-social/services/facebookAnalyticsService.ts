// supabase/functions/publish-to-social/services/facebookAnalyticsService.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface FacebookAnalyticsResponse {
  likes: number;
  comments: number;
  shares: number;
}

export async function getFacebookPostAnalytics(
  supabaseAdmin: SupabaseClient, // supabaseAdmin not directly used here, but kept for consistency
  accessToken: string,
  postId: string, // The ID of the published post on Facebook
): Promise<FacebookAnalyticsResponse | null> {
  try {
    console.log(`Fetching Facebook analytics for post ID: ${postId}`);

    const API_VERSION = "v18.0"; // Use a stable API version
    const baseUrl = `https://graph.facebook.com/${API_VERSION}/${postId}`;
    const fields = "reactions.summary(true),comments.summary(true),shares";
    const requestUrl = `${baseUrl}?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(requestUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error(
        `Facebook API Error (${response.status}):`,
        JSON.stringify(data),
      );
      return null;
    }

    const likes = data.reactions?.summary?.total_count || 0;
    const comments = data.comments?.summary?.total_count || 0;
    const shares = data.shares?.count || 0;

    return { likes, comments, shares };
  } catch (error) {
    console.error(
      `Error fetching Facebook post analytics for post ID ${postId}:`,
      error,
    );
    return null;
  }
}
