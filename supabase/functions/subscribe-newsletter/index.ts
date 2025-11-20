// supabase/functions/subscribe-newsletter/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("[LOG] subscribe-newsletter function invoked."); // Log 1: Function invoked

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, user_id: client_user_id } = await req.json();
    console.log(
      "[LOG] Received email:",
      email,
      "and client_user_id:",
      client_user_id,
    ); // Log 2: Received data

    if (!email) {
      return new Response(
        JSON.stringify({ status: "error", error: "Email is required." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Basic email validation (more robust validation can be added)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ status: "error", error: "Invalid email format." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // --- FIX: Check if the user is already pending ---
    const { data: existingSubscriber } = await supabaseClient
      .from("newsletter_subscribers")
      .select("status")
      .eq("email", email)
      .single();

    if (existingSubscriber && existingSubscriber.status === "pending") {
      console.log(
        `[LOG] Email ${email} is already pending confirmation. No new email will be sent.`,
      );
      // Return a success message to the user/bot so they don't know the difference.
      return new Response(
        JSON.stringify({
          status: "success",
          message:
            "Subscription successful. Please check your email for confirmation.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }
    // --- END FIX ---

    // Determine user ID: prioritize client_user_id if provided, otherwise try to get from auth header
    let userId: string | null = client_user_id || null;
    if (!userId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.split(" ")[1];
        try {
          const {
            data: { user },
            error: authError,
          } = await supabaseClient.auth.getUser(token);
          if (user && !authError) {
            userId = user.id;
          }
        } catch (e) {
          console.warn("[LOG] Could not get user from auth header:", e.message);
          // Continue without user_id if auth fails
        }
      }
    }

    let subscriberId: number;
    let confirmationToken = crypto.randomUUID(); // Generate a unique confirmation token

    // Insert or update subscriber
    // If email already exists, update status to pending and reset subscribed_at/unsubscribed_at
    const { data, error } = await supabaseClient
      .from("newsletter_subscribers")
      .upsert(
        {
          email: email,
          user_id: userId,
          status: "pending", // Always set to pending for confirmation
          subscribed_at: null, // Will be set upon confirmation
          unsubscribed_at: null, // Clear unsubscribed_at
          confirmation_token: confirmationToken, // Add this line
        },
        { onConflict: "email", ignoreDuplicates: false },
      )
      .select("id")
      .single();

    if (error) {
      console.error("[ERROR] Error upserting subscriber:", error);
      return new Response(
        JSON.stringify({ status: "error", error: "Failed to subscribe." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    subscriberId = data.id;
    console.log(
      "[LOG] Upsert successful. Subscriber ID:",
      subscriberId,
      "Token:",
      confirmationToken,
    ); // Log 3: Upsert successful

    // --- NEW: Insert directly into email_queue table ---
    const emailPayload = {
      email: email,
      subscriber_id: subscriberId,
      confirmation_token: confirmationToken,
      type: "newsletter_confirmation", // Redundant but good for consistency with old pgmq message structure
    };

    console.log(
      "[LOG] Attempting to insert into email_queue with payload:",
      emailPayload,
    ); // Log 4: Attempting insertion

    const { error: emailQueueError } = await supabaseClient
      .from("email_queue")
      .insert({
        email_type: "newsletter_confirmation",
        payload: emailPayload,
        status: "pending",
      });

    if (emailQueueError) {
      console.error(
        "[ERROR] Error inserting message into email_queue:",
        emailQueueError,
      ); // Log 5: Email queue insertion error
      // Log the error but still return success to the user, as the subscription itself was successful.
    } else {
      console.log("[LOG] Successfully inserted message into email_queue."); // Log 5: Email queue insertion success
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message:
          "Subscription successful. Please check your email for confirmation.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("[ERROR] Unhandled error:", error);
    return new Response(
      JSON.stringify({ status: "error", error: "Internal server error." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
