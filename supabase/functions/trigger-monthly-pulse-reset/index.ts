import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(
      `[trigger_monthly_pulse_reset] Function invoked. This should only happen once per user per month.`,
    );

    const { error: rpcError } = await supabaseAdmin.rpc("reset_pulses_monthly");

    if (rpcError) {
      console.error(
        "[trigger_monthly_pulse_reset] Error calling reset_pulses_monthly:",
        rpcError,
      );
      throw rpcError;
    }

    console.log(
      `[trigger_monthly_pulse_reset] Successfully called reset_pulses_monthly.`,
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in trigger_monthly_pulse_reset:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
