import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Extend the Window interface to include a 'supabase' property for debugging
declare global {
  interface Window {
    supabase: typeof supabase;
  }
}

if (typeof window !== "undefined") {
  window.supabase = supabase;
}
