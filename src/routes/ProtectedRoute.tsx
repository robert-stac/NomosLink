import React from "react";
import { Navigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

interface Props {
  children: React.ReactNode;
  allowedRoles: ("admin" | "manager" | "lawyer" | "clerk" | "accountant")[];
  isInitialising?: boolean;
}

export default function ProtectedRoute({ children, allowedRoles, isInitialising = false }: Props) {
  const { currentUser, logout } = useAppContext();

  // 1. Wait for the app to finish reading localStorage before making any redirect decision
  if (isInitialising) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
        color: "#666",
        fontSize: "16px"
      }}>
        Loading NomosLink...
      </div>
    );
  }

  // 2. If no user is found after initialisation is complete, send to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 3. Check if the user's role is allowed for this specific route
  const isAuthorized = allowedRoles.includes(currentUser.role);

  if (!isAuthorized) {
    if (!currentUser.role) {
      logout();
      return <Navigate to="/login" replace />;
    }

    return (
      <div style={{
        padding: "50px",
        textAlign: "center",
        fontFamily: "sans-serif",
        color: "#333"
      }}>
        <h2>Access Denied</h2>
        <p>Your account role ({currentUser.role}) does not have permission to view this page.</p>
        <button
          onClick={logout}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px"
          }}
        >
          Return to Login
        </button>
      </div>
    );
  }

  // 4. Authorized and authenticated
  return <>{children}</>;
}