-- Add index to the user_id foreign key in the generated_posts table
CREATE INDEX idx_generated_posts_user_id
ON public.generated_posts (user_id);

-- Add index to the user_id foreign key in the oauth_state table
CREATE INDEX idx_oauth_state_user_id
ON public.oauth_state (user_id);
