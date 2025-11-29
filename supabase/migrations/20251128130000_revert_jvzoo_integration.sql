-- supabase/migrations/20251128130000_revert_jvzoo_integration.sql

-- This migration reverts the database changes made for the JVZoo integration.
-- It drops the functions that were created to handle sales and lookups.

DROP FUNCTION IF EXISTS handle_jvzoo_sale(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_id_by_email(TEXT);
