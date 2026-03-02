import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function Sidebar() {
  const { currentUser, logout, firmName } = useAppContext();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false); // Mobile toggle state

  if (!currentUser) return null;

  const role = currentUser.role;

  const isAdmin = role === "admin";
  const isAccountant = role === "accountant";
  const isManager = role === "manager";
  const isStaff = isAdmin || isAccountant || isManager;

  const menuItems = [
    { label: "Dashboard", path: "/", icon: "📊", show: isStaff },
    { label: "Clients", path: "/clients", icon: "👥", show: isStaff },
    { label: "Transactions", path: "/transactions", icon: "💸", show: isAdmin || isManager },
    { label: "Court Cases", path: "/court-cases", icon: "⚖️", show: isAdmin || isManager },
    { label: "Letters", path: "/letters", icon: "✉️", show: isAdmin || isManager },
    { label: "Invoices", path: "/invoices", icon: "🧾", show: isStaff },
    { label: "Expenses", path: "/expenses", icon: "📉", show: isAccountant },
    { label: "Reports", path: "/reports", icon: "📈", show: isStaff },
    { label: "Performance", path: "/performance", icon: "🏆", show: isAdmin },
    { label: "Lawyers List", path: "/lawyers", icon: "👨‍⚖️", show: isAdmin },
    { label: "Archive", path: "/archive", icon: "📦", show: isAdmin || isManager },
    { label: "Add User/Staff", path: "/AddUser", icon: "➕", show: isAdmin },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* 1. MOBILE HAMBURGER BUTTON */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-[60] bg-[#0B1F3A] text-white p-3 rounded-xl shadow-lg"
      >
        {isOpen ? "✕" : "☰"}
      </button>

      {/* 2. MOBILE OVERLAY (Backdrop) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[40] md:hidden"
        />
      )}

      {/* 3. SIDEBAR CONTAINER */}
      <div style={{
        ...sidebarStyles.container,
        left: isOpen ? "0" : "-260px", // Slide logic
      }} className="mobile-sidebar">
        
        <style>{`
          nav::-webkit-scrollbar {
            display: none;
          }
          /* Desktop override */
          @media (min-width: 768px) {
            .mobile-sidebar {
              left: 0 !important;
              position: sticky !important;
            }
          }
        `}</style>

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
              onClick={() => setIsOpen(false)} // Close menu on link click
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
    </>
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
    position: "fixed" as const, // Changed to fixed for mobile slide-in
    top: 0,
    zIndex: 50,
    transition: "left 0.3s ease-in-out", // Smooth slide transition
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
    msOverflowStyle: "none" as const,
    scrollbarWidth: "none" as const,
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