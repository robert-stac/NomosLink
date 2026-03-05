// Called from your app whenever a notification needs to be pushed
// to a device that may have the app closed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Web push implementation for Deno
// Uses the Web Push Protocol with VAPID authentication
async function sendWebPush(
  subscription: any,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
) {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid subscription object");
  }

  // Import web-push compatible library for Deno
  const webpush = await import("https://esm.sh/web-push@3.6.6");

  webpush.default.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  await webpush.default.sendNotification(subscription, payload);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { userId, title, body, url } = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "userId, title, and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:odoirbrt@gmail.com";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch this user's push subscription from the database
    const { data: subData, error: subError } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("userId", userId)
      .single();

    if (subError || !subData) {
      return new Response(
        JSON.stringify({ error: "No subscription found for this user", details: subError }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const subscription = JSON.parse(subData.subscription);
    const payload = JSON.stringify({ title, body, url: url || "/" });

    await sendWebPush(subscription, payload, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT);

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (err: any) {
    console.error("Push failed:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Push notification failed" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});