import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";

export default function Reports() {
  const { transactions, courtCases, letters, tasks } = useAppContext();

  // NEW: State for Date Filtering
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // NEW: Filtering Logic
  const filterByDate = (data: any[]) => {
    if (!startDate && !endDate) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item.date || item.dateCreated || item.nextCourtDate || item.nextDate);
      const start = startDate ? new Date(startDate) : new Date("1970-01-01");
      const end = endDate ? new Date(endDate) : new Date("2099-12-31");
      
      // Set hours to 0 to compare dates accurately
      itemDate.setHours(0,0,0,0);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);

      return itemDate >= start && itemDate <= end;
    });
  };

  const downloadCSV = (data: any[], filename: string) => {
    const filteredData = filterByDate(data);
    if (!filteredData || !filteredData.length) return alert("No data found for the selected period.");

    const headers = Object.keys(filteredData[0]);
    const csvRows = [
      headers.join(","),
      ...filteredData.map(row =>
        headers.map(field => {
          const val = row[field] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ];
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${startDate || 'all'}_to_${endDate || 'now'}_${filename}`);
    link.click();
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Inter, sans-serif" }}>
      <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Reports & Exports
      </h2>

      {/* NEW: Filter UI Section */}
      <div style={{ 
        display: "flex", 
        gap: 15, 
        marginBottom: 30, 
        padding: 20, 
        backgroundColor: "#f1f5f9", 
        borderRadius: 12,
        alignItems: "center" 
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>Start Date</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>End Date</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          />
        </div>
        <button 
          onClick={() => { setStartDate(""); setEndDate(""); }}
          style={{ marginTop: "18px", fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}
        >
          Clear Filters
        </button>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => downloadCSV(transactions, "transactions.csv")}
          style={styles.btnPrimary}
        >
          Download Transactions CSV
        </button>

        <button
          onClick={() => downloadCSV(courtCases, "court_cases.csv")}
          style={styles.btnPrimary}
        >
          Download Court Cases CSV
        </button>

        <button
          onClick={() => downloadCSV(letters, "letters.csv")}
          style={styles.btnPrimary}
        >
          Download Letters CSV
        </button>

        <button
          onClick={() => downloadCSV(tasks, "clerk_tasks.csv")}
          style={{ ...styles.btnPrimary, backgroundColor: "#27AE60" }}
        >
          Download Task Performance CSV
        </button>
      </div>

      <div style={{ marginTop: 40, padding: 25, backgroundColor: "#0B1F3A", borderRadius: 15, color: "white" }}>
        <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 15 }}>Filtered Period Analytics</h3>
        <div style={{ display: "flex", gap: 40 }}>
          <div>
            <p style={{ opacity: 0.7, fontSize: 12 }}>Items in Period</p>
            <p style={{ fontSize: 24, fontWeight: "bold" }}>{filterByDate([...transactions, ...courtCases, ...letters]).length}</p>
          </div>
          <div>
            <p style={{ opacity: 0.7, fontSize: 12 }}>Tasks Completed</p>
            <p style={{ fontSize: 24, fontWeight: "bold" }}>{filterByDate(tasks).filter(t => t.status === "Completed").length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  btnPrimary: {
    padding: "12px 20px",
    backgroundColor: "#0B1F3A",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    transition: "transform 0.1s"
  }
};