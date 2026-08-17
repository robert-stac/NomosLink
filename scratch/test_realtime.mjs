import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envStr = fs.readFileSync(".env", "utf8");
const envVars = Object.fromEntries(
  envStr.split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
    .map(line => line.split("="))
);

const url = envVars.VITE_SUPABASE_URL;
const anonKey = envVars.VITE_SUPABASE_ANON_KEY;
const serviceKey = envVars.VITE_SUPABASE_SERVICE_KEY;

async function runTest() {
  console.log("Testing with Service Key client, but anonKey in realtime params...");
  const clientMixed = createClient(url, serviceKey, {
    realtime: {
      params: {
        apikey: anonKey
      }
    }
  });
  
  const channel = clientMixed.channel("test_mixed");
  
  await new Promise((resolve) => {
    channel.subscribe((status, err) => {
      console.log("Mixed Key Status:", status, err);
      if (status !== 'SUBSCRIBING') {
        clientMixed.removeChannel(channel);
        resolve();
      }
    });
  });
  
  process.exit(0);
}

runTest();
