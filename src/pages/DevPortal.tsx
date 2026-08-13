import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// ====================================================
//  SECRET SUPER ADMIN PORTAL — Access via /dev-portal
//  This page is password-protected by a master password
//  known only to the system developer.
// ====================================================

const MASTER_PASSWORD = "Jamilasonko1,";

type SubscriptionData = {
  id: string;
  status: string;
  expiry_date: string;
  last_renewed_at: string | null;
  notes: string | null;
};

export default function DevPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [serverTime, setServerTime] = useState<string>("");

  // For manual override
  const [customDate, setCustomDate] = useState("");

  const handleLogin = () => {
    if (passwordInput === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
      loadSubscription();
    } else {
      setPasswordError(true);
      setPasswordInput("");
    }
  };

  const loadSubscription = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription")
      .select("*")
      .eq("id", "nomoslink_bca")
      .single();

    if (!error && data) {
      setSubscription(data);
    }

    // Also fetch server time
    const { data: timeData } = await supabase.rpc("get_server_time");
    if (timeData) setServerTime(new Date(timeData).toLocaleString("en-GB"));

    setLoading(false);
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // Renew subscription: adds 30 days from MAX(today, current expiry)
  const handleRenew = async () => {
    setLoading(true);
    try {
      const { data: timeData } = await supabase.rpc("get_server_time");
      const serverNow = timeData ? new Date(timeData) : new Date();

      const currentExpiry = subscription?.expiry_date
        ? new Date(subscription.expiry_date)
        : serverNow;

      // Use the LATER of today or the current expiry
      const base = serverNow > currentExpiry ? serverNow : currentExpiry;

      // Add 30 days
      const newExpiry = new Date(base);
      newExpiry.setDate(newExpiry.getDate() + 30);

      const newExpiryStr = newExpiry.toISOString().split("T")[0];

      const { error } = await supabase
        .from("subscription")
        .update({
          status: "active",
          expiry_date: newExpiryStr,
          last_renewed_at: new Date().toISOString(),
          notes: `Renewed on ${serverNow.toLocaleDateString("en-GB")}`,
        })
        .eq("id", "nomoslink_bca");

      if (error) {
        showMessage(`Failed to renew: ${error.message}`, "error");
      } else {
        showMessage(`✅ Subscription renewed! New expiry: ${newExpiry.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, "success");
        loadSubscription();
      }
    } catch (err: any) {
      showMessage(`Unexpected error: ${err.message}`, "error");
    }
    setLoading(false);
  };

  // Set a fully custom expiry date
  const handleSetCustomDate = async () => {
    if (!customDate) return showMessage("Please select a date first.", "error");
    setLoading(true);

    const { error } = await supabase
      .from("subscription")
      .update({
        status: "active",
        expiry_date: customDate,
        last_renewed_at: new Date().toISOString(),
        notes: `Manually set to ${customDate}`,
      })
      .eq("id", "nomoslink_bca");

    if (error) {
      showMessage(`Failed: ${error.message}`, "error");
    } else {
      showMessage(`✅ Expiry date set to ${new Date(customDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, "success");
      setCustomDate("");
      loadSubscription();
    }
    setLoading(false);
  };

  // Emergency lock / unlock
  const handleToggleLock = async (lock: boolean) => {
    setLoading(true);
    const { error } = await supabase
      .from("subscription")
      .update({ status: lock ? "locked" : "active" })
      .eq("id", "nomoslink_bca");

    if (error) {
      showMessage(`Failed: ${error.message}`, "error");
    } else {
      showMessage(lock ? "🔒 System locked." : "🔓 System unlocked.", lock ? "error" : "success");
      loadSubscription();
    }
    setLoading(false);
  };

  // Compute days remaining from current expiry
  const getDaysRemaining = () => {
    if (!subscription?.expiry_date) return null;
    const expiry = new Date(subscription.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const days = getDaysRemaining();

  // =================== PASSWORD GATE ===================
  if (!isAuthenticated) {
    return (
      <div style={{
        display: "flex", height: "100vh", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: "Inter, system-ui, sans-serif", padding: 24
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20, padding: "40px 48px", maxWidth: 400, width: "100%",
          backdropFilter: "blur(12px)"
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
              Developer Portal
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
              NomosLink · Restricted Access
            </p>
          </div>

          <input
            type="password"
            placeholder="Enter master password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.07)", border: `1px solid ${passwordError ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
              color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
              marginBottom: passwordError ? 8 : 16
            }}
          />
          {passwordError && (
            <p style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>
              Incorrect password. Try again.
            </p>
          )}

          <button
            onClick={handleLogin}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff", fontWeight: 800, fontSize: 14, border: "none",
              cursor: "pointer", transition: "opacity 0.2s"
            }}
          >
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  // =================== MAIN PORTAL ===================
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "40px 24px"
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>🛡️</span>
            <div>
              <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
                Developer Portal
              </h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
                NomosLink Subscription Management
              </p>
            </div>
          </div>
          {serverTime && (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 8 }}>
              🌐 Server time: {serverTime}
            </p>
          )}
        </div>

        {/* Toast */}
        {message && (
          <div style={{
            padding: "14px 20px", borderRadius: 12, marginBottom: 24, fontSize: 14, fontWeight: 600,
            background: message.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: message.type === "success" ? "#6ee7b7" : "#fca5a5"
          }}>
            {message.text}
          </div>
        )}

        {/* Status Card */}
        {subscription && (
          <div style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: "28px 32px", marginBottom: 24
          }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 20px" }}>
              Current Subscription Status
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "0 0 6px" }}>Status</p>
                <span style={{
                  display: "inline-block", padding: "4px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800,
                  background: subscription.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  color: subscription.status === "active" ? "#6ee7b7" : "#fca5a5",
                  border: `1px solid ${subscription.status === "active" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`
                }}>
                  {subscription.status === "active" ? "🟢 Active" : "🔴 Locked"}
                </span>
              </div>

              <div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "0 0 6px" }}>Expiry Date</p>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>
                  {new Date(subscription.expiry_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>

              <div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "0 0 6px" }}>Days Remaining</p>
                <p style={{
                  color: days === null ? "#fff" : days <= 0 ? "#f87171" : days <= 5 ? "#fbbf24" : "#6ee7b7",
                  fontWeight: 800, fontSize: 24, margin: 0
                }}>
                  {days === null ? "—" : days <= 0 ? `${Math.abs(days)} days overdue` : `${days} days`}
                </p>
              </div>

              <div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "0 0 6px" }}>Last Renewed</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, margin: 0 }}>
                  {subscription.last_renewed_at
                    ? new Date(subscription.last_renewed_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : "—"}
                </p>
              </div>
            </div>

            {subscription.notes && (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 20, marginBottom: 0, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16 }}>
                Note: {subscription.notes}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Renew Button */}
          <div style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 20, padding: "24px 28px"
          }}>
            <h3 style={{ color: "#a5b4fc", fontWeight: 800, fontSize: 15, margin: "0 0 8px" }}>
              💳 Renew Subscription (+30 Days)
            </h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
              Adds 30 days from whichever is later — today or the current expiry date. Use this after the client pays.
            </p>
            <button
              onClick={handleRenew}
              disabled={loading}
              style={{
                padding: "14px 28px", borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff", fontWeight: 800, fontSize: 14, border: "none",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? "Processing..." : "Renew Now (+30 Days)"}
            </button>
          </div>

          {/* Custom Date */}
          <div style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: "24px 28px"
          }}>
            <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15, margin: "0 0 8px" }}>
              📅 Set Custom Expiry Date
            </h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
              Manually set an exact expiry date. Use this for special arrangements.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                style={{
                  padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 14, outline: "none"
                }}
              />
              <button
                onClick={handleSetCustomDate}
                disabled={loading || !customDate}
                style={{
                  padding: "12px 24px", borderRadius: 12,
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                  opacity: (loading || !customDate) ? 0.5 : 1
                }}
              >
                Set Date
              </button>
            </div>
          </div>

          {/* Emergency Lock / Unlock */}
          <div style={{
            background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 20, padding: "24px 28px"
          }}>
            <h3 style={{ color: "#fca5a5", fontWeight: 800, fontSize: 15, margin: "0 0 8px" }}>
              ⚠️ Emergency Controls
            </h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
              Instantly lock or unlock the system regardless of the expiry date. Use with caution.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => handleToggleLock(false)}
                disabled={loading}
                style={{
                  padding: "12px 24px", borderRadius: 12,
                  background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
                  color: "#6ee7b7", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1
                }}
              >
                🔓 Unlock System
              </button>
              <button
                onClick={() => handleToggleLock(true)}
                disabled={loading}
                style={{
                  padding: "12px 24px", borderRadius: 12,
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1
                }}
              >
                🔒 Lock System
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 12, textAlign: "center", marginTop: 40 }}>
          NomosLink Developer Portal · Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
