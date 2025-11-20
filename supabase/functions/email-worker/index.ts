// supabase/functions/email-worker/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { Resend } from "https://esm.sh/resend@1.1.0";

// --- Environment Variables ---
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MAX_RETRIES = 3;

// --- Validate Environment Variables ---
if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing one or more required environment variables: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
  );
  Deno.exit(1);
}

// --- Initialize Clients ---
const resend = new Resend(RESEND_API_KEY);
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Main Worker Logic ---
serve(async (req) => {
  console.log("Email worker started.");

  try {
    // Atomically fetch and lock pending tasks
    const { data: tasks, error: fetchError } = await supabaseClient
      .from("email_queue")
      .update({ status: "processing", last_attempt: new Date().toISOString() })
      .eq("status", "pending")
      .select()
      .limit(5);

    if (fetchError) {
      console.error("Error fetching tasks from email_queue:", fetchError);
      return new Response(
        JSON.stringify({ status: "error", error: "Failed to fetch tasks." }),
        { status: 500 },
      );
    }

    if (!tasks || tasks.length === 0) {
      console.log("No pending emails to process.");
      return new Response(
        JSON.stringify({
          status: "success",
          message: "No messages to process.",
        }),
        { status: 200 },
      );
    }

    console.log(`Fetched ${tasks.length} tasks to process.`);

    for (const task of tasks) {
      const { id: taskId, payload, retries } = task;
      console.log(`Processing task ${taskId}:`, payload);

      try {
        if (payload.type === "newsletter_confirmation") {
          const { email, confirmation_token } = payload;
          // Correctly build the confirmation URL to point to the Supabase Edge Function
          const confirmationUrl = `${SUPABASE_URL}/functions/v1/confirm-newsletter-subscription?token=${confirmation_token}&email=${encodeURIComponent(email)}`;

          const { data: emailData, error: emailError } =
            await resend.emails.send({
              from: "PostPulsar <noreply@post-pulsar.com>",
              to: [email],
              subject: "Confirm Your PostPulsar Newsletter Subscription!",
              html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Signup</title>
</head>
<body style="background-color: #0A0A0A; color: #E0E0E0; font-family: 'IBM Plex Mono', monospace; margin: 0; padding: 20px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <div style="max-width: 600px; margin: 0 auto; text-align: center;">
          <img src="https://post-pulsar.com/PostPulsar.png" alt="PostPulsar Logo" width="100" style="margin-bottom: 20px;">
          <h2 style="color: #E0E0E0; font-size: 24px;">Welcome to PostPulsar!</h2>
          <p style="color: #a0a0a0; font-size: 16px; line-height: 1.5;">
            Just one more step to start receiving our news and tips. Please click the button below to confirm your email address.
          </p>
          <a href="${confirmationUrl}" style="background-color: #FF4500; color: #0A0A0A; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; margin: 20px 0;">
            Confirm Your Email
          </a>
          <p style="color: #666; font-size: 12px;">
            If you did not sign up for PostPulsar's newsletter, you can safely ignore this email.
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
            });

          if (emailError) {
            throw new Error(JSON.stringify(emailError)); // Throw to be caught by the catch block
          }

          // On success, mark as 'sent'
          console.log(
            `Resend API success response for ${email} (taskId: ${taskId}):`,
            emailData,
          );
          await supabaseClient
            .from("email_queue")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", taskId);
          console.log(
            `Confirmation email sent to ${email} (taskId: ${taskId}).`,
          );
        } else {
          console.warn(
            `Unknown task type: ${payload.type} (taskId: ${taskId}). Marking as failed.`,
          );
          await supabaseClient
            .from("email_queue")
            .update({ status: "failed" })
            .eq("id", taskId);
        }
      } catch (processError) {
        console.error(
          `Failed to process task ${taskId}:`,
          processError.message,
        );
        const newRetryCount = (retries || 0) + 1;
        const newStatus = newRetryCount >= MAX_RETRIES ? "failed" : "pending";

        await supabaseClient
          .from("email_queue")
          .update({
            status: newStatus,
            retries: newRetryCount,
          })
          .eq("id", taskId);

        console.log(
          `Task ${taskId} marked as '${newStatus}' after ${newRetryCount} retries.`,
        );
      }
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message: `Processed ${tasks.length} tasks.`,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Unhandled error in email worker:", error);
    return new Response(
      JSON.stringify({ status: "error", error: "Internal server error." }),
      { status: 500 },
    );
  }
});
