import React from "react";
import { Navigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

// Ensure 'manager' is included in the type definition here
interface Props {
  children: React.ReactNode;
  allowedRoles: ("admin" | "manager" | "lawyer" | "clerk" | "accountant")[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { currentUser } = useAppContext();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <div style={{ padding: 20 }}>Access Denied: Role not recognized for this route.</div>;
  }

  return <>{children}</>;
}