import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

console.log("Testing with Service Key...");
const clientService = createClient(url, serviceKey);

const channelService = clientService.channel("test1").on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {});

channelService.subscribe((status, err) => {
  console.log("Service Key Status:", status, err);
  clientService.removeChannel(channelService);

  console.log("Testing with Anon Key...");
  const clientAnon = createClient(url, anonKey);
  const channelAnon = clientAnon.channel("test2").on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {});
  
  channelAnon.subscribe((status, err) => {
    console.log("Anon Key Status:", status, err);
    clientAnon.removeChannel(channelAnon);
    process.exit(0);
  });
});
