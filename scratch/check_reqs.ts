import { supabase } from './src/lib/supabaseClient';
async function test() {
  const { data, error } = await supabase.from('requisitions').select('*').limit(1);
  console.log('Data:', data);
  if (error) console.error('Error:', error);
}
test();
