import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function Sidebar() {
  const { currentUser, logout, firmName, syncToCloud } = useAppContext();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false); // Mobile toggle state
  const [isSyncing, setIsSyncing] = useState(false); // Sync animation state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed.toString());
  }, [isCollapsed]);

  if (!currentUser) return null;

  const role = currentUser.role;

  const isAdmin = role === "admin";
  const isAccountant = role === "accountant";
  const isManager = role === "manager";
  const isManagingPartner = role === "managing_partner";
  const isStaff = isAdmin || isAccountant || isManager || isManagingPartner;

  const menuItems = [
    { label: "Dashboard", path: "/", icon: "📊", show: isStaff },
    { label: "Transactions", path: "/transactions", icon: "💸", show: isAdmin || isManager || isManagingPartner },
    { label: "Court Cases", path: "/court-cases", icon: "⚖️", show: isAdmin || isManager || isManagingPartner },
    { label: "Court Calendar", path: "/court-calendar", icon: "📅", show: isAdmin || isManager || isManagingPartner || isAccountant },
    { label: "Letters", path: "/letters", icon: "✉️", show: isAdmin || isManager || isManagingPartner },
    { label: "Clients", path: "/clients", icon: "👥", show: isStaff },
    { label: "Land Titles", path: "/land-titles", icon: "📜", show: isAdmin || isManager || isManagingPartner },
    { label: "Invoices", path: "/invoices", icon: "🧾", show: isStaff },
    { label: "Expenses", path: "/expenses", icon: "📉", show: isAccountant },
    { label: "Requisitions", path: "/requisitions", icon: "📝", show: true },
    { label: "Reports", path: "/reports", icon: "📈", show: isStaff },
    { label: "Performance", path: "/performance", icon: "🏆", show: isAdmin },
    { label: "Archive", path: "/archive", icon: "📦", show: isAdmin || isManager || isManagingPartner },
    { label: "Add User/Staff", path: "/AddUser", icon: "➕", show: isAdmin },
    { label: "Lawyers List", path: "/lawyers", icon: "👨‍⚖️", show: isAdmin },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncToCloud();
    // Keep the "Syncing..." state visible for a moment so the user knows it worked
    setTimeout(() => setIsSyncing(false), 500);
  };

  const currentWidth = isOpen ? "260px" : (isCollapsed ? "80px" : "260px");

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
        width: currentWidth,
      }} className="mobile-sidebar group">

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

        <div style={{ ...sidebarStyles.header, padding: isCollapsed && !isOpen ? "30px 10px" : "30px 20px" }} className="relative flex items-center justify-between">
          <div className="flex-1 overflow-hidden">
            {(!isCollapsed || isOpen) ? (
              <>
                <h2 style={sidebarStyles.logo} className="truncate">{firmName}</h2>
                <div style={sidebarStyles.userBadge}>
                  <span style={sidebarStyles.roleTag}>{role.toUpperCase()}</span>
                  <p style={sidebarStyles.userName} className="truncate">{currentUser.name}</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-xl font-black text-[#38bdf8]">{firmName.charAt(0)}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex text-[#38bdf8] hover:text-white transition-colors cursor-pointer w-8 h-8 items-center justify-center rounded-full bg-[#1e293b] flex-shrink-0 absolute -right-4 shadow-md z-50 border border-[#334155]"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? "❯" : "❮"}
          </button>
        </div>

        <nav style={sidebarStyles.nav}>
          {menuItems.map((item) => item.show && (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)} // Close menu on link click
              style={{
                ...sidebarStyles.link,
                justifyContent: (isCollapsed && !isOpen) ? "center" : "flex-start",
                padding: (isCollapsed && !isOpen) ? "12px 0" : "12px 15px",
                backgroundColor: location.pathname === item.path ? "#1e293b" : "transparent",
                color: location.pathname === item.path ? "#38bdf8" : "#cbd5e1",
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <span style={{ marginRight: (isCollapsed && !isOpen) ? 0 : 12, fontSize: (isCollapsed && !isOpen) ? "20px" : "16px" }}>{item.icon}</span>
              {(!isCollapsed || isOpen) && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* 4. SYNC TO CLOUD BUTTON */}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          title="Sync to Cloud"
          style={{
            ...sidebarStyles.syncBtn,
            justifyContent: (isCollapsed && !isOpen) ? "center" : "flex-start",
            padding: (isCollapsed && !isOpen) ? "12px 0" : "12px 15px",
            opacity: isSyncing ? 0.7 : 1,
            cursor: isSyncing ? "not-allowed" : "pointer"
          }}
        >
          <span style={{ marginRight: (isCollapsed && !isOpen) ? 0 : 12, fontSize: (isCollapsed && !isOpen) ? "20px" : "16px" }}>{isSyncing ? "⏳" : "☁️"}</span>
          {(!isCollapsed || isOpen) && <span className="truncate">{isSyncing ? "Syncing..." : "Sync to Cloud"}</span>}
        </button>

        {/* LOGOUT BUTTON */}
        <button onClick={logout} title="Logout" style={{
          ...sidebarStyles.logoutBtn,
          justifyContent: (isCollapsed && !isOpen) ? "center" : "flex-start",
          padding: (isCollapsed && !isOpen) ? "12px 0" : "12px 15px",
        }}>
          <span style={{ marginRight: (isCollapsed && !isOpen) ? 0 : 12, fontSize: (isCollapsed && !isOpen) ? "20px" : "16px" }}>🚪</span>
          {(!isCollapsed || isOpen) && <span>Logout</span>}
        </button>

        {/* 5. VERSION NUMBER */}
        {(!isCollapsed || isOpen) && (
          <div style={{ ...sidebarStyles.versionBadge, color: "white", fontSize: "12px", fontStyle: "italic" }}>
            v1.11.5
          </div>
        )}
      </div>
    </>
  );
}

const sidebarStyles = {
  container: {
    backgroundColor: "#0B1F3A",
    color: "white",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    position: "fixed" as const, // Changed to fixed for mobile slide-in
    top: 0,
    zIndex: 50,
    transition: "all 0.3s ease-in-out", // Smooth slide transition
    boxShadow: "4px 0 10px rgba(0,0,0,0.1)",
  },
  header: {
    borderBottom: "1px solid #1e293b",
    transition: "padding 0.3s",
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
    textDecoration: "none",
    borderRadius: "8px",
    marginBottom: "5px",
    fontSize: "14px",
    transition: "all 0.2s",
  },
  syncBtn: {
    margin: "10px 10px 0 10px",
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    color: "#38bdf8",
    borderRadius: "8px",
    textAlign: "left" as const,
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    fontWeight: "bold",
    transition: "all 0.2s",
  },
  logoutBtn: {
    margin: "10px 10px 20px 10px",
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
    transition: "all 0.2s",
  },
  versionBadge: {
    padding: "10px 15px 20px 15px",
    fontSize: "10px",
    color: "#475569",
    textAlign: "center" as const,
    opacity: 0.7,
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
  },
};