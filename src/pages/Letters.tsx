import { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { getAutoLabels } from "../utils/autoLabel";
import AutoLabelBadge from "../components/AutoLabelBadge";

// Added 'refNumber' and 'fileName' to sort options
type SortField = "date" | "billed" | "fileName" | "refNumber" | null;
type SortOrder = "asc" | "desc";

export default function Letters() {
  const { letters = [], lawyers = [], addLetter: addLetterToContext, editLetter, deleteLetter } = useAppContext();

  // --- PRESERVED STATE ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState("Incoming");
  const [lawyerId, setLawyerId] = useState("");
  const [subject, setSubject] = useState("");
  
  // --- NEW FIELDS ---
  const [fileName, setFileName] = useState(""); 
  const [refNumber, setRefNumber] = useState(""); 

  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [billed, setBilled] = useState("");
  const [paid, setPaid] = useState("");

  // --- FILTERS & SEARCH ---
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // --- SORTING ---
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const [showForm, setShowForm] = useState(false);

  const resetForm = () => {
    setType("Incoming");
    setLawyerId("");
    setSubject("");
    setFileName(""); 
    setRefNumber(""); // Reset Ref
    setDate("");
    setStatus("Pending");
    setBilled("");
    setPaid("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!lawyerId || !subject || !billed) return;

    const billedNum = parseFloat(billed);
    const paidNum = parseFloat(paid) || 0;
    const lawyerObj = lawyers.find((l) => l.id === lawyerId) || null;

    const newLetter = {
      id: editingId || Date.now().toString(),
      type,
      lawyer: lawyerObj,
      subject,
      fileName, 
      refNumber, // Save Ref
      date,
      status,
      billed: billedNum,
      paid: paidNum,
    };

    if (editingId) {
      editLetter(editingId, newLetter);
    } else {
      addLetterToContext(newLetter);
    }
    resetForm();
  };

  const handleEdit = (l: any) => {
    setEditingId(l.id);
    setType(l.type);
    setLawyerId(l.lawyer?.id || "");
    setSubject(l.subject);
    setFileName(l.fileName || ""); 
    setRefNumber(l.refNumber || ""); // Load Ref
    setDate(l.date);
    setStatus(l.status);
    setBilled(l.billed.toString());
    setPaid(l.paid.toString());
    setShowForm(true);
  };

  const handleQuickComplete = (l: any) => {
    editLetter(l.id, { ...l, status: l.status === "Completed" ? "Pending" : "Completed" });
  };

  const formatCurrency = (num: number) => "UGX " + num.toLocaleString();

  // PRESERVED SUMMARY LOGIC
  const totalLetters = letters.length;
  const incomingLetters = letters.filter((l) => l.type === "Incoming").length;
  const outgoingLetters = letters.filter((l) => l.type === "Outgoing").length;
  const totalBilled = useMemo(() => letters.reduce((sum, l) => sum + l.billed, 0), [letters]);

  // UPDATED FILTERING LOGIC
  const filteredLetters = letters.filter((l) => {
    const matchesFilter =
      (filterType === "All" || l.type === filterType) &&
      (filterStatus === "All" || l.status === filterStatus);

    const matchesSearch =
      searchQuery === "" ||
      l.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.fileName && l.fileName.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (l.refNumber && l.refNumber.toLowerCase().includes(searchQuery.toLowerCase())) || // Search Ref
      (l.lawyer?.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  // UPDATED SORTING LOGIC
  const sortedLetters = useMemo(() => {
    if (!sortField) return filteredLetters;
    return [...filteredLetters].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      // String sorting for fileName and refNumber
      if (sortField === "fileName" || sortField === "refNumber") {
         aVal = aVal || "";
         bVal = bVal || "";
         return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (sortField === "date") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (sortOrder === "asc") return aVal - bVal;
      else return bVal - aVal;
    });
  }, [filteredLetters, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Letters</h1>
            <p className="text-slate-500 font-medium">Manage and track correspondences</p>
        </div>
        <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-[#0B1F3A] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-blue-700 to-black"        >
            {showForm ? "Cancel Entry" : "+ Create New Letter"}
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Files", val: totalLetters, color: "text-slate-900" },
          { label: "Incoming", val: incomingLetters, color: "text-blue-600" },
          { label: "Outgoing", val: outgoingLetters, color: "text-indigo-600" },
          { label: "Total Billed", val: formatCurrency(totalBilled), color: "text-emerald-600" }
        ].map((card, idx) => (
          <div key={idx} className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 transition hover:shadow-md">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{card.label}</h2>
            <p className={`text-2xl font-black ${card.color}`}>{card.val}</p>
          </div>
        ))}
      </div>

      {/* ADD / UPDATE FORM */}
      {showForm && (
        <div className="bg-white shadow-xl rounded-[32px] mb-8 overflow-hidden border border-slate-200 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-[#0B1F3A] text-white px-8 py-5 flex justify-between items-center">
            <h3 className="font-black tracking-tight">{editingId ? "Modify Existing Record" : "Register New Correspondence"}</h3>
            <span className="text-[10px] font-bold opacity-50 uppercase">Step 1 of 1</span>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* FILE NAME & REF NUMBER (Grouped for Layout) */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">File Name</label>
              <input 
                type="text" 
                placeholder="e.g. Enter File Name..." 
                value={fileName} 
                onChange={(e) => setFileName(e.target.value)} 
                className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" 
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Ref Number</label>
              <input 
                type="text" 
                placeholder="e.g. BCA/___/0000/202___" 
                value={refNumber} 
                onChange={(e) => setRefNumber(e.target.value)} 
                className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" 
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Direction</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500">
                <option>Incoming</option>
                <option>Outgoing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Assigned Counsel *</label>
              <select value={lawyerId} onChange={(e) => setLawyerId(e.target.value)} className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500">
                <option value="">Select Counsel</option>
                {lawyers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Entry Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500">
                <option>Pending</option>
                <option>Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Professional Fees</label>
              <input placeholder="0.00" value={billed} onChange={(e) => setBilled(e.target.value)} className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Amount Recovered</label>
              <input placeholder="0.00" value={paid} onChange={(e) => setPaid(e.target.value)} className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Subject Matter</label>
              <textarea placeholder="Brief summary of letter content..." value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 h-24 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="lg:col-start-3 flex items-end gap-3">
              <button onClick={resetForm} className="flex-1 bg-slate-100 text-slate-500 font-bold py-3 rounded-2xl hover:bg-slate-200 transition">Discard</button>
              <button onClick={handleSave} className="flex-[2] bg-blue-600 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition">
                {editingId ? "Update Record" : "Commit Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div className="bg-white p-4 rounded-[28px] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input type="text" placeholder="Search Ref, File Name, or Subject..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600">
          <option value="All">All Types</option>
          <option value="Incoming">Incoming</option>
          <option value="Outgoing">Outgoing</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600">
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow-sm rounded-[32px] border border-slate-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-5 text-left text-[10px] font-black uppercase tracking-widest">Type</th>
              
              {/* FILE & REF COLUMNS */}
              <th className="p-5 text-left text-[10px] font-black uppercase tracking-widest cursor-pointer" onClick={() => toggleSort("fileName")}>
                 File Name {sortField === "fileName" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
               <th className="p-5 text-left text-[10px] font-black uppercase tracking-widest cursor-pointer" onClick={() => toggleSort("refNumber")}>
                 Ref No. {sortField === "refNumber" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>

              <th className="p-5 text-left text-[10px] font-black uppercase tracking-widest">Subject</th>
              <th className="p-5 text-left text-[10px] font-black uppercase tracking-widest cursor-pointer" onClick={() => toggleSort("date")}>
                Date {sortField === "date" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="p-5 text-left text-[10px] font-black uppercase tracking-widest">Status</th>
              <th className="p-5 text-left text-[10px] font-black uppercase tracking-widest cursor-pointer" onClick={() => toggleSort("billed")}>
                Financials {sortField === "billed" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="p-5 text-center text-[10px] font-black uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedLetters.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="p-5">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${l.type === 'Incoming' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {l.type}
                    </span>
                </td>

                {/* NEW COLUMNS */}
                <td className="p-5 font-bold text-slate-800">{l.fileName || "-"}</td>
                <td className="p-5 font-bold text-slate-500 text-xs">{l.refNumber || "-"}</td>

                <td className="p-5">
                    <p className="font-bold text-slate-800 line-clamp-1">{l.subject}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">{l.lawyer?.name || "Unassigned"}</p>
                </td>
                <td className="p-5 text-slate-500 font-medium">{l.date || "-"}</td>
                <td className="p-5">
                    <button onClick={() => handleQuickComplete(l)} className={`text-[10px] font-black px-3 py-1 rounded-lg transition ${l.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {l.status}
                    </button>
                </td>
                <td className="p-5">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400">Paid:</span>
                            <span className="text-slate-900">{formatCurrency(l.paid)}</span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(l.paid / l.billed) * 100}%` }}></div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400">Bal: {formatCurrency(l.billed - l.paid)}</p>
                    </div>
                </td>
                <td className="p-5 text-center">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(l)} className="p-2 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-100 transition">✏️</button>
                        <button onClick={() => deleteLetter(l.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition">🗑️</button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedLetters.length === 0 && (
          <div className="p-20 text-center">
            <div className="text-4xl mb-4 opacity-20">📂</div>
            <p className="text-slate-400 font-bold italic">No matching records found.</p>
          </div>
        )}
      </div>
    </div>
  );
}