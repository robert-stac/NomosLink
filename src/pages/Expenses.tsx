import { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";

export default function Expenses() {
  const { expenses, setExpenses } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const [formData, setFormData] = useState({ 
    date: "", 
    category: "", 
    description: "", 
    amount: "" 
  });

  // Unique categories for the filter dropdown
  const categories = useMemo(() => {
    const list = (expenses || []).map((e: any) => e.category);
    return ["All", ...Array.from(new Set(list))];
  }, [expenses]);

  // Filtered Data Logic
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((exp: any) => {
      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            exp.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "All" || exp.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, filterCategory]);

  // --- CSV EXPORT LOGIC ---
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return alert("No data to export");

    const headers = ["Date", "Category", "Description", "Amount (UGX)"];
    const rows = filteredExpenses.map(exp => [
      exp.date,
      exp.category,
      exp.description,
      exp.amount
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BCA_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleOpenModal = (expense?: any) => {
    if (expense) {
      setEditingId(expense.id);
      setFormData({
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString()
      });
    } else {
      setEditingId(null);
      setFormData({ date: "", category: "", description: "", amount: "" });
    }
    setShowModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const expenseData = {
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: Number(formData.amount),
    };

    if (editingId) {
      setExpenses(expenses.map((exp: any) => 
        exp.id === editingId ? { ...exp, ...expenseData } : exp
      ));
    } else {
      setExpenses([...(expenses || []), { id: Date.now().toString(), ...expenseData }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure?")) {
      setExpenses(expenses.filter((exp: any) => exp.id !== id));
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Firm Expenses</h1>
          <p style={styles.subtitle}>Track, search, and export operational costs</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleExportCSV} style={styles.exportBtn}>📥 Export CSV</button>
          <button onClick={() => handleOpenModal()} style={styles.addBtn}>+ Record Expense</button>
        </div>
      </header>

      {/* Search & Filter Bar */}
      <div style={styles.filterBar}>
        <input 
          type="text" 
          placeholder="Search description or category..." 
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          style={styles.filterSelect} 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Amount (UGX)</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((exp: any) => (
                <tr key={exp.id} style={styles.tr}>
                  <td style={styles.td}>{exp.date}</td>
                  <td style={styles.td}><span style={styles.categoryBadge}>{exp.category}</span></td>
                  <td style={styles.td}>{exp.description}</td>
                  <td style={{ ...styles.td, fontWeight: "bold" }}>{exp.amount.toLocaleString()}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleOpenModal(exp)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(exp.id)} style={styles.deleteBtn}>Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} style={styles.empty}>No matching expenses found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>{editingId ? "Edit Expense" : "Add New Expense"}</h3>
            <form onSubmit={handleSaveExpense}>
              <label style={styles.fieldLabel}>Date</label>
              <input type="date" required style={styles.input} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              
              <label style={styles.fieldLabel}>Category</label>
              <input type="text" placeholder="e.g. Rent" style={styles.input} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />

              <label style={styles.fieldLabel}>Description</label>
              <input placeholder="Details..." style={styles.input} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              
              <label style={styles.fieldLabel}>Amount (UGX)</label>
              <input type="number" placeholder="Amount" style={styles.input} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
              
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  container: { padding: "20px" },
  header: { display: "flex", justifyContent: "space-between", marginBottom: "20px" },
  headerActions: { display: "flex", gap: "10px" },
  title: { fontSize: "24px", color: "#0B1F3A", margin: 0 },
  subtitle: { color: "#666", fontSize: "14px" },
  addBtn: { backgroundColor: "#0B1F3A", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  exportBtn: { backgroundColor: "#27AE60", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  filterBar: { display: "flex", gap: "10px", marginBottom: "20px" },
  searchInput: { flex: 2, padding: "10px", borderRadius: "6px", border: "1px solid #DDD" },
  filterSelect: { flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #DDD" },
  tableCard: { backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "15px", backgroundColor: "#F8FAFC", borderBottom: "1px solid #EEE", fontSize: "13px", color: "#666" },
  td: { padding: "15px", borderBottom: "1px solid #F9F9F9", fontSize: "14px" },
  categoryBadge: { backgroundColor: "#EBF8FF", color: "#3182CE", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" },
  editBtn: { background: "none", border: "none", color: "#3498DB", cursor: "pointer", marginRight: "10px" },
  deleteBtn: { background: "none", border: "none", color: "#E74C3C", cursor: "pointer" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "450px" },
  input: { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "6px", border: "1px solid #DDD", boxSizing: "border-box" },
  fieldLabel: { display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px" },
  modalActions: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  cancelBtn: { padding: "10px 15px", background: "#EEE", border: "none", borderRadius: "6px", cursor: "pointer" },
  saveBtn: { padding: "10px 15px", background: "#0B1F3A", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" },
  empty: { textAlign: "center", padding: "30px", color: "#999" }
};