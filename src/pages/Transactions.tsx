import { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";

export default function Transactions() {
  const { 
    transactions = [], 
    lawyers = [], 
    addTransaction, 
    editTransaction, 
    deleteTransaction, 
    addTransactionProgress, 
    currentUser 
  } = useAppContext();

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteViewId, setNoteViewId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  
  const [form, setForm] = useState({
    fileName: "", 
    type: "",
    lawyerId: "",
    billedAmount: "",
    paidAmount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const activeTransaction = transactions.find(t => t.id === noteViewId);

  // --- FILTERING LOGIC ---
  const visibleTransactions = useMemo(() => {
    let data = transactions.filter((t) => t.type !== "Court Case" && !t.archived);
    
    if (currentUser?.role === "lawyer") {
      data = data.filter((t) => t.lawyerId === currentUser.id);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter((t) => {
        const lawyerName = lawyers.find(l => l.id === t.lawyerId)?.name.toLowerCase() || "";
        return (
          t.fileName.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query) ||
          lawyerName.includes(query)
        );
      });
    }

    return [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentUser, searchQuery, lawyers]);

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    return visibleTransactions.reduce(
      (acc, t) => {
        const billed = Number(t.billedAmount) || 0;
        const paid = Number(t.paidAmount) || 0;
        const balance = billed - paid;
        acc.billed += billed;
        acc.paid += paid;
        acc.balance += balance;
        acc.totalFiles += 1;
        return acc;
      },
      { billed: 0, paid: 0, balance: 0, totalFiles: 0 }
    );
  }, [visibleTransactions]);

  const handleArchive = (id: string) => {
    if (confirm("Are you sure you want to archive this record? It will be moved to the Firm Archives.")) {
      editTransaction(id, { archived: true });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePostNote = () => {
    if (!newNote.trim() || !noteViewId) return;
    addTransactionProgress(noteViewId, newNote.trim());
    setNewNote("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const billed = Number(form.billedAmount) || 0;
    const paid = Number(form.paidAmount) || 0;

    const payload = {
      ...form,
      id: editingId ?? crypto.randomUUID(),
      billedAmount: billed,
      paidAmount: paid,
      balance: billed - paid,
      archived: false,
      progressNotes: editingId 
        ? (transactions.find(t => t.id === editingId)?.progressNotes || []) 
        : [],
    };

    if (editingId) {
      editTransaction(editingId, payload);
    } else {
      addTransaction(payload);
    }
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      fileName: "",
      type: "",
      lawyerId: "",
      billedAmount: "",
      paidAmount: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      
      {/* HEADER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 font-medium text-sm">Manage client billing and files</p>
        </div>
        <div className="relative w-full md:w-96">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search files..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>
      </div>

      {/* SUMMARY CARDS - Stacked on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Active Files</p>
          <p className="text-slate-900 text-xl font-black">{stats.totalFiles}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-3xl shadow-lg">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Billed</p>
          <p className="text-white text-xl font-black truncate">UGX {stats.billed.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-600 p-5 rounded-3xl shadow-lg">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Paid</p>
          <p className="text-white text-xl font-black truncate">UGX {stats.paid.toLocaleString()}</p>
        </div>
        <div className="bg-orange-600 p-5 rounded-3xl shadow-lg">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Debt</p>
          <p className="text-white text-xl font-black truncate">UGX {stats.balance.toLocaleString()}</p>
        </div>
      </div>

      {/* FORM - Optimized for mobile stacking */}
      <form onSubmit={handleSubmit} className="bg-white border rounded-2xl p-5 md:p-6 mb-8 shadow-sm">
        <h3 className="font-bold mb-6 text-slate-800 text-sm uppercase tracking-wider">
          {editingId ? "Update Transaction" : "New Transaction Entry"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">File/Client</label>
            <input name="fileName" placeholder="Name..." value={form.fileName} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 md:bg-white" required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Matter</label>
            <input name="type" list="cats" placeholder="Select..." value={form.type} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 md:bg-white" />
            <datalist id="cats">
              <option value="Letter of Demand" /><option value="Land Sale" /><option value="Company Reg" />
            </datalist>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Staff</label>
            <select name="lawyerId" value={form.lawyerId} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 md:bg-white" required>
              <option value="">Select...</option>
              {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Billed</label>
            <input name="billedAmount" type="number" placeholder="0" value={form.billedAmount} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 md:bg-white" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Paid</label>
            <input name="paidAmount" type="number" placeholder="0" value={form.paidAmount} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 md:bg-white" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
            <input name="date" type="date" value={form.date} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 md:bg-white" />
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button type="submit" className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md">
            {editingId ? "Update Record" : "Save Record"}
          </button>
          {editingId && (
            <button onClick={resetForm} type="button" className="w-full sm:w-auto text-gray-500 font-bold px-4 py-3 bg-gray-100 rounded-xl">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* TABLE - Scrollable on Mobile */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Matter / File</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Handling Lawyer</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Balance</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center">History</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 md:px-6 py-4">
                    <p className="font-bold text-slate-700 text-sm">{t.fileName}</p>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">{t.type}</p>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700">
                        {lawyers.find(l => l.id.toString() === t.lawyerId?.toString())?.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs font-semibold text-slate-600">
                        {lawyers.find(l => l.id.toString() === t.lawyerId?.toString())?.name || "Unassigned"}
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 md:px-6 py-4 text-right font-black text-sm ${((Number(t.billedAmount)||0)-(Number(t.paidAmount)||0)) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {((Number(t.billedAmount)||0)-(Number(t.paidAmount)||0)).toLocaleString()}
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                    <button onClick={() => setNoteViewId(t.id)} className="text-[9px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full border font-black hover:bg-slate-200">
                      NOTES ({t.progressNotes?.length || 0})
                    </button>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => {
                        setEditingId(t.id);
                        setForm({
                          fileName: t.fileName || "",
                          type: t.type || "",
                          lawyerId: t.lawyerId || "",
                          billedAmount: String(t.billedAmount || ""),
                          paidAmount: String(t.paidAmount || ""),
                          date: t.date ? t.date.split('T')[0] : ""
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase">Edit</button>
                      
                      <button onClick={() => handleArchive(t.id)} className="text-gray-400 hover:text-gray-600 text-[10px] font-black uppercase">Archive</button>
                      
                      <button onClick={() => { if(confirm("Permanently delete?")) deleteTransaction(t.id); }} className="text-red-300 hover:text-red-600 text-[10px] font-black uppercase">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">
                        No active transactions found matching your criteria.
                    </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (Activity Log) - Fully Responsive */}
      {noteViewId && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-[32px]">
              <div>
                <h3 className="font-black text-slate-800">Activity Log</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{activeTransaction?.fileName}</p>
              </div>
              <button onClick={() => setNoteViewId(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border text-2xl text-gray-400">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-white">
              {activeTransaction?.progressNotes?.map((n: any) => (
                <div key={n.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{n.authorName}</span>
                    <span className="text-[9px] font-bold text-slate-400">{n.date}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{n.message}</p>
                </div>
              ))}
              {(!activeTransaction?.progressNotes || activeTransaction.progressNotes.length === 0) && (
                 <div className="text-center py-10">
                   <p className="text-3xl mb-2">📄</p>
                   <p className="text-slate-400 font-medium italic text-sm">No history for this file yet.</p>
                 </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 rounded-b-[32px]">
              <div className="flex gap-2">
                <input 
                  placeholder="Type update here..." 
                  className="flex-1 bg-white border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" 
                  value={newNote} 
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePostNote()}
                />
                <button onClick={handlePostNote} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}