ALTER TABLE generated_posts
ALTER COLUMN content TYPE JSONB
USING content::jsonb;