import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2025-08-27.basil",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const pulsesPerProduct = {
  pulse_pack_100: 100,
  pulse_pack_250: 250,
  pulse_pack_600: 600,
};

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")!
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const { data: purchase, error } = await supabaseAdmin
        .from("purchases")
        .select("user_id, product_id, status")
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .single();

      if (error) {
        throw new Error(`Falha ao buscar a compra: ${error.message}`);
      }

      if (purchase && purchase.status !== "succeeded") {
        // Atualiza o status da compra para evitar processamento duplicado
        const { error: updateError } = await supabaseAdmin
          .from("purchases")
          .update({ status: "succeeded" })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        if (updateError) {
          throw new Error(
            `Falha ao atualizar status da compra: ${updateError.message}`
          );
        }

        // Adiciona os pulsos ao usuário
        const pulsesToAdd = pulsesPerProduct[purchase.product_id];
        if (pulsesToAdd) {
          const { error: rpcError } = await supabaseAdmin.rpc(
            "add_pulses_to_user",
            {
              user_id_input: purchase.user_id,
              pulses_to_add: pulsesToAdd,
            }
          );

          if (rpcError) {
            throw new Error(
              `Falha ao adicionar pulsos ao usuário: ${rpcError.message}`
            );
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("Erro ao processar webhook:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});