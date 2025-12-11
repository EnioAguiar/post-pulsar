import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Regex for validation
const DISCORD_WEBHOOK_REGEX =
  /^https:\/\/(?:ptb\.|canary\.)?(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d{17,19}\/[\w-]{68}$/;
const TELEGRAM_BOT_TOKEN_REGEX = /^\d{9,10}:[\w-]{35}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError) throw userError;
    if (!user) throw new Error("User not found");

    const { provider, connections } = await req.json();

    if (!provider || !Array.isArray(connections)) {
      throw new Error("A provider and an array of connections are required.");
    }

    // Clean slate: delete all old publishing connections for this user and provider
    const { error: deleteError } = await supabaseAdmin
      .from("social_connections")
      .delete()
      .match({ user_id: user.id, provider: provider, purpose: "publishing" });

    if (deleteError) {
      console.error("Error deleting old connections:", deleteError);
      throw new Error("Failed to update connections.");
    }

    // If the user just wants to delete all connections, they can send an empty array
    if (connections.length === 0) {
      return new Response(
        JSON.stringify({
          status: "success",
          message: "All connections for this provider have been removed.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const connectionsToInsert = connections.map((conn: any) => {
      if (!conn.display_name) {
        throw new Error("Each connection must have a display_name.");
      }

      let connectionData: any = {
        user_id: user.id,
        provider: provider,
        provider_user_name: conn.display_name, // Use display_name for the user-facing name
        purpose: "publishing", // Added to match the new schema
      };

      if (provider === "telegram") {
        if (!conn.bot_token || !conn.channel_id) {
          throw new Error(
            "For Telegram, bot_token and channel_id are required.",
          );
        }
        if (!TELEGRAM_BOT_TOKEN_REGEX.test(conn.bot_token)) {
          throw new Error("Invalid Telegram Bot Token format.");
        }
        if (
          typeof conn.channel_id !== "string" ||
          conn.channel_id.trim() === ""
        ) {
          throw new Error("Telegram Channel/Chat ID cannot be empty.");
        }

        connectionData.access_token = conn.bot_token;
        connectionData.refresh_token = conn.channel_id;
        connectionData.provider_user_id = conn.channel_id; // Use channel_id for uniqueness
      } else if (provider === "discord") {
        if (!conn.webhook_url) {
          throw new Error("For Discord, webhook_url is required.");
        }
        if (!DISCORD_WEBHOOK_REGEX.test(conn.webhook_url)) {
          throw new Error("Invalid Discord Webhook URL format.");
        }

        connectionData.access_token = conn.webhook_url;
        connectionData.provider_user_id = conn.display_name; // Use display_name for uniqueness
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      return connectionData;
    });

    const { error: insertError } = await supabaseAdmin
      .from("social_connections")
      .insert(connectionsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save new connections.");
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Main error:", e);
    return new Response(JSON.stringify({ status: "error", error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Always return 200 OK for client-side error handling
    });
  }
});
