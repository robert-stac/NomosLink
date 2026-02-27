import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppContext } from "./context/AppContext";

import Sidebar from "./components/Sidebar";

// Admin & Accountant Shared Pages
import Dashboard from "./pages/Dashboard";
import AccountantDashboard from "./pages/AccountantDashboard";
import ManagerDashboard from "./pages/ManagerDashboard"; 
import Clients from "./pages/Clients";
import Invoices from "./pages/invoices";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";

// Admin Only Pages
import Transactions from "./pages/Transactions";
import CourtCases from "./pages/CourtCases";
import Letters from "./pages/Letters";
import Lawyers from "./pages/Lawyers";
import Archive from "./pages/Archive";
import AddUser from "./pages/AddUser";

// Auth
import Login from "./pages/Login";

// Lawyer Pages
import LawyerDashboard from "./pages/Lawyer/LawyerDashboard";
import TransactionDetails from "./pages/Lawyer/TransactionDetails";
import LawyerCourtCaseDetails from "./pages/Lawyer/LawyerCourtCaseDetails";
import LawyerLetterDetails from "./pages/Lawyer/LawyerLetterDetails";

// Clerk Page
import ClerkDashboard from "./pages/Clerk/ClerkDashboard";

// Performance
import LawyerPerformanceDashboard from "./pages/performance/LawyerPerformanceDashboard";

// Route Guard
import ProtectedRoute from "./routes/ProtectedRoute";
import ResetPassword from "./components/ResetPassword";

/* =======================
    OFFLINE MONITOR HOOK
======================= */
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/* =======================
    ADMIN/ACCOUNTANT/MANAGER LAYOUT
======================= */
function AdminLayout({ children, isOnline }: { children: React.ReactNode; isOnline: boolean }) {
  return (
    <div style={{ display: "flex", paddingTop: isOnline ? 0 : "40px" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 20, backgroundColor: "#f4f6f8", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}

/* =======================
    APP COMPONENT
======================= */
export default function App() {
  const { currentUser } = useAppContext();
  const isOnline = useOnlineStatus();

  // Helper to determine the main landing page for Management roles
  const getDashboardComponent = () => {
    if (currentUser?.role === "accountant") return <AccountantDashboard />;
    if (currentUser?.role === "manager") return <ManagerDashboard />;
    return <Dashboard />;
  };

  // Helper to get the correct redirect path based on user role
  const getRedirectPath = () => {
    if (!currentUser) return "/login";
    if (["admin", "accountant", "manager"].includes(currentUser.role)) return "/";
    if (currentUser.role === "lawyer") return "/lawyer-dashboard";
    if (currentUser.role === "clerk") return "/clerk-dashboard";
    return "/login";
  };

  return (
    <BrowserRouter>
      {/* OFFLINE BANNER */}
      {!isOnline && (
        <div style={bannerStyles}>
          <span style={{ marginRight: 8 }}>📡</span>
          <strong>NomosLink Offline:</strong> Working locally. Data will sync when connection returns.
        </div>
      )}

      <Routes>
        {/* ================= LOGIN ================= */}
        {/* If logged in, don't show login page; redirect to dashboard instead */}
        <Route 
          path="/login" 
          element={currentUser ? <Navigate to={getRedirectPath()} /> : <Login />} 
        />

        {/* ================= SHARED ADMIN/ACCOUNTANT/MANAGER ROUTES ================= */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={["admin", "accountant", "manager"]}>
              <AdminLayout isOnline={isOnline}>
                {getDashboardComponent()}
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <ProtectedRoute allowedRoles={["admin", "accountant", "manager"]}>
              <AdminLayout isOnline={isOnline}>
                <Clients />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute allowedRoles={["admin", "accountant", "manager"]}>
              <AdminLayout isOnline={isOnline}>
                <Invoices />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["admin", "accountant", "manager"]}>
              <AdminLayout isOnline={isOnline}>
                <Reports />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute allowedRoles={["admin", "accountant"]}>
              <AdminLayout isOnline={isOnline}>
                <Expenses />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* ================= ADMIN & MANAGER SHARED ACCESS ================= */}
        <Route
          path="/transactions"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager"]}>
              <AdminLayout isOnline={isOnline}>
                <Transactions />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/court-cases"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager"]}>
              <AdminLayout isOnline={isOnline}>
                <CourtCases />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/letters"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager"]}>
              <AdminLayout isOnline={isOnline}>
                <Letters />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* ================= ADMIN ONLY ROUTES ================= */}
        <Route
          path="/lawyers"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout isOnline={isOnline}>
                <Lawyers />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/archive"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager"]}>
              <AdminLayout isOnline={isOnline}>
                <Archive />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/AddUser"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout isOnline={isOnline}>
                <AddUser />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* ================= LAWYER ROUTES ================= */}
        <Route
          path="/lawyer-dashboard"
          element={
            <ProtectedRoute allowedRoles={["lawyer", "clerk", "manager"]}>
              <div style={{ paddingTop: isOnline ? 0 : "40px" }}>
                <LawyerDashboard />
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/lawyer/transactions/:id"
          element={
            <ProtectedRoute allowedRoles={["lawyer", "clerk", "manager"]}>
              <div style={{ paddingTop: isOnline ? 0 : "40px" }}>
                <TransactionDetails />
              </div>
            </ProtectedRoute>
          }
        />

        <Route 
          path="/lawyer/cases/:id" 
          element={
            <ProtectedRoute allowedRoles={["lawyer", "clerk", "manager"]}>
              <div style={{ paddingTop: isOnline ? 0 : "40px" }}>
                <LawyerCourtCaseDetails />
              </div>
            </ProtectedRoute>
          } 
        />
          
        <Route 
          path="/lawyer/letters/:id" 
          element={
            <ProtectedRoute allowedRoles={["lawyer", "clerk", "manager"]}>
              <div style={{ paddingTop: isOnline ? 0 : "40px" }}>
                <LawyerLetterDetails />
              </div>
            </ProtectedRoute>
          } 
        />

        {/* ================= CLERK ROUTES ================= */}
        <Route
          path="/clerk-dashboard"
          element={
            <ProtectedRoute allowedRoles={["clerk"]}>
              <div style={{ paddingTop: isOnline ? 0 : "40px" }}>
                <ClerkDashboard />
              </div>
            </ProtectedRoute>
          }
        />
        
        {/* ================= PERFORMANCE ================= */}
        <Route
          path="/performance"
          element={
            <ProtectedRoute allowedRoles={["admin", "lawyer"]}>
              <AdminLayout isOnline={isOnline}>
                <LawyerPerformanceDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ================= FALLBACK ================= */}
        {/* This ensures any random URL takes the user to their specific starting page or Login */}
        <Route
          path="*"
          element={<Navigate to={getRedirectPath()} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

/* =======================
    BANNER STYLES
======================= */
const bannerStyles: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  backgroundColor: "#b91c1c",
  color: "white",
  textAlign: "center",
  padding: "10px",
  fontSize: "14px",
  zIndex: 3000,
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};