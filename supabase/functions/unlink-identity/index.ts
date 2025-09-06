import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- Unlink Identity Function Started (v3) ---");
    const { provider } = await req.json();
    console.log("Provider received:", provider);
    if (!provider) {
      throw new Error("O provedor é obrigatório.");
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    console.log("Supabase client created for user.");

    console.log("Attempting to get user identities...");
    const { data: { identities }, error: getUserIdentitiesError } = await supabase
      .auth.getUserIdentities();

    if (getUserIdentitiesError) {
      console.error("Error getting user identities:", getUserIdentitiesError.message);
      throw getUserIdentitiesError;
    }
    console.log("User identities received:", identities);

    if (!identities || identities.length <= 1) {
      console.error("Attempted to unlink the only login method.");
      throw new Error("Não é possível desvincular o único método de login.");
    }

    console.log("Finding identity to unlink for provider:", provider);
    const identityToUnlink = identities.find(
      (identity) => identity.provider === provider,
    );

    if (!identityToUnlink) {
      console.error(`Identity for provider '${provider}' not found.`);
      throw new Error(`Identidade para o provedor '${provider}' não encontrada.`);
    }
    console.log("Identity to unlink found:", identityToUnlink);

    console.log("Attempting to unlink identity...");
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(
      identityToUnlink,
    );

    if (unlinkError) {
      console.error("Error unlinking identity:", unlinkError.message);
      throw unlinkError;
    }

    console.log("--- Unlink Identity Function Succeeded (v3) ---");
    return new Response(
      JSON.stringify({ message: "Conta desvinculada com sucesso." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("--- Unlink Identity Function Failed (v3) ---");
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});