import { useMemo, useState } from "react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  BarElement
} from "chart.js";
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "../components/NotificationBell";

ChartJS.register(ArcElement, Tooltip, Legend, Title, CategoryScale, LinearScale, BarElement);

/* =======================
   MAIN DASHBOARD
======================= */
export default function Dashboard() {
  const {
    transactions, courtCases, letters, tasks, currentUser, expenses, landTitles,
    deleteTask, notifications, markNotificationsAsRead
  } = useAppContext();
  const navigate = useNavigate();

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showOnlyStagnant, setShowOnlyStagnant] = useState(false);
  const [sortTasksBy, setSortTasksBy] = useState("newest");

  const isStagnant = (item: any) => {
    let lastNoteDate: Date;
    if (!item.progressNotes || item.progressNotes.length === 0) {
      lastNoteDate = new Date(item.date || item.createdAt || new Date());
    } else {
      const lastNote = item.progressNotes[item.progressNotes.length - 1];
      // Robust parsing for legacy DD/MM/YYYY and new ISO formats
      if (lastNote.date.includes('/')) {
        const [d, m, y] = lastNote.date.split('/');
        lastNoteDate = new Date(`${y}-${m}-${d}`);
      } else {
        lastNoteDate = new Date(lastNote.date);
      }
    }

    const twentyOneDaysAgo = new Date();
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);
    return lastNoteDate < twentyOneDaysAgo;
  };

  const needsFeedback = (item: any) => {
    if (item.archived || item.status === 'Completed') return false;
    
    const lastFeedback = item.lastClientFeedbackDate 
      ? new Date(item.lastClientFeedbackDate)
      : new Date(item.date || item.createdAt || new Date());
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return lastFeedback < fourteenDaysAgo;
  };

  const getDaysRemaining = (dateString: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateString); target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { text: "Today", urgent: true };
    if (diffDays === 1) return { text: "Tomorrow", urgent: true };
    if (diffDays < 0) return { text: "Past Due", urgent: true };
    return { text: `In ${diffDays} days`, urgent: false };
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Permanently delete this completed task?")) {
      deleteTask(taskId);
      if (selectedTask?.id === taskId) setSelectedTask(null);
    }
  };

  const stats = useMemo(() => {
    const allItems = [
      ...(transactions || []).map(t => ({ billed: Number(t.billedAmount || 0), paid: Number(t.paidAmount || 0) })),
      ...(courtCases || []).map(c => ({ billed: Number(c.billed || 0), paid: Number(c.paid || 0) })),
      ...(letters || []).map(l => ({ billed: Number(l.billed || 0), paid: Number(l.paid || 0) }))
    ];
    const stTransactions = (transactions || []).filter(isStagnant).length;
    const stCases = (courtCases || []).filter(isStagnant).length;
    const stLetters = (letters || []).filter(isStagnant).length;
    
    const fbTransactions = (transactions || []).filter(needsFeedback);
    const fbCases = (courtCases || []).filter(needsFeedback);
    const fbLetters = (letters || []).filter(needsFeedback);
    const totalNeedsFeedback = fbTransactions.length + fbCases.length + fbLetters.length;
    const summary = allItems.reduce((acc, item) => {
      acc.totalBilled += item.billed;
      acc.totalPaid += item.paid;
      if (item.billed > 0) {
        if (item.paid < item.billed) acc.pendingCount += 1;
        else acc.completedCount += 1;
      }
      return acc;
    }, { totalBilled: 0, totalPaid: 0, pendingCount: 0, completedCount: 0 });

    const totalActualExpenses = (expenses || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    
    // Land Title Stats
    const inCustodyTitles = (landTitles || []).filter(t => t.status === 'In Custody' || t.status === 'Under Transaction' || t.status === 'Taken');
    const today = new Date();
    const overdueTitles = inCustodyTitles.filter(t => {
       const receivedDate = new Date(t.date_received);
       const diffDays = Math.ceil(Math.abs(today.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
       return diffDays > 90;
    });

    // totalNeedsFeedback already calculated at line 91
    
    return { 
      ...summary, 
      totalExpenses: totalActualExpenses, 
      stTransactions, stCases, stLetters, 
      totalStagnant: stTransactions + stCases + stLetters,
      inCustodyCount: inCustodyTitles.length,
      overdueCount: overdueTitles.length,
      totalNeedsFeedback,
      needsFeedbackFiles: [...fbTransactions, ...fbCases, ...fbLetters]
    };
  }, [transactions, courtCases, letters, expenses, landTitles, needsFeedback]);

  const upcomingCourts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const twoWeeksFromNow = new Date(); twoWeeksFromNow.setDate(today.getDate() + 14);
    return (courtCases || [])
      .filter(c => { if (!c.nextCourtDate) return false; const d = new Date(c.nextCourtDate); return d >= today && d <= twoWeeksFromNow; })
      .sort((a, b) => new Date(a.nextCourtDate || 0).getTime() - new Date(b.nextCourtDate || 0).getTime());
  }, [courtCases]);

  const pieDataPending = {
    labels: ["Pending", "Completed"],
    datasets: [{ data: [stats.pendingCount, stats.completedCount], backgroundColor: ["#E74C3C", "#2ECC71"], borderWidth: 0 }],
  };
  const pieDataFinancial = {
    labels: ["Paid Amount", "Outstanding Balance"],
    datasets: [{ data: [stats.totalPaid, Math.max(0, stats.totalBilled - stats.totalPaid)], backgroundColor: ["#27AE60", "#F1C40F"], borderWidth: 0 }],
  };
  const barDataProfit = {
    labels: ["Revenue (In)", "Expenses (Out)", "Net Profit"],
    datasets: [{ label: "Amount (UGX)", data: [stats.totalPaid, stats.totalExpenses, stats.totalPaid - stats.totalExpenses], backgroundColor: ["#27AE60", "#E74C3C", "#0B1F3A"], borderRadius: 8 }],
  };

  const formatCurrency = (num: number) => "UGX " + num.toLocaleString();

  // Sort tasks: Pending first, Completed at bottom — exclude soft-deleted
  const sortedTasks = [...(tasks || [])].filter(t => !t.deleted).sort((a, b) => {
    switch (sortTasksBy) {
      case "newest": return new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime();
      case "oldest": return new Date(a.dateCreated || 0).getTime() - new Date(b.dateCreated || 0).getTime();
      case "status":
      default:
        if (a.status === b.status) return 0;
        return a.status === 'Pending' ? -1 : 1;
    }
  });

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Firm Analytics</h1>
          <p style={styles.subtitle}>
            Logged in as: <strong style={{ color: '#0B1F3A', textTransform: 'capitalize' }}>{currentUser?.role || 'User'}</strong> • {new Date().toLocaleDateString('en-GB', { dateStyle: 'full' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* REAL notifications from context */}
          <NotificationBell
            currentUser={currentUser}
            notifications={notifications}
            markAsRead={() => currentUser && markNotificationsAsRead(currentUser.id)}
          />
          <button onClick={() => navigate("/login")} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      {/* FINANCIAL WIDGET */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'accountant') && (
        <div style={styles.financialWidget}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: 0, color: 'white' }}>💼 Accounts Overview</h3>
            <span style={{ fontSize: 12, color: '#A0AEC0', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 4 }}>LIVE DATA</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: '#A0AEC0', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Revenue</p>
              <p style={{ fontSize: 20, color: '#48BB78', fontWeight: '900' }}>{formatCurrency(stats.totalPaid)}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: '#A0AEC0', textTransform: 'uppercase', fontWeight: 'bold' }}>Operational Costs</p>
              <p style={{ fontSize: 20, color: '#F56565', fontWeight: '900' }}>{formatCurrency(stats.totalExpenses)}</p>
            </div>
            <div style={{ background: 'white', padding: 15, borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase', fontWeight: 'bold' }}>Net Profit</p>
              <p style={{ fontSize: 20, color: '#0B1F3A', fontWeight: '900' }}>{formatCurrency(stats.totalPaid - stats.totalExpenses)}</p>
            </div>
          </div>
        </div>
      )}

      {/* STATS GRID */}
      <div style={styles.grid}>
        <StatCard label="Total Billed" value={formatCurrency(stats.totalBilled)} color="#0B1F3A" />
        <StatCard label="Total Paid" value={formatCurrency(stats.totalPaid)} color="#27AE60" />
        <StatCard label="Balance Due" value={formatCurrency(Math.max(0, stats.totalBilled - stats.totalPaid))} color="#E67E22" />
      </div>

      <div style={{ ...styles.grid, marginTop: 20 }}>
        <SummaryBox label="Transactions" count={showOnlyStagnant ? stats.stTransactions : (transactions?.length || 0)} icon="💳" />
        <SummaryBox label="Court Cases" count={showOnlyStagnant ? stats.stCases : (courtCases?.length || 0)} icon="⚖️" />
        <SummaryBox label="Letters" count={showOnlyStagnant ? stats.stLetters : (letters?.length || 0)} icon="✉️" />
        <SummaryBox label="Titles in Custody" count={stats.inCustodyCount} icon="📜" />
        <SummaryBox 
          label="Overdue Titles" 
          count={stats.overdueCount} 
          icon="🚨" 
          color={stats.overdueCount > 0 ? '#ef4444' : '#666'}
          bgColor={stats.overdueCount > 0 ? '#FFF5F5' : 'white'}
        />
        <div
          onClick={() => setShowOnlyStagnant(!showOnlyStagnant)}
          style={{ ...styles.summaryBox, cursor: 'pointer', border: showOnlyStagnant ? '2px solid #E74C3C' : '1px solid #EEE', backgroundColor: showOnlyStagnant ? '#FFF5F5' : 'white', transition: 'all 0.2s ease' }}
        >
          <span style={{ fontSize: 24 }}>🛑</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, color: showOnlyStagnant ? "#E74C3C" : "#666", fontWeight: 'bold' }}>Stagnant Files</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: "900", color: "#E74C3C" }}>{stats.totalStagnant}</p>
          </div>
        </div>
        <div
          style={{ ...styles.summaryBox, border: stats.totalNeedsFeedback > 0 ? '2px solid #E67E22' : '1px solid #EEE', backgroundColor: stats.totalNeedsFeedback > 0 ? '#FFF8F1' : 'white' }}
        >
          <span style={{ fontSize: 24 }}>📞</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, color: stats.totalNeedsFeedback > 0 ? "#E67E22" : "#666", fontWeight: 'bold' }}>Feedback Overdue</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: "900", color: "#E67E22" }}>{stats.totalNeedsFeedback}</p>
          </div>
        </div>
        <SummaryBox label="Open Clerk Tasks" count={tasks?.filter(t => t.status === "Pending" && !t.deleted).length || 0} icon="📋" />
      </div>

      <div style={styles.mainGrid}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📞 Clients Needing Feedback</h3>
            <div style={styles.listContainer}>
              {stats.needsFeedbackFiles.length > 0 ? (
                <ul style={styles.list}>
                  {stats.needsFeedbackFiles.map((file: any) => (
                    <li key={file.id} style={styles.listItem} onClick={() => navigate(file.fileName ? (file.categories ? `/cases/${file.id}` : `/transactions/${file.id}`) : `/letters/${file.id}`)}>
                      <div>
                        <div style={{ fontWeight: "700", color: "#1A1A1A" }}>{file.fileName || file.subject}</div>
                        <div style={{ fontSize: "11px", color: "#E67E22", fontWeight: "bold" }}>
                          Last contact: {file.lastClientFeedbackDate ? new Date(file.lastClientFeedbackDate).toLocaleDateString() : "Never"}
                        </div>
                      </div>
                      <span style={{ fontSize: "12px", color: "#E67E22", fontWeight: "bold" }}>Overdue</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>
                  ✅ All clients have been updated within the last 14 days.
                </div>
              )}
            </div>
          </section>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Upcoming Court Dates (14 Days)</h3>
            <div style={styles.listContainer}>
              {upcomingCourts.length > 0 ? (
                <ul style={styles.list}>
                  {upcomingCourts.map((c: any) => {
                    const countdown = getDaysRemaining(c.nextCourtDate);
                    return (
                      <li key={c.id} style={styles.listItem}>
                        <div>
                          <div style={{ fontWeight: "700", color: "#1A1A1A" }}>{c.fileName}</div>
                          <div style={{ fontSize: "11px", fontWeight: "bold", color: countdown.urgent ? "#E74C3C" : "#007BFF" }}>{countdown.text}</div>
                        </div>
                        <span style={styles.dateBadge}>{new Date(c.nextCourtDate).toLocaleDateString('en-GB')}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p style={styles.emptyText}>No upcoming hearings scheduled.</p>
              )}
            </div>
          </section>

          {(currentUser?.role === 'admin' || currentUser?.role === 'accountant') && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Profitability Analysis</h3>
              <div style={{ height: 200 }}>
                <Bar data={barDataProfit} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
          <section style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Lawyer-Clerk Task Feed</h3>
                <select 
                  value={sortTasksBy} 
                  onChange={(e) => setSortTasksBy(e.target.value)}
                  style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #EEE', outline: 'none' }}
                >
                  <option value="status">Sort by Status</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                <span style={{ backgroundColor: '#FFF5F5', color: '#E53E3E', padding: '3px 8px', borderRadius: 10, fontWeight: 'bold' }}>
                  {tasks?.filter(t => t.status === 'Pending' && !t.deleted).length || 0} Pending
                </span>
                <span style={{ backgroundColor: '#E6FFFA', color: '#319795', padding: '3px 8px', borderRadius: 10, fontWeight: 'bold' }}>
                  {tasks?.filter(t => t.status === 'Completed' && !t.deleted).length || 0} Done
                </span>
              </div>
            </div>
            <div style={styles.listContainer}>
              {sortedTasks.length > 0 ? (
                <ul style={styles.list}>
                  {sortedTasks.map((task: any) => (
                    <li
                      key={task.id}
                      style={{ ...styles.listItem, cursor: 'pointer', opacity: task.status === 'Completed' ? 0.75 : 1 }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ flex: 1 }} onClick={() => setSelectedTask(task)}>
                        <div style={{ fontWeight: "600", color: "#333", fontSize: "13px", textDecoration: task.status === 'Completed' ? 'line-through' : 'none' }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "#888" }}>
                          <span style={{ color: '#007BFF' }}>{task.assignedByName}</span> → <span style={{ color: '#333' }}>{task.assignedToName}</span>
                        </div>
                        {task.clerkNote && (
                          <div style={{ fontSize: 11, color: '#319795', marginTop: 2, fontStyle: 'italic' }}>
                            "{task.clerkNote}"
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          ...styles.dateBadge,
                          backgroundColor: task.status === "Completed" ? "#E6FFFA" : "#FFF5F5",
                          color: task.status === "Completed" ? "#319795" : "#E53E3E"
                        }}>
                          {task.status}
                        </span>
                        {/* DELETE button — only visible on completed tasks */}
                        {task.status === 'Completed' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                            title="Delete completed task"
                            style={{
                              background: 'none', border: '1px solid #FEB2B2', color: '#E53E3E',
                              borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                              fontWeight: 'bold', transition: '0.2s'
                            }}
                            onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFF5F5'; }}
                            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={styles.emptyText}>No active instructions found.</p>
              )}
            </div>
          </section>

          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ ...styles.section, flex: 1 }}>
              <h3 style={styles.sectionTitle}>Workload</h3>
              <div style={{ height: 150 }}><Pie data={pieDataPending} options={{ maintainAspectRatio: false }} /></div>
            </div>
            <div style={{ ...styles.section, flex: 1 }}>
              <h3 style={styles.sectionTitle}>Collection</h3>
              <div style={{ height: 150 }}><Pie data={pieDataFinancial} options={{ maintainAspectRatio: false }} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <div style={styles.modalOverlay} onClick={() => setSelectedTask(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #EEE', paddingBottom: '15px', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Task Details</h2>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={styles.modalLabel}>Instruction Title</label>
                <p style={styles.modalValue}>{selectedTask.title}</p>
              </div>
              <div>
                <label style={styles.modalLabel}>Detailed Instructions</label>
                <p style={{ ...styles.modalValue, whiteSpace: 'pre-line' }}>{selectedTask.description || "No description provided."}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={styles.modalLabel}>From</label>
                  <p style={styles.modalValue}>{selectedTask.assignedByName}</p>
                </div>
                <div>
                  <label style={styles.modalLabel}>To</label>
                  <p style={styles.modalValue}>{selectedTask.assignedToName}</p>
                </div>
              </div>
              <div>
                <label style={styles.modalLabel}>Status</label>
                <span style={{
                  ...styles.dateBadge,
                  backgroundColor: selectedTask.status === "Completed" ? "#E6FFFA" : "#FFF5F5",
                  color: selectedTask.status === "Completed" ? "#319795" : "#E53E3E"
                }}>
                  {selectedTask.status}
                </span>
              </div>
              {selectedTask.clerkNote && (
                <div>
                  <label style={styles.modalLabel}>Clerk's Report</label>
                  <p style={{ ...styles.modalValue, fontStyle: 'italic', color: '#319795' }}>"{selectedTask.clerkNote}"</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setSelectedTask(null)}
                style={{ flex: 1, padding: '12px', backgroundColor: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Close
              </button>
              {selectedTask.status === 'Completed' && (
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  style={{ padding: '12px 20px', backgroundColor: '#FFF5F5', color: '#E53E3E', border: '1px solid #FEB2B2', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  🗑 Delete Task
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ label, value, color }: any) => (
  <div style={{ ...styles.card, backgroundColor: color }}>
    <p style={styles.cardLabel}>{label}</p>
    <p style={styles.cardValue}>{value}</p>
  </div>
);

const SummaryBox = ({ label, count, icon, color = "#666", bgColor = "white" }: any) => (
  <div style={{ ...styles.summaryBox, backgroundColor: bgColor, borderColor: color === '#666' ? '#EEE' : color }}>
    <span style={{ fontSize: 24 }}>{icon}</span>
    <div>
      <p style={{ margin: 0, fontSize: 14, color: color }}>{label}</p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: "bold", color: color }}>{count}</p>
    </div>
  </div>
);

const styles: any = {
  container: { padding: "30px", backgroundColor: "#F8F9FA", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  title: { margin: 0, fontSize: "28px", color: "#1A1A1A" },
  subtitle: { margin: "5px 0 0 0", color: "#666" },
  logoutBtn: { color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", backgroundColor: "#FF4D4F" },
  financialWidget: { backgroundColor: '#1A365D', borderRadius: 16, padding: 25, marginBottom: 30, boxShadow: '0 10px 25px rgba(26, 54, 93, 0.2)' },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" },
  card: { padding: "25px", borderRadius: "12px", color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  cardLabel: { margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 },
  cardValue: { margin: "10px 0 0 0", fontSize: "22px", fontWeight: "bold" },
  summaryBox: { display: "flex", alignItems: "center", gap: "15px", backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #EEE" },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px", marginTop: "25px" },
  section: { backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #EEE", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" },
  sectionTitle: { fontSize: "16px", fontWeight: "bold", marginBottom: "20px", color: "#333" },
  listContainer: { maxHeight: "320px", overflowY: "auto" },
  list: { listStyle: "none", padding: 0, margin: 0 },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F0F0F0" },
  dateBadge: { backgroundColor: "#EBF5FF", color: "#007BFF", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" },
  emptyText: { textAlign: "center", color: "#999", padding: "20px" },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalLabel: { fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: '#888', marginBottom: '4px', display: 'block' },
  modalValue: { fontSize: '14px', margin: 0, color: '#333', fontWeight: '500' }
};