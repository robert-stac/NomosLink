import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

supabase.from('draft_requests').select('*').limit(1).then(console.log).catch(console.error);
