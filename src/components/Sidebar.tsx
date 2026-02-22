import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function Sidebar() {
  const { currentUser, logout, firmName } = useAppContext();
  const location = useLocation();

  if (!currentUser) return null;

  const role = currentUser.role;

  // Define who sees what
  const isAdmin = role === "admin";
  const isAccountant = role === "accountant";
  const isManager = role === "manager";
  const isStaff = isAdmin || isAccountant || isManager;

  const menuItems = [
    // Dashboard is common for Admin, Accountant, and Manager
    { label: "Dashboard", path: "/", icon: "📊", show: isStaff },
    
    // Oversight & Management
    { label: "Clients", path: "/clients", icon: "👥", show: isStaff },
    { label: "Transactions", path: "/transactions", icon: "💸", show: isAdmin || isManager },
    { label: "Court Cases", path: "/court-cases", icon: "⚖️", show: isAdmin || isManager },
    { label: "Letters", path: "/letters", icon: "✉️", show: isAdmin || isManager },
    
    // Financials
    { label: "Invoices", path: "/invoices", icon: "🧾", show: isStaff },
    { label: "Expenses", path: "/expenses", icon: "📉", show: isAccountant },
    
    // Reporting & Performance
    { label: "Reports", path: "/reports", icon: "📈", show: isStaff },
    { label: "Performance", path: "/performance", icon: "🏆", show: isAdmin },
    
    // Admin Only - System Settings
    { label: "Lawyers List", path: "/lawyers", icon: "👨‍⚖️", show: isAdmin },
    { label: "Archive", path: "/archive", icon: "📦", show: isAdmin || isManager },
    { label: "Add User/Staff", path: "/AddUser", icon: "➕", show: isAdmin },
  ];

  return (
    <div style={sidebarStyles.container}>
      <div style={sidebarStyles.header}>
        <h2 style={sidebarStyles.logo}>{firmName}</h2>
        <div style={sidebarStyles.userBadge}>
          <span style={sidebarStyles.roleTag}>{role.toUpperCase()}</span>
          <p style={sidebarStyles.userName}>{currentUser.name}</p>
        </div>
      </div>

      <nav style={sidebarStyles.nav}>
        {menuItems.map((item) => item.show && (
          <Link
            key={item.path}
            to={item.path}
            style={{
              ...sidebarStyles.link,
              backgroundColor: location.pathname === item.path ? "#1e293b" : "transparent",
              color: location.pathname === item.path ? "#38bdf8" : "#cbd5e1",
            }}
          >
            <span style={{ marginRight: 12 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <button onClick={logout} style={sidebarStyles.logoutBtn}>
        <span style={{ marginRight: 12 }}>🚪</span> Logout
      </button>
    </div>
  );
}

const sidebarStyles = {
  container: {
    width: "260px",
    backgroundColor: "#0B1F3A",
    color: "white",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    position: "sticky" as const,
    top: 0,
    boxShadow: "4px 0 10px rgba(0,0,0,0.1)",
  },
  header: {
    padding: "30px 20px",
    borderBottom: "1px solid #1e293b",
  },
  logo: {
    fontSize: "18px",
    fontWeight: "bold",
    margin: 0,
    color: "#38bdf8",
    letterSpacing: "0.5px",
  },
  userBadge: {
    marginTop: "15px",
  },
  roleTag: {
    fontSize: "9px",
    backgroundColor: "#38bdf8",
    color: "#0B1F3A",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: "bold",
  },
  userName: {
    margin: "5px 0 0 0",
    fontSize: "14px",
    opacity: 0.9,
  },
  nav: {
    flex: 1,
    padding: "20px 10px",
    overflowY: "auto" as const,
  },
  link: {
    display: "flex",
    alignItems: "center",
    padding: "12px 15px",
    textDecoration: "none",
    borderRadius: "8px",
    marginBottom: "5px",
    fontSize: "14px",
    transition: "all 0.2s",
  },
  logoutBtn: {
    margin: "20px 10px",
    padding: "12px 15px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    color: "#ef4444",
    borderRadius: "8px",
    cursor: "pointer",
    textAlign: "left" as const,
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    fontWeight: "bold",
  },
};