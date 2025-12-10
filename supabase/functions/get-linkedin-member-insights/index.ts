import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );
    const { data: { user } } = await userSupabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated.");
    }

    // 1. Fetch LinkedIn Insights Connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("social_connections")
      .select("access_token, refresh_token, expires_at, provider_user_id")
      .eq("user_id", user.id)
      .eq("provider", "linkedin")
      .eq("purpose", "insights")
      .single();

    if (connectionError || !connection) {
      throw new Error("LinkedIn Insights connection not found.");
    }

    let accessToken = connection.access_token;
    let refreshToken = connection.refresh_token;
    let expiresAt = new Date(connection.expires_at);

    // 2. Refresh token if expired (simplified, real implementation needs full OAuth refresh logic)
    // For LinkedIn, the 'expires_in' from the initial token exchange is usually 60 days (5184000 seconds).
    // A simple check here is for demonstration, full refresh logic would be more involved.
    if (expiresAt.getTime() < Date.now() + 5 * 60 * 1000) { // If token expires in less than 5 minutes
        console.log("LinkedIn Insights access token is about to expire, attempting refresh...");
        // This part needs a dedicated refresh token flow implementation which is complex.
        // For now, we'll assume the token is always valid or require re-auth.
        // A full implementation would call to LinkedIn's token endpoint with grant_type=refresh_token
        // For this task, we will simplify and throw an error for token expiration to prompt re-authentication
        // or a more robust token refresh mechanism outside this specific function.
        // As per the project context "Tratamento de Sessões Expiradas" in ARCHITECTURE.md,
        // it states: "A função publish-to-social tenta renovar o access_token antes de cada publicação.
        // Se falhar, retorna um erro específico (SESSION_EXPIRED) que o frontend usa para exibir um modal informativo."
        // We will adapt a similar strategy here for insights.
        throw new Error("LinkedIn Insights session expired. Please re-link your account.");
    }

    // Prepare LinkedIn API Version header
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const linkedInVersion = `${year}${month}`;

    // 3. Call LinkedIn API for Member Post Statistics
    const metrics = ["IMPRESSION", "REACTION", "COMMENT", "RESHARE", "MEMBERS_REACHED"];
    const insightsResults: any = {};

    for (const metric of metrics) {
      const apiUrl = `https://api.linkedin.com/rest/memberCreatorPostAnalytics?q=me&queryType=${metric}&aggregation=TOTAL`;
      
      const response = await fetch(apiUrl, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Linkedin-Version": linkedInVersion,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`Error fetching ${metric} from LinkedIn: ${response.status} - ${await response.text()}`);
        // Continue to next metric or throw a specific error
        insightsResults[metric] = { error: `Failed to fetch ${metric}` };
      } else {
        const data = await response.json();
        // The API returns an array of elements, each containing 'count' for the metric
        // We are querying with aggregation=TOTAL, so we expect one element or no elements
        insightsResults[metric] = data.elements && data.elements.length > 0
          ? data.elements[0].count
          : 0;
      }
    }
    
    // Construct a more user-friendly insights object
    const formattedInsights = {
      impressions: insightsResults.IMPRESSION,
      reactions: insightsResults.REACTION,
      comments: insightsResults.COMMENT,
      reshares: insightsResults.RESHARE,
      membersReached: insightsResults.MEMBERS_REACHED,
      // You can add more processing or specific post filtering here if needed
    };

    return new Response(
      JSON.stringify({ status: "success", data: formattedInsights }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in get-linkedin-member-insights:", errorMessage);
    return new Response(
      JSON.stringify({
        status: "error",
        error: `Failed to retrieve LinkedIn member insights: ${errorMessage}`,
        errorCode: errorMessage.includes("session expired") ? "SESSION_EXPIRED" : "UNKNOWN_ERROR",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Always return 200 OK for Supabase Functions
      },
    );
  }
});