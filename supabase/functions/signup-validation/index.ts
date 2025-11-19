import { z } from "https://esm.sh/zod";
import { corsHeaders } from "../_shared/cors.ts";

console.log(`Function "signup-validation" up and running!`);

const BLOCKLIST_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";

// Simple in-memory cache
let blocklist: string[] = [];
let lastFetched = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

async function getBlocklist() {
  const now = Date.now();
  if (now - lastFetched > CACHE_DURATION || blocklist.length === 0) {
    console.log("Fetching fresh blocklist...");
    try {
      const response = await fetch(BLOCKLIST_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch blocklist: ${response.statusText}`);
      }
      const text = await response.text();
      blocklist = text
        .split("\n")
        .filter((line) => line.trim() !== "" && !line.startsWith("#"));
      lastFetched = now;
      console.log(
        `Successfully fetched and parsed ${blocklist.length} domains.`,
      );
    } catch (error) {
      console.error("Error fetching blocklist:", error);
      // If fetching fails, we can choose to proceed with the stale list or fail open/closed.
      // For now, we'll use the (potentially empty) stale list.
    }
  }
  return blocklist;
}

// Pre-warm the cache on function boot, but don't block execution
getBlocklist();

// Define the schema for the request body
const SignupPayload = z.object({
  email: z.string().email(),
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const currentBlocklist = await getBlocklist();
    const body = await req.json();
    const validationResult = SignupPayload.safeParse(body);

    if (!validationResult.success) {
      const errorPayload = {
        status: "error",
        error: "Invalid email format.",
        errorCode: "INVALID_EMAIL_FORMAT",
      };
      return new Response(JSON.stringify(errorPayload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { email } = validationResult.data;
    const domain = email.split("@")[1];

    if (currentBlocklist.includes(domain)) {
      const errorPayload = {
        status: "error",
        error:
          "Please use a permanent email address. Disposable emails are not allowed.",
        errorCode: "DISPOSABLE_EMAIL",
      };
      return new Response(JSON.stringify(errorPayload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const successPayload = {
      status: "success",
      message: "Email is valid.",
    };
    return new Response(JSON.stringify(successPayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorPayload = {
      status: "error",
      error: errorMessage,
      errorCode: "UNEXPECTED_ERROR",
    };
    return new Response(JSON.stringify(errorPayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Always return 200 OK
    });
  }
});
