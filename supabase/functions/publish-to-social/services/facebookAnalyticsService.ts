// supabase/functions/publish-to-social/services/facebookAnalyticsService.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface FacebookAnalyticsResponse {
  likes: number;
  comments: number;
  shares: number; // Note: Shares are often not available via this method.
}

export async function getFacebookPostAnalytics(
  supabaseAdmin: SupabaseClient,
  accessToken: string,
  postId: string,
): Promise<FacebookAnalyticsResponse | null> {
  try {
    const API_VERSION = "v20.0";
    const baseUrl = `https://graph.facebook.com/${API_VERSION}/${postId}`;
    const fields = "likes.summary(true),comments.summary(true)";
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

    const likes = data.likes?.summary?.total_count || 0;
    const comments = data.comments?.summary?.total_count || 0;
    const shares = 0; 
    
    return { likes, comments, shares };
    
  } catch (error) {
    console.error(
      `Error fetching Facebook post analytics for post ID ${postId}:`,
      error,
    );
    return null;
  }
}
