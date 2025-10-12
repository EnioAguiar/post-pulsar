DROP POLICY "Users can view their own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
