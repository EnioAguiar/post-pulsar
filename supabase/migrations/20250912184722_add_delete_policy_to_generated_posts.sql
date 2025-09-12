CREATE POLICY "Users can delete their own posts" 
ON public.generated_posts FOR DELETE
USING (auth.uid() = user_id);
