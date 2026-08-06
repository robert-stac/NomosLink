import { createClient } from "@supabase/supabase-js";

try {
  const supabase = createClient("https://wxqpryxgsayeikahlabl.supabase.co", undefined);
  console.log("Success");
} catch (e) {
  console.log("Error:", e.message);
}
