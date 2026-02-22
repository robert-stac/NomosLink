import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAppContext } from "../context/AppContext";
import type { User } from "../context/AppContext";

export default function Login() {
  const { users, setCurrentUser, firmName } = useAppContext();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = `${firmName} - Login`;
  }, [firmName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const user: User | undefined = users.find(
      (u) => u.email === email.trim() && u.password === password.trim()
    );

    setTimeout(() => {
      setLoading(false);

      if (!user) {
        setError("Invalid email or password");
        return;
      }

      setCurrentUser(user);

      switch (user.role) {
        case "admin":
        case "accountant":
        case "manager":
          navigate("/");
          break;
        case "lawyer":
          navigate("/lawyer-dashboard");
          break;
        case "clerk":
          navigate("/clerk-dashboard");
          break;
        default:
          setError("Role not recognized");
      }
    }, 500);
  };

  // --- NEW: Reset Password Logic ---
  const handleRequestReset = async () => {
    const emailToReset = prompt("Enter your registered email address:");
    if (!emailToReset) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("A password reset link has been sent to your email!");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img
          src="/BCA-Logo.png" 
          alt={firmName}
          style={styles.logo}
        />

        <h2 style={styles.title}>{firmName}</h2>
        <p style={styles.subtitle}>Transaction Management System</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lawfirm.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.label}>Password</label>
              {/* Reset Link Trigger */}
              <span 
                onClick={handleRequestReset} 
                style={styles.forgotLink}
              >
                Forgot Password?
              </span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Processing..." : "Sign In"}
          </button>
        </form>

        <p style={styles.footer}>
          © {new Date().getFullYear()} {firmName}
        </p>
      </div>
    </div>
  );
}

/* =======================
    STYLES
======================= */

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0B1F3A 0%, #123C69 50%, #0B1F3A 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Segoe UI, Arial, sans-serif",
  },
  card: {
    width: 380,
    backgroundColor: "#ffffff",
    padding: "40px 35px",
    borderRadius: 16, // Smoother rounded corners
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
    textAlign: "center",
  },
  logo: {
    height: 90,
    width: 90,
    objectFit: "contain",
    marginBottom: 10,
    borderRadius: "50%",
  },
  title: {
    margin: "10px 0 4px",
    fontSize: 22,
    fontWeight: 700,
    color: "#0B1F3A",
    wordBreak: "break-word",
  },
  subtitle: {
    marginBottom: 30,
    fontSize: 13,
    color: "#555",
  },
  field: {
    marginBottom: 18,
    textAlign: "left",
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
  },
  forgotLink: {
    fontSize: 11,
    fontWeight: 700,
    color: "#123C69",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#f8fafc",
  },
  button: {
    width: "100%",
    padding: "14px",
    marginTop: 10,
    backgroundColor: "#0B1F3A",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  error: {
    backgroundColor: "#fdecea",
    color: "#b00020",
    padding: "10px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 15,
  },
  footer: {
    marginTop: 25,
    fontSize: 12,
    color: "#777",
  },
};