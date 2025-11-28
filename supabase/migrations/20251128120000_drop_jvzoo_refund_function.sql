-- supabase/migrations/20251128120000_drop_jvzoo_refund_function.sql

-- Drop the handle_jvzoo_refund function as the product is non-refundable.
DROP FUNCTION IF EXISTS handle_jvzoo_refund(TEXT, TEXT);
