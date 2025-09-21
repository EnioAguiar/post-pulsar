
CREATE TABLE "public"."purchases" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "product_id" text NOT NULL,
    "idempotency_key" uuid NOT NULL,
    "stripe_payment_intent_id" text,
    "status" text NOT NULL DEFAULT 'pending'::text,
    "amount" integer NOT NULL,
    "currency" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."purchases" OWNER TO "postgres";

ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_idempotency_key_key" UNIQUE ("idempotency_key");

ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX "purchases_user_id_idx" ON "public"."purchases" USING "btree" ("user_id");

ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON "public"."purchases"
    FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own purchases" ON "public"."purchases"
    FOR INSERT WITH CHECK ((auth.uid() = user_id));

GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";
