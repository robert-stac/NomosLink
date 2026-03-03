import React from "react";
import { Navigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

// Ensure 'manager' is included in the type definition here
interface Props {
  children: React.ReactNode;
  allowedRoles: ("admin" | "manager" | "lawyer" | "clerk" | "accountant")[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { currentUser, logout } = useAppContext();

  // 1. If no user is found at all, send to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 2. Check if the user's role is allowed for this specific route
  const isAuthorized = allowedRoles.includes(currentUser.role);

  if (!isAuthorized) {
    // If the role exists but isn't allowed here, we show the message.
    // If the role is somehow undefined/null, we force a logout to clear the "ghost" session.
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

  // 3. Authorized and authenticated
  return <>{children}</>;
}