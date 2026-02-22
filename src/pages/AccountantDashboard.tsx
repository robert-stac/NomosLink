import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import { useAppContext } from "../context/AppContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AccountantDashboard() {
  // Pulling 'expenses' from context to ensure real data is used
  const { transactions, courtCases, letters, expenses } = useAppContext();

  // 1. Calculate Financials using REAL data
  const financeTotals = useMemo(() => {
    const allRevenueItems = [
      ...(transactions || []),
      ...(courtCases || []),
      ...(letters || [])
    ];
    
    // Calculate Revenue & Billing
    const revenue = allRevenueItems.reduce((acc, item) => {
      const billed = Number(('billed' in item ? item.billed : 0) || ('billedAmount' in item ? item.billedAmount : 0) || 0);
      const paid = Number(('paid' in item ? item.paid : 0) || ('paidAmount' in item ? item.paidAmount : 0) || 0);
      acc.totalBilled += billed;
      acc.totalPaid += paid;
      if (billed > paid) acc.outstanding += (billed - paid);
      return acc;
    }, { totalBilled: 0, totalPaid: 0, outstanding: 0 });

    // Calculate Actual Expenses
    // This sums up items in your 'expenses' collection (rent, salaries, etc.)
    const totalActualExpenses = (expenses || []).reduce((sum, exp) => {
      return sum + Number(exp.amount || 0);
    }, 0);

    return { ...revenue, totalExpenses: totalActualExpenses };
  }, [transactions, courtCases, letters, expenses]);

  const netProfit = financeTotals.totalPaid - financeTotals.totalExpenses;

  // 2. Chart Data: Revenue Sources
  const sourceData = {
    labels: ["Transactions", "Court Cases", "Letters"],
    datasets: [{
      data: [
        transactions?.length || 0,
        courtCases?.length || 0,
        letters?.length || 0
      ],
      backgroundColor: ["#3498DB", "#F1C40F", "#9B59B6"],
    }]
  };

  const formatUGX = (val: number) => "UGX " + val.toLocaleString();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Finance Command Center</h1>
        <p style={styles.subtitle}>Real-time Financial Position</p>
      </header>

      {/* Primary Financial Row - All Dynamic Data */}
      <div style={styles.grid}>
        <div style={{ ...styles.card, background: "#0B1F3A" }}>
          <p style={styles.cardLabel}>Total Billed</p>
          <h2 style={styles.cardValue}>{formatUGX(financeTotals.totalBilled)}</h2>
        </div>
        <div style={{ ...styles.card, background: "#27AE60" }}>
          <p style={styles.cardLabel}>Total Revenue (Paid)</p>
          <h2 style={styles.cardValue}>{formatUGX(financeTotals.totalPaid)}</h2>
        </div>
        <div style={{ ...styles.card, background: "#E74C3C" }}>
          <p style={styles.cardLabel}>Total Expenses</p>
          <h2 style={styles.cardValue}>{formatUGX(financeTotals.totalExpenses)}</h2>
        </div>
        <div style={{ ...styles.card, background: netProfit >= 0 ? "#16A085" : "#C0392B" }}>
          <p style={styles.cardLabel}>Net Profit</p>
          <h2 style={styles.cardValue}>{formatUGX(netProfit)}</h2>
        </div>
      </div>

      <div style={styles.mainGrid}>
        {/* Left: Outstanding Collections */}
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "20px" }}>
            <h3 style={styles.sectionTitle}>Accounts Receivable (Pending)</h3>
            <span style={{ fontSize: '12px', color: '#E67E22', fontWeight: 'bold' }}>
              Total Uncollected: {formatUGX(financeTotals.outstanding)}
            </span>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>File Name</th>
                  <th style={styles.th}>Unpaid Balance</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {[...(transactions || []), ...(courtCases || [])]
                  .filter(item => (('billed' in item ? item.billed : 0) || ('billedAmount' in item ? item.billedAmount : 0) || 0) > (('paid' in item ? item.paid : 0) || ('paidAmount' in item ? item.paidAmount : 0) || 0))
                  .slice(0, 8)
                  .map((item, idx) => (
                    <tr key={idx}>
                      <td style={styles.td}>{String(item.fileName || ('clientName' in item ? item.clientName : 'Unknown'))}</td>
                      <td style={{ ...styles.td, color: "#E74C3C", fontWeight: "bold" }}>
                        {formatUGX((('billed' in item ? item.billed : 0) || ('billedAmount' in item ? item.billedAmount : 0) || 0) - (('paid' in item ? item.paid : 0) || ('paidAmount' in item ? item.paidAmount : 0) || 0))}
                      </td>
                      <td style={styles.td}>
                        <button style={styles.actionBtn}>Invoice</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Revenue Split & Efficiency */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Case Volume</h3>
          <div style={{ height: 220, marginTop: '10px' }}>
            <Doughnut 
                data={sourceData} 
                options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} 
            />
          </div>
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #EEE' }}>
             <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Collection Rate</p>
             <div style={{ width: '100%', height: '8px', background: '#EEE', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                    width: `${financeTotals.totalBilled > 0 ? (financeTotals.totalPaid / financeTotals.totalBilled) * 100 : 0}%`, 
                    height: '100%', 
                    background: '#27AE60' 
                }}></div>
             </div>
             <p style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '5px', color: '#27AE60' }}>
                {financeTotals.totalBilled > 0 ? ((financeTotals.totalPaid / financeTotals.totalBilled) * 100).toFixed(1) : 0}% efficiency
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  container: { padding: "20px", backgroundColor: "#F4F7F6", minHeight: "100vh" },
  header: { marginBottom: "30px" },
  title: { fontSize: "24px", fontWeight: "bold", color: "#0B1F3A", margin: 0 },
  subtitle: { color: "#666", marginTop: "5px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "15px", marginBottom: "30px" },
  card: { padding: "20px", borderRadius: "12px", color: "white", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" },
  cardLabel: { fontSize: "11px", textTransform: "uppercase", opacity: 0.8, margin: 0, fontWeight: "bold", letterSpacing: "0.5px" },
  cardValue: { fontSize: "18px", margin: "10px 0 0 0", fontWeight: "bold" },
  mainGrid: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "25px" },
  section: { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  sectionTitle: { fontSize: "16px", marginBottom: "0", fontWeight: "bold", color: "#333" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: "12px", color: "#999", padding: "10px", borderBottom: "1px solid #EEE" },
  td: { padding: "12px 10px", fontSize: "13px", borderBottom: "1px solid #F9F9F9" },
  actionBtn: { background: "#3498DB", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }
};