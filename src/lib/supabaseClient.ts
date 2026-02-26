import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This console.log will help us verify the link is working in the browser
console.log("Supabase URL initialized:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'nomoslink-auth-key', // Unique key for this project
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Add this to help with the locking issue:
    storage: window.localStorage 
  }
});