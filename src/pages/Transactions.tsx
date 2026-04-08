import { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";

export default function Transactions() {
  const { 
    transactions = [], 
    lawyers = [], 
    clients = [],
    addTransaction, 
    editTransaction, 
    deleteTransaction, 
    addTransactionProgress, 
    editTransactionProgress,
    deleteTransactionProgress,
    currentUser 
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState("newest");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteViewId, setNoteViewId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  
  // --- CLIENT DROPDOWN LOGIC ---
  const [clientSearch, setClientSearch] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  const recentClients = useMemo(() => {
    return [...(clients || [])]
      .sort((a,b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime())
      .slice(0, 5);
  }, [clients]);

  const filteredClientsForDropdown = useMemo(() => {
    if (!clientSearch) return recentClients;
    return (clients || []).filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 50);
  }, [clients, clientSearch, recentClients]);
  
  const [form, setForm] = useState({
    fileName: "", 
    type: "",
    lawyerId: "",
    clientId: "",
    billedAmount: "",
    paidAmount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const activeTransaction = transactions.find(t => t.id === noteViewId);
  const selectedClient = (clients || []).find(c => c.id === form.clientId);

  const visibleTransactions = useMemo(() => {
    let data = transactions.filter((t) => t.type !== "Court Case" && !t.archived);
    
    if (currentUser?.role === "lawyer") {
      // FIX: Use String() comparison on both sides to avoid type mismatch
      data = data.filter((t) => String(t.lawyerId) === String(currentUser.id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter((t) => {
        const lawyerName = lawyers.find(l => String(l.id) === String(t.lawyerId))?.name.toLowerCase() || "";
        return (
          t.fileName.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query) ||
          lawyerName.includes(query)
        );
      });
    }

    return [...data].sort((a, b) => {
      switch (sortType) {
        case "newest": return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        case "oldest": return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        case "az": return a.fileName.localeCompare(b.fileName);
        case "za": return b.fileName.localeCompare(a.fileName);
        case "billed-desc": return (Number(b.billedAmount) || 0) - (Number(a.billedAmount) || 0);
        case "balance-desc": return ((Number(b.billedAmount)||0) - (Number(b.paidAmount)||0)) - ((Number(a.billedAmount)||0) - (Number(a.paidAmount)||0));
        default: return 0;
      }
    });
  }, [transactions, currentUser, searchQuery, lawyers, sortType]);

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
    if (confirm("Move this transaction to the Firm Archives?")) {
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
      id: editingId ?? Date.now().toString(),
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
    setClientSearch("");
    setForm({
      fileName: "",
      type: "",
      lawyerId: "",
      clientId: "",
      billedAmount: "",
      paidAmount: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const formatCurrency = (n: number) => "UGX " + n.toLocaleString();

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 font-medium text-sm">Non-court client billing & legal services</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={sortType}
            onChange={(e) => setSortType(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">Client Name (A-Z)</option>
            <option value="za">Client Name (Z-A)</option>
            <option value="billed-desc">Highest Billed</option>
            <option value="balance-desc">Highest Balance Due</option>
          </select>
          <div className="relative w-full md:w-80">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search transactions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Active Matters</p>
          <p className="text-slate-900 text-xl font-black">{stats.totalFiles}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-3xl shadow-lg">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Total Billed</p>
          <p className="text-white text-xl font-black truncate">{formatCurrency(stats.billed)}</p>
        </div>
        <div className="bg-emerald-600 p-5 rounded-3xl shadow-lg">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Total Paid</p>
          <p className="text-white text-xl font-black truncate">{formatCurrency(stats.paid)}</p>
        </div>
        <div className="bg-orange-600 p-5 rounded-3xl shadow-lg">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Outstanding Debt</p>
          <p className="text-white text-xl font-black truncate">{formatCurrency(stats.balance)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-2xl p-5 md:p-6 mb-8 shadow-sm">
        <h3 className="font-black mb-6 text-slate-800 text-[17px] uppercase tracking-[0.1em]">
          {editingId ? "Modify Transaction Record" : "New Transaction Entry"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-slate-500 uppercase ml-1">File / Client Name</label>
            <input name="fileName" placeholder="Client Name..." value={form.fileName} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-slate-500 uppercase ml-1">Matter Type</label>
            <input name="type" list="cats" placeholder="e.g. Land Sale" value={form.type} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
            <datalist id="cats">
              <option value="Letter of Demand" /><option value="Land Sale" /><option value="Company Reg" /><option value="Agreement Review" />
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-slate-500 uppercase ml-1">Assigned Staff</label>
            <select name="lawyerId" value={form.lawyerId} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" required>
              <option value="">Select...</option>
              {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 relative">
            <label className="text-[12px] font-bold text-slate-500 uppercase ml-1">Client Selection</label>
            <input 
              type="text"
              value={isClientDropdownOpen ? clientSearch : (selectedClient ? selectedClient.name : "")}
              onChange={e => setClientSearch(e.target.value)}
              onFocus={() => { setIsClientDropdownOpen(true); setClientSearch(""); }}
              onBlur={() => setTimeout(() => setIsClientDropdownOpen(false), 200)}
              placeholder="Search or select client..."
              className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 w-full"
            />
            <span className="absolute right-3 top-[34px] text-gray-400 pointer-events-none text-xs">▼</span>
            
            {isClientDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 top-[60px] bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {!clientSearch && <div className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50 font-bold uppercase tracking-widest sticky top-0">Recent Clients</div>}
                
                <div 
                  className="px-4 py-3 text-sm hover:bg-red-50 text-slate-500 cursor-pointer border-b border-gray-100 transition flex items-center justify-between"
                  onMouseDown={(e) => { e.preventDefault(); setForm({ ...form, clientId: "" }); setIsClientDropdownOpen(false); }}
                >
                  <span className="italic">-- Clear selection (Optional) --</span>
                  {form.clientId === "" && <span className="text-emerald-500">✓</span>}
                </div>

                {filteredClientsForDropdown.map(c => (
                  <div 
                    key={c.id} 
                    className={`px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer transition flex justify-between items-center ${form.clientId === c.id ? 'bg-blue-50/50' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); setForm({ ...form, clientId: c.id }); setIsClientDropdownOpen(false); }}
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{c.name}</div>
                      {c.email && <div className="text-[10px] text-slate-400 font-medium">{c.email}</div>}
                    </div>
                    {form.clientId === c.id && <span className="text-emerald-500 font-bold">✓</span>}
                  </div>
                ))}
                
                {filteredClientsForDropdown.length === 0 && (
                  <div className="px-4 py-8 text-sm text-slate-400 text-center italic">No clients found matching "{clientSearch}"</div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-slate-500 uppercase ml-1">Billed (UGX)</label>
            <input name="billedAmount" type="number" placeholder="0" value={form.billedAmount} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-slate-500 uppercase ml-1">Paid (UGX)</label>
            <input name="paidAmount" type="number" placeholder="0" value={form.paidAmount} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-slate-500 uppercase ml-1">Date</label>
            <input name="date" type="date" value={form.date} onChange={handleInputChange} className="border p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button type="submit" className="w-full sm:w-auto bg-[#0B1F3A] hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-black transition-all shadow-lg text-xs uppercase tracking-widest">
            {editingId ? "Update Transaction" : "Save Transaction"}
          </button>
          {editingId && (
            <button onClick={resetForm} type="button" className="w-full sm:w-auto text-gray-500 font-bold px-6 py-3 bg-gray-100 rounded-xl text-xs uppercase">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-[#0B1F3A] text-white">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Matter / Client</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Handling Lawyer</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Balance</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Notes</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-800 font-normal">{t.fileName}</p>
                    <p className="text-[15px] text-blue-600 font-black uppercase tracking-tighter font-normal">{t.type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      {/* FIX: Use String() comparison here too */}
                      {lawyers.find(l => String(l.id) === String(t.lawyerId))?.name || "Unassigned"}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-black text-sm ${((Number(t.billedAmount)||0)-(Number(t.paidAmount)||0)) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {formatCurrency((Number(t.billedAmount)||0)-(Number(t.paidAmount)||0))}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => setNoteViewId(t.id)} className="text-[9px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 font-black hover:bg-white transition-all">
                      HISTORY ({t.progressNotes?.length || 0})
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-4">
                      <button onClick={() => {
                        setEditingId(t.id);
                        setForm({
                          fileName: t.fileName || "",
                          type: t.type || "",
                          lawyerId: t.lawyerId || "",
                          clientId: t.clientId || "",
                          billedAmount: String(t.billedAmount || ""),
                          paidAmount: String(t.paidAmount || ""),
                          date: t.date ? t.date.split('T')[0] : ""
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase">Edit</button>
                      <button onClick={() => handleArchive(t.id)} className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase">Archive</button>
                      <button onClick={() => { if(confirm("Permanently delete this transaction?")) deleteTransaction(t.id); }} className="text-red-300 hover:text-red-600 text-[10px] font-black uppercase">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {noteViewId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Activity Log</h3>
                <p className="text-[10px] font-bold text-blue-600 uppercase">{activeTransaction?.fileName}</p>
              </div>
              <button onClick={() => { setNoteViewId(null); setEditingNoteId(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border text-xl text-slate-400 hover:text-red-500 transition-colors shadow-sm">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-white">
              {[...(activeTransaction?.progressNotes || [])].map((n: any) => {
                const renderDate = (dStr: string) => {
                  const d = new Date(dStr);
                  if (isNaN(d.getTime())) return dStr;
                  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                };
                return (
                <div key={n.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded shrink-0">{n.authorName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold text-slate-400 shrink-0">{renderDate(n.date)}</span>
                      {currentUser?.id === n.authorId && editingNoteId !== n.id && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.message); }}
                            className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all font-bold text-xs"
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => { if (confirm("Delete this progress note?")) deleteTransactionProgress(activeTransaction!.id, n.id); }}
                            className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-400 hover:text-red-500 hover:border-red-300 transition-all font-bold text-xs"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {editingNoteId === n.id ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <textarea
                        className="w-full bg-white border border-blue-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium min-h-[80px]"
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setEditingNoteId(null); setEditingNoteText(""); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!editingNoteText.trim() || !activeTransaction) return;
                            editTransactionProgress(activeTransaction.id, n.id, editingNoteText.trim());
                            setEditingNoteId(null);
                            setEditingNoteText("");
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed font-medium block whitespace-pre-wrap">{n.message}</p>
                  )}
                </div>
              )})}
              {(!activeTransaction?.progressNotes || activeTransaction.progressNotes.length === 0) && (
                <div className="text-center py-10 opacity-40">
                  <p className="text-3xl mb-2">📁</p>
                  <p className="text-slate-400 font-bold italic text-xs uppercase tracking-widest">No history recorded.</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-slate-50">
              <div className="flex gap-2">
                <input 
                  placeholder="Note progress..." 
                  className="flex-1 bg-white border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" 
                  value={newNote} 
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePostNote()}
                />
                <button onClick={handlePostNote} className="bg-[#0B1F3A] text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}