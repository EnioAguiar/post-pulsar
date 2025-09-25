import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Use the admin client for all database operations
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing authorization header",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError) {
      console.error("User error:", userError);
      return new Response(
        JSON.stringify({ status: "error", error: "Authentication failed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }
    if (!user) {
      return new Response(
        JSON.stringify({ status: "error", error: "User not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 2. Get provider and credentials from request body
    const { provider, credentials } = await req.json();

    if (!provider || !credentials) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing provider or credentials",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 3. Prepare data for upsert
    let connectionData: any = {
      user_id: user.id,
      provider: provider,
    };

    if (provider === "telegram") {
      if (!credentials.bot_token || !credentials.channel_id) {
        return new Response(
          JSON.stringify({
            status: "error",
            error: "Missing Telegram Bot Token or Channel ID",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
      connectionData.access_token = credentials.bot_token;
      connectionData.refresh_token = credentials.channel_id; // Using refresh_token to store channel_id
      connectionData.provider_user_id = "telegram_bot"; // Generic ID for this connection type
    } else if (provider === "discord") {
      if (!credentials.webhook_url) {
        return new Response(
          JSON.stringify({
            status: "error",
            error: "Missing Discord Webhook URL",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
      connectionData.access_token = credentials.webhook_url;
      connectionData.provider_user_id = "discord_webhook"; // Generic ID for this connection type
    } else {
      return new Response(
        JSON.stringify({ status: "error", error: "Unsupported provider" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 4. Upsert into social_connections table
    const { error: upsertError } = await supabaseAdmin
      .from("social_connections")
      .upsert(connectionData, {
        onConflict: "user_id,provider,provider_user_id",
      });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Failed to save connection to database.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 5. Return success
    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Main error:", e);
    return new Response(JSON.stringify({ status: "error", error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
