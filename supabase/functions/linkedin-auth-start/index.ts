import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- LinkedIn Auth Start ---");

    const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID");
    if (!LINKEDIN_CLIENT_ID) {
      throw new Error(
        "LINKEDIN_CLIENT_ID is not set in environment variables.",
      );
    }
    console.log("LINKEDIN_CLIENT_ID loaded.");

    const body = await req.json();
    console.log("Request body:", body);
    const { userId } = body;

    if (!userId) {
      console.error("Error: User ID is missing from the request body.");
      throw new Error("User ID is required.");
    }
    console.log("User ID received:", userId);

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/linkedin-auth-callback`;
    const scope = "openid profile email w_member_social";

    const stateObject = {
      userId,
      csrf: crypto.randomUUID(),
    };
    const state = btoa(JSON.stringify(stateObject));
    console.log("State created:", state);

    const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
    console.log("Authorization URL created:", authorizationUrl);

    return new Response(JSON.stringify({ authorizationUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in linkedin-auth-start:", errorMessage);
    return new Response(
      JSON.stringify({
        error: `Could not retrieve authorization URL. Internal error: ${errorMessage}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
