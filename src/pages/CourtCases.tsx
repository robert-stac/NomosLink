import { useState, useMemo, useEffect } from "react"; 
import { useLocation } from "react-router-dom"; 
import { useAppContext } from "../context/AppContext";

export default function CourtCases() {
  const { courtCases, addCourtCase, editCourtCase, deleteCourtCase, lawyers } = useAppContext();
  const location = useLocation(); 

  const [editingId, setEditingId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [lawyerId, setLawyerId] = useState("");
  const [billed, setBilled] = useState("");
  const [paid, setPaid] = useState("");
  const [nextDate, setNextDate] = useState("");
  
  // --- SEARCH & HIGHLIGHT LOGIC ---
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get("search");
    if (search) {
      setSearchTerm(search);
      const targetCase = courtCases.find(c => c.fileName.toLowerCase().includes(search.toLowerCase()));
      if (targetCase) {
        setHighlightId(targetCase.id);
        setTimeout(() => setHighlightId(null), 3000);
      }
    }
  }, [location, courtCases]);

  // --- FILTERING LOGIC (Hides Archived) ---
  const filteredCases = useMemo(() => {
    return courtCases
      .filter(c => !c.archived) 
      .filter(c => 
        c.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [courtCases, searchTerm]);

  // --- FORM FUNCTIONS ---
  const resetForm = () => {
    setFileName("");
    setLawyerId("");
    setBilled("");
    setPaid("");
    setNextDate("");
    setEditingId(null);
  };

  const handleSave = () => {
    if (!fileName || !billed || !lawyerId) {
        alert("Please fill in the File Name, Lawyer, and Billed Amount.");
        return;
    }
    
    const billedNum = Number(billed);
    const paidNum = Number(paid) || 0;
    const balance = billedNum - paidNum;

    // Logic Fix: Status is strictly "Ongoing" unless it is archived.
    // It no longer cares if the balance is 0.
    const caseData = {
      id: editingId || Date.now().toString(),
      fileName,
      lawyerId,
      billed: billedNum,
      paid: paidNum,
      balance,
      status: "Ongoing", 
      nextCourtDate: nextDate,
      archived: false,
      progressNotes: editingId ? undefined : [], 
    };

    if (editingId) {
      editCourtCase(editingId, caseData);
    } else {
      addCourtCase(caseData);
    }
    resetForm();
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setFileName(c.fileName);
    setLawyerId(c.lawyerId || ""); 
    setBilled(c.billed?.toString() || "");
    setPaid(c.paid?.toString() || "");
    setNextDate(c.nextCourtDate || "");
  };

  // --- ARCHIVE LOGIC (Now correctly marks as Completed) ---
  const handleArchive = (id: string) => {
    if (confirm("Move this case to the Firm Archives? This will mark it as Completed.")) {
      const now = new Date().toLocaleDateString();
      editCourtCase(id, {
        archived: true,
        status: "Completed", 
        completedDate: now,
      });
    }
  };

  // --- DELETE LOGIC (Permanent Delete) ---
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to PERMANENTLY delete this case? This cannot be undone.")) {
      deleteCourtCase(id);
    }
  };

  const formatCurrency = (n: number) => "UGX " + (n || 0).toLocaleString();

  // Summary logic updated to count based on archived status
  const activeCases = courtCases.filter(c => !c.archived);
  const totalCasesInSystem = courtCases.length;
  const ongoingCasesCount = activeCases.length;
  const completedCasesCount = courtCases.filter((c) => c.archived).length;
  const totalBilledValue = useMemo(() => activeCases.reduce((sum, c) => sum + (c.billed || 0), 0), [activeCases]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Court Cases</h1>
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
                type="text" 
                placeholder="Filter active files..." 
                className="border rounded-lg pl-9 pr-4 py-2 w-64 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-md rounded-lg p-4 text-center border-b-4 border-blue-500">
          <h2 className="text-gray-500 font-medium mb-2 uppercase text-[10px] tracking-wider">Total in System</h2>
          <p className="text-2xl font-bold text-slate-800">{totalCasesInSystem}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4 text-center border-b-4 border-yellow-500">
          <h2 className="text-gray-500 font-medium mb-2 uppercase text-[10px] tracking-wider">Active/Ongoing</h2>
          <p className="text-2xl font-bold text-slate-800">{ongoingCasesCount}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4 text-center border-b-4 border-green-500">
          <h2 className="text-gray-500 font-medium mb-2 uppercase text-[10px] tracking-wider">Archived/Done</h2>
          <p className="text-2xl font-bold text-slate-800">{completedCasesCount}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4 text-center border-b-4 border-purple-500">
          <h2 className="text-gray-500 font-medium mb-2 uppercase text-[10px] tracking-wider">Active Billing</h2>
          <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalBilledValue)}</p>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      <div className="bg-white shadow-md rounded-lg mb-8 overflow-hidden">
        <div className="bg-[#0B1F3A] text-white px-6 py-4 flex justify-between items-center">
          <h3 className="font-semibold tracking-tight">{editingId ? "Edit Court Case" : "Add Court Case"}</h3>
          {editingId && <button onClick={resetForm} className="text-[10px] bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md uppercase font-bold transition">Cancel Edit</button>}
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block font-bold text-slate-500 mb-2 text-xs uppercase">File Name *</label>
            <input className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. Civil Suit No. 12" />
          </div>
          <div>
            <label className="block font-bold text-slate-500 mb-2 text-xs uppercase">Assigned Lawyer *</label>
            <select className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" value={lawyerId} onChange={(e) => setLawyerId(e.target.value)}>
              <option value="">Select lawyer</option>
              {lawyers.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-500 mb-2 text-xs uppercase">Amount Billed (UGX) *</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" value={billed} onChange={(e) => setBilled(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block font-bold text-slate-500 mb-2 text-xs uppercase">Amount Paid (UGX)</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block font-bold text-slate-500 mb-2 text-xs uppercase">Next Court Date</label>
            <input type="date" className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={handleSave} className="bg-[#0B1F3A] text-white px-6 py-2.5 rounded-xl w-full hover:bg-[#09203b] transition font-black shadow-lg shadow-blue-900/20 uppercase text-xs tracking-widest">
              {editingId ? "Update Case Details" : "Register New Case"}
            </button>
          </div>
        </div>
      </div>

      {/* COURT CASES TABLE */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#0B1F3A] text-white">
              <th className="p-4 text-left uppercase text-[10px] tracking-widest">File Name</th>
              <th className="p-4 text-left uppercase text-[10px] tracking-widest">Lawyer</th>
              <th className="p-4 text-left uppercase text-[10px] tracking-widest">Status</th>
              <th className="p-4 text-left uppercase text-[10px] tracking-widest">Billed</th>
              <th className="p-4 text-left uppercase text-[10px] tracking-widest">Paid</th>
              <th className="p-4 text-left uppercase text-[10px] tracking-widest text-orange-300">Balance</th>
              <th className="p-4 text-left uppercase text-[10px] tracking-widest">Next Date</th>
              <th className="p-4 text-center uppercase text-[10px] tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCases.map((c: any) => (
              <tr 
                key={c.id} 
                className={`transition-colors duration-500 ${highlightId === c.id ? 'bg-yellow-100' : 'hover:bg-gray-50/80'}`}
              >
                <td className="p-4 font-black text-blue-900">{c.fileName}</td>
                <td className="p-4 font-medium text-slate-600">{lawyers.find((l: any) => l.id === c.lawyerId)?.name || "Unassigned"}</td>
                <td className="p-4">
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-blue-100 text-blue-700">
                        {c.status}
                    </span>
                </td>
                <td className="p-4 font-medium">{formatCurrency(c.billed)}</td>
                <td className="p-4 text-emerald-600 font-medium">{formatCurrency(c.paid)}</td>
                <td className="p-4 font-black text-red-600">{formatCurrency(c.balance)}</td>
                <td className="p-4 font-mono text-xs font-bold text-slate-500">{c.nextCourtDate || "TBA"}</td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(c)} className="p-1.5 bg-yellow-50 text-yellow-600 rounded-md hover:bg-yellow-100 transition" title="Edit">✏️</button>
                    <button onClick={() => handleArchive(c.id)} className="p-1.5 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition" title="Archive Case">📦</button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition" title="Delete Permanent">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCases.length === 0 && (
          <div className="p-16 text-center text-gray-400 italic">
            <div className="text-4xl mb-2 opacity-20">📁</div>
            No active cases found.
          </div>
        )}
      </div>
    </div>
  );
}