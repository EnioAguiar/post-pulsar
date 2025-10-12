CREATE TABLE "public"."subscriptions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "plan_id" text NOT NULL,
    "stripe_subscription_id" text NOT NULL,
    "status" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."subscriptions" OWNER TO "postgres";

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions"
    FOR SELECT
    TO authenticated
    USING ((auth.uid() = user_id));

GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";
