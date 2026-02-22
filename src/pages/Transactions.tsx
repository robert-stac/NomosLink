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

  const visibleTransactions = useMemo(() => {
    let data = transactions.filter((t) => t.type !== "Court Case");
    if (currentUser?.role === "lawyer") {
      data = data.filter((t) => t.lawyerId === currentUser.id);
    }
    return [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentUser]);

  const totals = useMemo(() => {
    return visibleTransactions.reduce(
      (acc, t) => {
        acc.billed += Number(t.billedAmount) || 0;
        acc.paid += Number(t.paidAmount) || 0;
        acc.balance += (Number(t.billedAmount) || 0) - (Number(t.paidAmount) || 0);
        return acc;
      },
      { billed: 0, paid: 0, balance: 0 }
    );
  }, [visibleTransactions]);

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
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-3xl shadow-lg">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Total Billed</p>
          <p className="text-white text-2xl font-black">UGX {totals.billed.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Total Paid</p>
          <p className="text-white text-2xl font-black">UGX {totals.paid.toLocaleString()}</p>
        </div>
        <div className="bg-orange-600 p-6 rounded-3xl shadow-lg">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Outstanding</p>
          <p className="text-white text-2xl font-black">UGX {totals.balance.toLocaleString()}</p>
        </div>
      </div>

      {/* FORM WITH LABELS */}
      <form onSubmit={handleSubmit} className="bg-white border rounded-2xl p-6 mb-8 shadow-sm">
        <h3 className="font-bold mb-6 text-slate-800">{editingId ? "Update Transaction" : "New Transaction"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">File/Client Name</label>
            <input name="fileName" placeholder="Enter name..." value={form.fileName} onChange={handleInputChange} className="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Matter Category</label>
            <input name="type" list="cats" placeholder="Select type..." value={form.type} onChange={handleInputChange} className="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <datalist id="cats">
              <option value="Letter of Demand" /><option value="Land Sale" /><option value="Company Reg" />
            </datalist>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Assigned Lawyer</label>
            <select name="lawyerId" value={form.lawyerId} onChange={handleInputChange} className="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select Staff...</option>
              {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Billed (UGX)</label>
            <input name="billedAmount" type="number" placeholder="0" value={form.billedAmount} onChange={handleInputChange} className="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Paid (UGX)</label>
            <input name="paidAmount" type="number" placeholder="0" value={form.paidAmount} onChange={handleInputChange} className="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">File Date</label>
            <input name="date" type="date" value={form.date} onChange={handleInputChange} className="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button type="submit" className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-md">Save Record</button>
          {editingId && <button onClick={resetForm} type="button" className="text-gray-500 font-medium px-4">Cancel</button>}
        </div>
      </form>

      {/* TABLE WITH LAWYER COLUMN */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Matter</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Handling Lawyer</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Balance</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Progress</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700">{t.fileName}</p>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">{t.type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {lawyers.find(l => l.id.toString() === t.lawyerId?.toString())?.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-medium text-slate-600">
                        {lawyers.find(l => l.id.toString() === t.lawyerId?.toString())?.name || "Unassigned"}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-black ${((Number(t.billedAmount)||0)-(Number(t.paidAmount)||0)) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {((Number(t.billedAmount)||0)-(Number(t.paidAmount)||0)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => setNoteViewId(t.id)} className="text-[10px] bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-black hover:bg-blue-100 transition-colors">
                      NOTES ({t.progressNotes?.length || 0})
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
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
                    }} className="text-blue-600 hover:text-blue-800 mr-4 text-xs font-black uppercase">Edit</button>
                    <button onClick={() => deleteTransaction(t.id)} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {noteViewId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-xl">Activity Log</h3>
              <button onClick={() => setNoteViewId(null)} className="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {activeTransaction?.progressNotes?.map((n: any) => (
                <div key={n.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase">{n.authorName} ({n.authorRole})</span>
                    <span className="text-[10px] text-gray-400">{n.date}</span>
                  </div>
                  <p className="text-sm text-gray-700">{n.message}</p>
                </div>
              ))}
              {(!activeTransaction?.progressNotes || activeTransaction.progressNotes.length === 0) && (
                 <p className="text-center text-gray-400 italic py-10">No history for this file yet.</p>
              )}
            </div>
            <div className="p-6 border-t flex gap-2">
              <input 
                placeholder="Add update..." 
                className="flex-1 bg-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                value={newNote} 
                onChange={(e) => setNewNote(e.target.value)}
              />
              <button onClick={handlePostNote} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}