import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

console.log("Supabase URL initialized:", supabaseUrl);



// Use service role key for all DB operations — bypasses RLS entirely.
// This is safe for an internal private app not exposed to the public.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});