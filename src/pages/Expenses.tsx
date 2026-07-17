import { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabaseClient";
import { buildExpenseForDb, buildExpenseRecord } from "../utils/expenseUtils";
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
  const { expenses, setExpenses, users, courtCases, transactions, letters, currentUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<"Ledger" | "Reports">("Ledger");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [plStartDate, setPlStartDate] = useState("");
  const [plEndDate, setPlEndDate] = useState("");

  const EXPENSE_CATEGORIES = [
    "Commissioning fees",
    "Transport expenses",
    "Filing fees",
    "Office supplies",
    "Court Attendance fees",
    "Facilitation",
    "Stationery & Printing",
    "Car Repair & Maintenance",
    "Meals",
    "Office repairs & Maintenance",
    "Telephone & Internet Services",
    "Cost of Service",
    "Others",
  ];

  const INCOME_CATEGORIES = [
    "Court Attendance",
    "Legal fees",
    "Statutory Declaration",
    "Power of Attorney",
    "Other incomes",
  ];

  const [formData, setFormData] = useState({
    type: "out" as "in" | "out",
    date: "",
    purpose: "",
    amount: "",
    category: "",
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
      const matchesCategory = filterCategory === "All" || (exp.category || "") === filterCategory;
      const matchesDateFrom = !filterDateFrom || new Date(exp.date) >= new Date(filterDateFrom);
      const matchesDateTo = !filterDateTo || new Date(exp.date) <= new Date(filterDateTo);
      return matchesSearch && matchesType && matchesCategory && matchesDateFrom && matchesDateTo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, filterType, filterCategory, filterDateFrom, filterDateTo]);

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
    const categoryTotals: Record<string, number> = {};
    const incomeCategoryTotals: Record<string, number> = {};

    activeCases.forEach(c => fileBilled[c.id] = Number(c.billed || 0));
    activeTransactions.forEach(t => fileBilled[t.id] = Number(t.billedAmount || 0));
    activeLetters.forEach(l => fileBilled[l.id] = Number((l as any).billed || 0));

    let filteredForReport = expenses || [];
    if (plStartDate) {
      filteredForReport = filteredForReport.filter(e => e.date >= plStartDate);
    }
    if (plEndDate) {
      filteredForReport = filteredForReport.filter(e => e.date <= plEndDate);
    }

    filteredForReport.forEach(exp => {
      const amt = Number(exp.amount || 0);
      if (exp.type === "in" && amt > 0) {
        const cat = exp.category || "Other incomes";
        incomeCategoryTotals[cat] = (incomeCategoryTotals[cat] || 0) + amt;
      } else if (exp.type !== "in" && amt > 0) {
        if (exp.staffName) {
          staffTotals[exp.staffName] = (staffTotals[exp.staffName] || 0) + amt;
        }
        if (exp.relatedFileId && exp.relatedFileName) {
          fileTotals[exp.relatedFileId] = (fileTotals[exp.relatedFileId] || 0) + amt;
        }
        const cat = exp.category || "Uncategorised";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });

    const staffLabels = Object.keys(staffTotals);
    const staffValues = Object.values(staffTotals);

    const advisoryWarnings: any[] = [];
    Object.keys(fileTotals).forEach(fid => {
      const spent = fileTotals[fid];
      const billed = fileBilled[fid] || 0;
      const exp = filteredForReport.find(e => e.relatedFileId === fid);
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
      const exp = filteredForReport.find(e => e.relatedFileId === k);
      return {
        fileName: exp ? exp.relatedFileName : "Unknown",
        spent: fileTotals[k],
        billed: fileBilled[k] || 0
      };
    }).sort((a, b) => b.spent - a.spent);

    const categoryList = Object.entries(categoryTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const incomeCategoryList = Object.entries(incomeCategoryTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const grandTotal = categoryList.reduce((s, c) => s + c.total, 0);
    const grandIncomeTotal = incomeCategoryList.reduce((s, c) => s + c.total, 0);

    return { staffLabels, staffValues, advisoryWarnings, fileList, categoryList, grandTotal, incomeCategoryList, grandIncomeTotal, filteredForReport };
  }, [expenses, activeCases, activeTransactions, activeLetters, plStartDate, plEndDate]);

  const handleExportPLCSV = () => {
    if (reportData.categoryList.length === 0 && reportData.incomeCategoryList.length === 0) return alert("No P&L data to export");
    const dates = reportData.filteredForReport.map(e => e.date).filter(Boolean).sort();
    const period = dates.length > 0 ? `${new Date(dates[0]).toLocaleDateString()} - ${new Date(dates[dates.length - 1]).toLocaleDateString()}` : "N/A";
    
    const rows = [
      ["Profit & Loss Report"],
      ["Period:", period],
      [],
      ["INCOME", "Amount (UGX)"]
    ];

    reportData.incomeCategoryList.forEach(c => rows.push([c.name, c.total.toString()]));
    rows.push(["TOTAL INCOME", reportData.grandIncomeTotal.toString()]);
    rows.push([]);
    rows.push(["EXPENSES", "Amount (UGX)"]);
    reportData.categoryList.forEach(c => rows.push([c.name, c.total.toString()]));
    rows.push(["TOTAL EXPENSES", reportData.grandTotal.toString()]);
    rows.push([]);
    const net = reportData.grandIncomeTotal - reportData.grandTotal;
    rows.push([net >= 0 ? "NET PROFIT" : "NET LOSS", Math.abs(net).toString()]);

    const csvContent = rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BCA_Profit_and_Loss_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return alert("No data to export");
    const headers = ["Date", "Type", "Category", "Staff Name", "Purpose", "File Name", "Amount (UGX)"];
    const rows = filteredExpenses.map((exp: any) => [
      exp.date,
      exp.type === "in" ? "Money In" : "Money Out",
      exp.category || "",
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
        category: expense.category || "",
        staffId: expense.staffId || "",
        staffName: expense.staffName || "",
        relatedFileId: expense.relatedFileId || "",
        relatedFileType: expense.relatedFileType || "",
        relatedFileName: expense.relatedFileName || ""
      });
    } else {
      setEditingId(null);
      setFormData({ type: "out", date: "", purpose: "", amount: "", category: "", staffId: "", staffName: "", relatedFileId: "", relatedFileType: "", relatedFileName: "" });
    }
    setShowModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const baseData: Record<string, any> = {
      date: formData.date,
      amount: Math.round(Number(formData.amount)),
      description: formData.purpose,
      purpose: formData.purpose,
      category: formData.category || (formData.type === 'in' ? "Other incomes" : "Others"),
    };

    let newExpense: Record<string, any>;
    if (editingId) {
      newExpense = buildExpenseRecord({
        id: editingId,
        baseData,
        formData,
        currentUser,
      });
      setExpenses((prevExpenses: any[]) => prevExpenses.map((exp: any) => exp.id === editingId ? { ...exp, ...newExpense } : exp));
    } else {
      newExpense = buildExpenseRecord({
        id: crypto.randomUUID(),
        baseData,
        formData,
        currentUser,
      });
      setExpenses((prevExpenses: any[]) => [...(prevExpenses || []), newExpense]);
    }

    if (navigator.onLine) {
      const expenseForDb = buildExpenseForDb(newExpense);

      console.log('[Expense Save] Payload:', expenseForDb);
      const { error, data } = await supabase.from('expenses').upsert([expenseForDb], { onConflict: 'id' });
      if (error) {
        console.error('[Expense Save] Error:', error.message);
        alert(`Expense save failed: ${error.message}`);
      } else {
        console.log('[Expense Save] Success:', data);
      }
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

          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search by purpose, staff, or file name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] bg-white border border-slate-200 p-3.5 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-slate-900 shadow-sm transition-all"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white border border-slate-200 p-3.5 rounded-xl font-bold text-sm outline-none shadow-sm cursor-pointer"
            >
              <option value="All">All Transactions</option>
              <option value="in">Money In (+)</option>
              <option value="out">Money Out (-)</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-200 p-3.5 rounded-xl font-bold text-sm outline-none shadow-sm cursor-pointer"
            >
              <option value="All">All Categories</option>
              {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="bg-white border border-slate-200 p-3.5 rounded-xl font-bold text-sm outline-none shadow-sm" title="Start Date" />
              <span className="text-slate-400 font-bold text-sm px-1">to</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="bg-white border border-slate-200 p-3.5 rounded-xl font-bold text-sm outline-none shadow-sm" title="End Date" />
            </div>
            {(filterType !== "All" || filterCategory !== "All" || searchTerm || filterDateFrom || filterDateTo) && (
              <button onClick={() => { setFilterType("All"); setFilterCategory("All"); setSearchTerm(""); setFilterDateFrom(""); setFilterDateTo(""); }} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Clear</button>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Category</th>
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
                      <td className="p-2">
                        {exp.type === 'in'
                          ? <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider">In (+)</span>
                          : <span className="text-red-700 rounded text-[10px] font-black">Out (-)</span>
                        }
                      </td>
                      <td className="p-4">
                        {exp.category ? (
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{exp.category}</span>
                        ) : (
                          <span className="text-slate-300 italic text-xs">—</span>
                        )}
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
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-medium italic">No transactions match your search.</td></tr>
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

          {/* PROFIT & LOSS */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Profit &amp; Loss</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Period: {(() => {
                    const dates = reportData.filteredForReport.map(e => e.date).filter(Boolean).sort();
                    if (dates.length === 0) return "No data";
                    return `${new Date(dates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(dates[dates.length - 1]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                  })()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <input type="date" value={plStartDate} onChange={e => setPlStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold outline-none" title="Start Date" />
                  <span className="text-slate-400 text-xs font-bold">to</span>
                  <input type="date" value={plEndDate} onChange={e => setPlEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold outline-none" title="End Date" />
                  {(plStartDate || plEndDate) && (
                    <button onClick={() => { setPlStartDate(""); setPlEndDate(""); }} className="text-xs text-slate-500 hover:text-slate-800 px-2 font-bold">Clear</button>
                  )}
                </div>
                <button
                  onClick={handleExportPLCSV}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-emerald-100 transition-colors"
                >📥 Download CSV</button>
                <button
                  onClick={() => {
                    const win = window.open("", "_blank");
                    if (!win) return;
                    const dates = reportData.filteredForReport.map(e => e.date).filter(Boolean).sort();
                    const period = dates.length > 0 ? `${new Date(dates[0]).toLocaleDateString()} – ${new Date(dates[dates.length - 1]).toLocaleDateString()}` : "N/A";
                    const incRows = reportData.incomeCategoryList.map(c => `<tr><td style="padding:8px;border:1px solid #ddd">${c.name}</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#059669">UGX ${c.total.toLocaleString()}</td></tr>`).join("");
                    const expRows = reportData.categoryList.map(c => `<tr><td style="padding:8px;border:1px solid #ddd">${c.name}</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#dc2626">UGX ${c.total.toLocaleString()}</td></tr>`).join("");
                    const net = reportData.grandIncomeTotal - reportData.grandTotal;
                    win.document.write(`<html><head><title>Profit & Loss</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-bottom:24px}h3{margin-top:24px}</style></head><body><h2>Profit & Loss</h2><p>Period: ${period}</p><h3 style="color:#059669">Income</h3><table><thead><tr><th style="padding:8px;border:1px solid #ddd;text-align:left">Category</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Amount</th></tr></thead><tbody>${incRows}</tbody><tfoot><tr style="background:#f0fdf4"><td style="padding:8px;border:1px solid #ddd;font-weight:bold">TOTAL INCOME</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold">UGX ${reportData.grandIncomeTotal.toLocaleString()}</td></tr></tfoot></table><h3 style="color:#dc2626">Expenses</h3><table><thead><tr><th style="padding:8px;border:1px solid #ddd;text-align:left">Category</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Amount</th></tr></thead><tbody>${expRows}</tbody><tfoot><tr style="background:#fef2f2"><td style="padding:8px;border:1px solid #ddd;font-weight:bold">TOTAL EXPENSES</td><td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold">UGX ${reportData.grandTotal.toLocaleString()}</td></tr></tfoot></table><table><tr style="background:${net >= 0 ? '#f0fdf4' : '#fef2f2'}"><td style="padding:12px;border:2px solid #333;font-weight:bold;font-size:16px">NET ${net >= 0 ? 'PROFIT' : 'LOSS'}</td><td style="padding:12px;border:2px solid #333;text-align:right;font-weight:bold;font-size:16px;color:${net >= 0 ? '#059669' : '#dc2626'}">UGX ${Math.abs(net).toLocaleString()}</td></tr></table></body></html>`);
                    win.document.close(); win.print();
                  }}
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-slate-700 transition-colors"
                >🖨️ Print P&amp;L</button>
              </div>
            </div>

            {/* INCOME */}
            <div className="mb-8">
              <h3 className="text-sm font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Income
              </h3>
              {reportData.incomeCategoryList.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/50 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="p-4 text-left">Category</th>
                      <th className="p-4 text-right">Amount (UGX)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.incomeCategoryList.map((cat, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-700">{cat.name}</td>
                        <td className="p-4 text-right font-black text-emerald-600">{cat.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50">
                      <td className="p-4 font-black text-emerald-800 uppercase text-xs tracking-widest">Total Income</td>
                      <td className="p-4 text-right font-black text-emerald-700">UGX {reportData.grandIncomeTotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-slate-400 text-sm italic py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No income recorded yet.</p>
              )}
            </div>

            {/* EXPENSES */}
            <div className="mb-8">
              <h3 className="text-sm font-black text-red-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Expenses
              </h3>
              {reportData.categoryList.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-red-50/50 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="p-4 text-left">Category</th>
                      <th className="p-4 text-right">Amount (UGX)</th>
                      <th className="p-4 text-right">% of Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.categoryList.map((cat, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-700">{cat.name}</td>
                        <td className="p-4 text-right font-black text-red-600">{cat.total.toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-slate-100 rounded-full h-1.5">
                              <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${reportData.grandTotal > 0 ? Math.round(cat.total / reportData.grandTotal * 100) : 0}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 w-10 text-right">
                              {reportData.grandTotal > 0 ? (cat.total / reportData.grandTotal * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-red-50">
                      <td className="p-4 font-black text-red-800 uppercase text-xs tracking-widest">Total Expenses</td>
                      <td className="p-4 text-right font-black text-red-700">UGX {reportData.grandTotal.toLocaleString()}</td>
                      <td className="p-4 text-right text-slate-500 text-xs font-bold">100%</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-slate-400 text-sm italic py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No categorised expenses yet.</p>
              )}
            </div>

            {/* NET PROFIT / LOSS */}
            <div className={`rounded-2xl p-6 flex justify-between items-center ${(reportData.grandIncomeTotal - reportData.grandTotal) >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Net {(reportData.grandIncomeTotal - reportData.grandTotal) >= 0 ? 'Profit' : 'Loss'}</p>
                <h3 className={`text-3xl font-black ${(reportData.grandIncomeTotal - reportData.grandTotal) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  UGX {Math.abs(reportData.grandIncomeTotal - reportData.grandTotal).toLocaleString()}
                </h3>
              </div>
              <div className="text-right text-sm font-medium text-slate-500">
                <p>Income: <span className="font-black text-emerald-600">UGX {reportData.grandIncomeTotal.toLocaleString()}</span></p>
                <p>Expenses: <span className="font-black text-red-600">UGX {reportData.grandTotal.toLocaleString()}</span></p>
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
              <button onClick={() => setShowModal(false)} className="flex items-center gap-1.5 text-slate-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors">
                ← Back
              </button>
              <h3 className="text-xl font-black text-slate-800">{editingId ? "Edit Transaction" : "Record Transaction"}</h3>
              <div className="w-16" />
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 overflow-y-auto space-y-6">

              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button type="button" onClick={() => setFormData({ ...formData, type: "in" })} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'in' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}> Money In (+) </button>
                <button type="button" onClick={() => setFormData({ ...formData, type: "out" })} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'out' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}> Money Out (-) </button>
              </div>

              <div className="group relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Date</label>
                <input type="date" required className="w-full bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                  value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="group relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Category</label>
                <select
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select category...</option>
                  {(formData.type === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {formData.type === 'out' && (
                <div className="group relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Staff Member Receiving Funds</label>
                  <select
                    className="w-full bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
                    value={formData.staffId}
                    onChange={e => {
                      const staff = staffList.find(s => s.id === e.target.value);
                      setFormData({ ...formData, staffId: staff?.id || "", staffName: staff?.name || "" });
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
                  value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>

              <div className="group relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Amount (UGX)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm leading-none">UGX</span>
                  <input required type="number" placeholder="0" className="w-full bg-slate-50/50 border border-slate-200 p-3.5 pl-14 rounded-xl font-black text-lg text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                    value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
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