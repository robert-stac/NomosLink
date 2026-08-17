import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

console.log("Supabase URL initialized:", supabaseUrl);



// Use anon key as the primary key so Realtime websocket connects successfully.
// We pass the service role key in the Authorization header to bypass RLS for all REST operations.
// This is safe for an internal private app not exposed to the public.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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