import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAppContext } from "../context/AppContext";

interface SubscriptionGateProps {
  children: React.ReactNode;
}

type SubscriptionStatus = "loading" | "active" | "locked" | "error";

export default function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { currentUser } = useAppContext();
  const isAccountant = currentUser?.role === "accountant";
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);

  const checkSubscription = async () => {
    try {
      // 1. Fetch the subscription row
      const { data, error } = await supabase
        .from("subscription")
        .select("*")
        .eq("id", "nomoslink_bca")
        .single();

      if (error || !data) {
        // If we can't reach the table, fail open so they don't get randomly locked out
        // due to a network blip. But log it so you know.
        console.warn("[SubscriptionGate] Could not fetch subscription:", error?.message);
        setStatus("active");
        return;
      }

      // 2. Get the TRUE server time from Supabase (immune to local clock tampering)
      const { data: timeData } = await supabase.rpc("get_server_time");
      const serverNow = timeData ? new Date(timeData) : new Date();

      const expiry = new Date(data.expiry_date);
      // Compare date-only (ignore time)
      const serverDateStr = serverNow.toISOString().split("T")[0];
      const serverDate = new Date(serverDateStr);
      const diff = Math.ceil((expiry.getTime() - serverDate.getTime()) / (1000 * 60 * 60 * 24));

      setExpiryDate(data.expiry_date);
      setDaysLeft(diff);

      if (diff < 0 || data.status === "locked") {
        setStatus("locked");
      } else {
        setStatus("active");
        // Show warning banner if 5 days or fewer remain
        if (diff <= 5) {
          setShowWarning(true);
        }
      }
    } catch (err) {
      console.error("[SubscriptionGate] Unexpected error:", err);
      // Fail open on unexpected errors
      setStatus("active");
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  // ---- LOADING ----
  if (status === "loading") {
    return (
      <div style={{
        display: "flex", height: "100vh", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: "Inter, system-ui, sans-serif", gap: 16
      }}>
        <div style={{ width: 48, height: 48, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>Verifying subscription...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---- LOCKED ----
  if (status === "locked") {
    return (
      <div style={{
        display: "flex", height: "100vh", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1a2e 100%)",
        fontFamily: "Inter, system-ui, sans-serif", padding: 24,
        position: "fixed", inset: 0, zIndex: 9999
      }}>
        {/* Glowing lock icon */}
        <div style={{
          width: 100, height: 100, borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 32, fontSize: 44,
          boxShadow: "0 0 60px rgba(239, 68, 68, 0.2)"
        }}>
          🔒
        </div>

        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "0 0 12px", textAlign: "center", letterSpacing: "-0.5px" }}>
          Subscription Expired
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, margin: "0 0 8px", textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
          Your NomosLink subscription has expired. Access to the system has been temporarily suspended.
        </p>
        {expiryDate && (
          <p style={{ color: "rgba(239,68,68,0.7)", fontSize: 13, margin: "0 0 40px", textAlign: "center" }}>
            Expired on: <strong style={{ color: "#f87171" }}>{new Date(expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>
          </p>
        )}

        <div style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: "20px 28px", maxWidth: 380, textAlign: "center"
        }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0, lineHeight: 1.7 }}>
            Please contact your system administrator to renew your subscription and restore access.
          </p>
        </div>

        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, marginTop: 48 }}>
          NomosLink · Buwembo & Company Advocates
        </p>
      </div>
    );
  }

  // ---- ACTIVE (with optional warning banner) ----
  return (
    <>
      {showWarning && isAccountant && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 4000,
          background: "linear-gradient(90deg, #d97706, #b45309)",
          color: "#fff", textAlign: "center", padding: "10px 16px",
          fontSize: 13, fontWeight: 600, fontFamily: "Inter, system-ui, sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: "0 2px 12px rgba(0,0,0,0.2)"
        }}>
          <span>⚠️</span>
          <span>
            Subscription expires in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>
            {" "}({new Date(expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}).
            Please renew soon.
          </span>
          <button
            onClick={() => setShowWarning(false)}
            style={{ marginLeft: 16, background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "2px 10px", cursor: "pointer", fontSize: 12 }}
          >
            Dismiss
          </button>
        </div>
      )}
      {children}
    </>
  );
}
