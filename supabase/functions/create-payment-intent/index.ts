import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2025-08-27.basil",
  httpClient: Stripe.createFetchHttpClient(),
});

const products = {
  pulse_pack_50: {
    name: "50 Pulse Pack",
    price: 500, // $5 em centavos
    currency: "usd",
  },
  pulse_pack_125: {
    name: "125 Pulse Pack",
    price: 1000, // $10 em centavos
    currency: "usd",
  },
  pulse_pack_300: {
    name: "300 Pulse Pack",
    price: 2000, // $20 em centavos
    currency: "usd",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { productId, idempotencyKey } = await req.json();

    if (!productId || !idempotencyKey) {
      throw new Error("ProductId e IdempotencyKey são obrigatórios.");
    }

    const product = products[productId];
    if (!product) {
      throw new Error("Produto não encontrado.");
    }

    // 1. Verificar a chave de idempotência no nosso DB
    let { data: existingPurchase, error: existingPurchaseError } =
      await supabaseAdmin
        .from("purchases")
        .select("stripe_payment_intent_id")
        .eq("idempotency_key", idempotencyKey)
        .single();

    if (existingPurchase && existingPurchase.stripe_payment_intent_id) {
      // 2. Se a compra já existe e tem um payment_intent, retorne-o
      const paymentIntent = await stripe.paymentIntents.retrieve(
        existingPurchase.stripe_payment_intent_id
      );
      return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Decodificar o token JWT para obter o user_id
    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");
    const [_header, payload, _signature] = jwt.split(".");
    const userId = JSON.parse(atob(payload)).sub;

    if (!userId) {
      throw new Error("Usuário não autenticado.");
    }

    // 3. Se não existir, crie o Payment Intent e o registro no DB
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: product.price,
        currency: product.currency,
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: idempotencyKey } // Passa a chave para o Stripe
    );

    const { error: insertError } = await supabaseAdmin
      .from("purchases")
      .insert({
        user_id: userId,
        product_id: productId,
        idempotency_key: idempotencyKey,
        stripe_payment_intent_id: paymentIntent.id,
        status: "pending",
        amount: product.price,
        currency: product.currency,
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro na função create-payment-intent:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});