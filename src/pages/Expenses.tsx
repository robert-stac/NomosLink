import { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabaseClient";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  BarElement
} from "chart.js";

ChartJS.register(Tooltip, Legend, Title, CategoryScale, LinearScale, BarElement);

export default function Expenses() {
  const { expenses, setExpenses, users, courtCases, transactions, letters } = useAppContext();
  const [activeTab, setActiveTab] = useState<"Ledger" | "Reports">("Ledger");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");

  const [formData, setFormData] = useState({ 
    type: "out" as "in" | "out",
    date: "", 
    purpose: "",
    amount: "",
    staffId: "",
    staffName: "",
    relatedFileId: "",
    relatedFileType: "" as any,
    relatedFileName: ""
  });

  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");

  const staffList = users.filter(u => ["lawyer", "manager", "clerk", "admin", "accountant"].includes(u.role));
  
  const activeCases = courtCases.filter(c => !c.archived);
  const activeTransactions = transactions.filter(t => !t.archived);
  const activeLetters = letters.filter(l => !l.archived);

  // Filtered Data Logic
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((exp: any) => {
      const typeStr = exp.type || "out";
      const matchesSearch = (exp.purpose || exp.description || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (exp.staffName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (exp.relatedFileName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "All" || typeStr === filterType;
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, filterType]);

  // Summaries
  const summaries = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    (expenses || []).forEach(exp => {
      if (exp.type === "in") totalIn += Number(exp.amount || 0);
      else totalOut += Number(exp.amount || 0);
    });
    return {
      totalReceived: totalIn,
      totalSpent: totalOut,
      balance: totalIn - totalOut
    };
  }, [expenses]);

  // Reports Data
  const reportData = useMemo(() => {
    const staffTotals: Record<string, number> = {};
    const fileTotals: Record<string, number> = {};
    const fileBilled: Record<string, number> = {}; 

    activeCases.forEach(c => fileBilled[c.id] = Number(c.billed || 0));
    activeTransactions.forEach(t => fileBilled[t.id] = Number(t.billedAmount || 0));
    activeLetters.forEach(l => fileBilled[l.id] = Number((l as any).billed || 0));

    (expenses || []).forEach(exp => {
      if (exp.type !== "in" && Number(exp.amount) > 0) {
        if (exp.staffName) {
          staffTotals[exp.staffName] = (staffTotals[exp.staffName] || 0) + Number(exp.amount);
        }
        if (exp.relatedFileId && exp.relatedFileName) {
          fileTotals[exp.relatedFileId] = (fileTotals[exp.relatedFileId] || 0) + Number(exp.amount);
        }
      }
    });

    const staffLabels = Object.keys(staffTotals);
    const staffValues = Object.values(staffTotals);

    const advisoryWarnings: any[] = [];
    Object.keys(fileTotals).forEach(fid => {
       const spent = fileTotals[fid];
       const billed = fileBilled[fid] || 0;
       const exp = (expenses || []).find(e => e.relatedFileId === fid);
       const fileName = exp ? exp.relatedFileName : "Unknown File";
       
       if (billed === 0 && spent > 0) {
          advisoryWarnings.push({ id: fid, fileName, spent, billed, warning: "Spending occurs with zero billed amount." });
       } else if (spent >= billed) {
          advisoryWarnings.push({ id: fid, fileName, spent, billed, warning: "Loss risk: Expenditure meets or exceeds billed amount." });
       } else if (spent > billed * 0.7) {
          advisoryWarnings.push({ id: fid, fileName, spent, billed, warning: "Margin warning: Expenditure is over 70% of billed amount." });
       }
    });

    const fileList = Object.keys(fileTotals).map(k => {
       const exp = (expenses || []).find(e => e.relatedFileId === k);
       return {
         fileName: exp ? exp.relatedFileName : "Unknown",
         spent: fileTotals[k],
         billed: fileBilled[k] || 0
       };
    }).sort((a,b) => b.spent - a.spent);

    return { staffLabels, staffValues, advisoryWarnings, fileList };
  }, [expenses, activeCases, activeTransactions, activeLetters]);

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return alert("No data to export");
    const headers = ["Date", "Type", "Staff Name", "Purpose", "File Name", "Amount (UGX)"];
    const rows = filteredExpenses.map(exp => [
      exp.date,
      exp.type === "in" ? "Money In" : "Money Out",
      exp.staffName || "",
      (exp.purpose || exp.description || "").replace(/,/g, ""),
      (exp.relatedFileName || "").replace(/,/g, ""),
      exp.amount
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
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
        type: expense.type || "out",
        date: expense.date,
        purpose: expense.purpose || expense.description || "",
        amount: expense.amount.toString(),
        staffId: expense.staffId || "",
        staffName: expense.staffName || "",
        relatedFileId: expense.relatedFileId || "",
        relatedFileType: expense.relatedFileType || "",
        relatedFileName: expense.relatedFileName || ""
      });
    } else {
      setEditingId(null);
      setFormData({ type: "out", date: "", purpose: "", amount: "", staffId: "", staffName: "", relatedFileId: "", relatedFileType: "", relatedFileName: "" });
    }
    setShowModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const expenseData = {
      type: formData.type,
      date: formData.date,
      category: formData.type === 'in' ? "Petty Cash Replenishment" : "Expense",
      description: formData.purpose,
      purpose: formData.purpose,
      amount: Number(formData.amount),
      staffId: formData.type === 'out' ? formData.staffId : undefined,
      staffName: formData.type === 'out' ? formData.staffName : undefined,
      relatedFileId: formData.type === 'out' ? formData.relatedFileId : undefined,
      relatedFileType: formData.type === 'out' ? formData.relatedFileType : undefined,
      relatedFileName: formData.type === 'out' ? formData.relatedFileName : undefined,
    };

    if (editingId) {
      setExpenses(expenses.map((exp: any) => exp.id === editingId ? { ...exp, ...expenseData } : exp));
    } else {
      setExpenses([...(expenses || []), { id: Date.now().toString(), ...expenseData }]);
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure? This will delete the expense permanently.")) {
      setExpenses(expenses.filter((exp: any) => exp.id !== id));
      if (navigator.onLine) {
        await supabase.from('expenses').delete().eq('id', id);
      }
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Financial Tracker</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage petty cash, track firm expenses, and analyze file profitability.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors border border-emerald-200">
            📥 Export CSV
          </button>
          <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors">
            + Record Transaction
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-200/60 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab("Ledger")}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "Ledger" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Petty Cash Ledger
        </button>
        <button 
          onClick={() => setActiveTab("Reports")}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "Reports" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Expense Advisory
        </button>
      </div>

      {activeTab === "Ledger" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl relative overflow-hidden">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600/80 mb-2">Total Received</p>
              <h3 className="text-3xl font-black text-emerald-700">UGX {summaries.totalReceived.toLocaleString()}</h3>
            </div>
            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl relative overflow-hidden">
              <p className="text-xs font-black uppercase tracking-widest text-red-600/80 mb-2">Total Spent</p>
              <h3 className="text-3xl font-black text-red-700">UGX {summaries.totalSpent.toLocaleString()}</h3>
            </div>
            <div className={`border p-6 rounded-2xl relative overflow-hidden ${summaries.balance < 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
              <p className={`text-xs font-black uppercase tracking-widest mb-2 ${summaries.balance < 0 ? 'text-orange-600/80' : 'text-blue-600/80'}`}>Current Balance</p>
              <h3 className={`text-3xl font-black ${summaries.balance < 0 ? 'text-orange-700' : 'text-blue-700'}`}>UGX {summaries.balance.toLocaleString()}</h3>
            </div>
          </div>

          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Search by purpose, staff, or file name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white border border-slate-200 p-3.5 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-slate-900 shadow-sm transition-all"
            />
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="w-48 bg-white border border-slate-200 p-3.5 rounded-xl font-bold text-sm outline-none shadow-sm cursor-pointer"
            >
              <option value="All">All Transactions</option>
              <option value="in">Money In (+)</option>
              <option value="out">Money Out (-)</option>
            </select>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Staff & File</th>
                    <th className="p-4">Purpose</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium">
                  {filteredExpenses.length > 0 ? filteredExpenses.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-600 whitespace-nowrap">{exp.date}</td>
                      <td className="p-4">
                        {exp.type === 'in' 
                          ? <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider">In (+)</span>
                          : <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider">Out (-)</span>
                        }
                      </td>
                      <td className="p-4 max-w-[200px]">
                        {exp.type === 'out' ? (
                          <div className="space-y-1">
                            {exp.staffName && <p className="text-slate-800 font-bold text-xs">👤 {exp.staffName}</p>}
                            {exp.relatedFileName && <p className="text-blue-600 text-xs truncate" title={exp.relatedFileName}>⚖️ {exp.relatedFileName}</p>}
                            {!exp.staffName && !exp.relatedFileName && <span className="text-slate-300 italic text-xs">General</span>}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-700">{exp.purpose || exp.description}</td>
                      <td className={`p-4 text-right font-black whitespace-nowrap ${exp.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {exp.type === 'in' ? '+' : '-'} {Number(exp.amount).toLocaleString()}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <button onClick={() => handleOpenModal(exp)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase mr-3">Edit</button>
                        <button onClick={() => handleDelete(exp.id)} className="text-red-400 hover:text-red-600 font-bold text-xs uppercase">Delete</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-medium italic">No transactions match your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Reports" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* ADVISORY WARNINGS */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8">
             <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span>🚨</span> Advisory Warnings
             </h2>
             {reportData.advisoryWarnings.length > 0 ? (
                <div className="space-y-4">
                   {reportData.advisoryWarnings.map((w, idx) => (
                      <div key={idx} className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-xl flex justify-between items-center">
                         <div>
                            <h4 className="font-bold text-slate-800">{w.fileName}</h4>
                            <p className="text-sm font-medium text-orange-700 mt-1">{w.warning}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Billed vs Spent</p>
                            <p className="text-sm font-black whitespace-nowrap"><span className="text-blue-600">Ugx {w.billed.toLocaleString()}</span> / <span className="text-red-500">Ugx {w.spent.toLocaleString()}</span></p>
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-slate-500 font-medium text-sm">All files are within healthy expenditure margins.</p>
                </div>
             )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* STAFF EXPENDITURE */}
             <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8">
                <h2 className="text-lg font-black text-slate-800 mb-6">Expenditure by Staff</h2>
                {reportData.staffLabels.length > 0 ? (
                  <div style={{ height: "300px" }}>
                    <Bar 
                      data={{
                        labels: reportData.staffLabels,
                        datasets: [{
                          label: "Total Spent (UGX)",
                          data: reportData.staffValues,
                          backgroundColor: "#3b82f6",
                          borderRadius: 6
                        }]
                      }} 
                      options={{ maintainAspectRatio: false }} 
                    />
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm italic py-10 text-center">No allocated staff expenses yet.</p>
                )}
             </div>

             {/* FILE EXPENDITURE */}
             <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8">
                <h2 className="text-lg font-black text-slate-800 mb-6">Expenditure by File</h2>
                <div className="max-h-[300px] overflow-y-auto pr-2">
                   {reportData.fileList.length > 0 ? (
                     <div className="space-y-3">
                        {reportData.fileList.map((f, idx) => (
                           <div key={idx} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50 hover:border-blue-300 transition-colors">
                              <div className="flex-1 min-w-0 pr-4">
                                 <p className="font-bold text-sm text-slate-800 truncate" title={f.fileName}>{f.fileName}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                 <p className="font-black text-red-600 text-sm">UGX {f.spent.toLocaleString()}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                   ) : (
                     <p className="text-slate-400 text-sm italic py-10 text-center">No expenses linked to files yet.</p>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <h3 className="text-xl font-black text-slate-800">{editingId ? "Edit Transaction" : "Record Transaction"}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveExpense} className="p-6 overflow-y-auto space-y-6">
              
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button type="button" onClick={() => setFormData({...formData, type: "in"})} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'in' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}> Money In (+) </button>
                 <button type="button" onClick={() => setFormData({...formData, type: "out"})} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'out' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}> Money Out (-) </button>
              </div>

              <div className="group relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Date</label>
                <input type="date" required className="w-full bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>

              {formData.type === 'out' && (
                <div className="group relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Staff Member Receiving Funds</label>
                  <select 
                    className="w-full bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
                    value={formData.staffId} 
                    onChange={e => {
                       const staff = staffList.find(s => s.id === e.target.value);
                       setFormData({...formData, staffId: staff?.id || "", staffName: staff?.name || ""});
                    }}
                  >
                    <option value="">-- General / No Specific Staff --</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
              )}

              {formData.type === 'out' && (
                <div className="group relative z-40">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Link File (Optional)</label>
                  <div className="relative">
                    <div
                      onClick={() => setIsFileDropdownOpen(!isFileDropdownOpen)}
                      className={`w-full bg-slate-50/50 border ${isFileDropdownOpen ? "border-blue-500 ring-4 ring-blue-500/10" : "border-slate-200"} p-3.5 pl-10 rounded-xl font-bold text-sm text-slate-800 transition-all shadow-sm cursor-pointer flex justify-between items-center`}
                    >
                      <span className="truncate">{formData.relatedFileName || "-- General Expense --"}</span>
                      <span className={`text-slate-400 text-xs transition-transform ${isFileDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📎</span>
                    </div>

                    {isFileDropdownOpen && (
                      <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden max-h-72">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                          <div className="relative">
                            <input
                              autoFocus type="text" placeholder="Search files..."
                              className="w-full bg-white border border-slate-200 p-3 pl-9 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                              value={fileSearch} onChange={e => setFileSearch(e.target.value)} onClick={e => e.stopPropagation()}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                          </div>
                        </div>

                        <div className="overflow-y-auto p-2 space-y-1" onClick={e => e.stopPropagation()}>
                          <button type="button" className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition ${!formData.relatedFileId ? "bg-slate-100 text-slate-700" : "text-slate-500"}`}
                            onClick={() => { setFormData({ ...formData, relatedFileId: "", relatedFileType: "", relatedFileName: "" }); setIsFileDropdownOpen(false); setFileSearch(""); }}
                          >
                            ❌ No File Checked
                          </button>

                          {activeCases.filter(c => c.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                            <div className="pt-2">
                              <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Court Cases</p>
                              {activeCases.filter(c => c.fileName.toLowerCase().includes(fileSearch.toLowerCase())).map(c => (
                                <button type="button" key={`case-${c.id}`} className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center gap-2 ${formData.relatedFileId === c.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                  onClick={() => { setFormData({ ...formData, relatedFileId: c.id, relatedFileType: "case", relatedFileName: c.fileName }); setIsFileDropdownOpen(false); setFileSearch(""); }}
                                >
                                  <span className="text-sm">⚖️</span> {c.fileName}
                                </button>
                              ))}
                            </div>
                          )}

                          {activeTransactions.filter(t => t.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                            <div className="pt-2">
                              <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Transactions</p>
                              {activeTransactions.filter(t => t.fileName.toLowerCase().includes(fileSearch.toLowerCase())).map(t => (
                                <button type="button" key={`tx-${t.id}`} className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center gap-2 ${formData.relatedFileId === t.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                  onClick={() => { setFormData({ ...formData, relatedFileId: t.id, relatedFileType: "transaction", relatedFileName: t.fileName }); setIsFileDropdownOpen(false); setFileSearch(""); }}
                                >
                                  <span className="text-sm">💼</span> {t.fileName}
                                </button>
                              ))}
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                    {isFileDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsFileDropdownOpen(false)} />}
                  </div>
                </div>
              )}

              <div className="group relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Purpose / Details</label>
                <input required placeholder="E.g., Money assigned for printing..." className="w-full bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                  value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} 
                />
              </div>

              <div className="group relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Amount (UGX)</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm leading-none">UGX</span>
                   <input required type="number" placeholder="0" className="w-full bg-slate-50/50 border border-slate-200 p-3.5 pl-14 rounded-xl font-black text-lg text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                     value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} 
                   />
                </div>
              </div>

              <div className="pt-4 flex gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-500 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                  Cancel
                </button>
                <button type="submit" className={`flex-1 text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-md active:scale-95 ${formData.type === 'in' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'}`}>
                  Save Transaction
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}