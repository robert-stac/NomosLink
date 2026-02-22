import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAppContext } from "../../context/AppContext";

export default function TransactionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    transactions,
    currentUser,
    addTransactionProgress,
    editTransactionProgress,
    deleteTransactionProgress,
    uploadTransactionDocument,
    users // Added to identify assigned counsel
  } = useAppContext();

  const [note, setNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");

  // 🔒 Safety checks
  if (!currentUser) return <div className="p-10 text-center font-bold">Not logged in.</div>;

  const transaction = transactions.find((t) => t.id === id);

  if (!transaction) return <div className="p-10 text-center font-bold">Transaction not found.</div>;

  // 🔒 Access Control Logic
  const isOwner = transaction.lawyerId === currentUser.id;
  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";

  if (!isOwner && !isAdmin && !isManager) {
    return <div className="p-10 text-center text-red-500 font-bold">Access denied: You are not authorized to view this transaction.</div>;
  }

  const assignedLawyer = users.find(u => u.id === transaction.lawyerId);

  const handleAddNote = () => {
    if (!note.trim()) return;
    addTransactionProgress(transaction.id, note.trim());
    setNote("");
  };

  const downloadProgressReport = () => {
    if (!transaction.progressNotes?.length) return;
    const headers = ["Date", "Author", "Update Details"];
    const rows = transaction.progressNotes.map(n => [
      `"${n.date}"`,
      `"${n.authorName}"`,
      `"${n.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${transaction.fileName}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER NAVIGATION */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-500 font-bold hover:text-blue-600 transition">
            <span className="bg-white p-2 rounded-xl shadow-sm group-hover:shadow-md transition">←</span>
            Back to Dashboard
          </button>
          
          <div className="flex gap-3 items-center">
            {/* EXPORT BUTTON: Only visible to Managers/Admins */}
            {(isManager || isAdmin) && (
              <button 
                onClick={downloadProgressReport}
                className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
              >
                <span>📥</span> Export Notes
              </button>
            )}

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
              Counsel: {assignedLawyer?.name || "Unassigned"}
            </span>
            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${transaction.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                {transaction.status || 'Active'}
            </span>
          </div>
        </div>

        {/* MAIN FILE CARD */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl">📂</div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">{transaction.fileName}</h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-6">{transaction.type}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
            {/* Amount hidden from Manager to maintain financial privacy */}
            {!isManager ? (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Financial Value</p>
                <p className="text-xl font-black text-emerald-600">UGX {transaction.amount?.toLocaleString() ?? "0"}</p>
              </div>
            ) : (
               <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Financial Value</p>
                <p className="text-sm font-bold text-slate-300 italic">Restricted Access</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Commencement Date</p>
              <p className="text-slate-700 font-bold">{transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : "Not set"}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: PROGRESS TIMELINE */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span>📝</span> Progress Timeline
              </h3>

              <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-slate-100">
                {transaction.progressNotes?.length ? (
                  transaction.progressNotes.map((n: any) => {
                    const isNoteOwner = n.authorId === currentUser.id;
                    return (
                      <div key={n.id} className="relative pl-10 group">
                        <div className="absolute left-3 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-4 border-white shadow-sm ring-1 ring-blue-100"></div>
                        
                        {editingNoteId === n.id ? (
                          <div className="bg-slate-50 p-4 rounded-2xl border border-blue-100">
                            <textarea
                              value={editMessage}
                              onChange={(e) => setEditMessage(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => { editTransactionProgress(transaction.id, n.id, editMessage); setEditingNoteId(null); }} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold">Save Changes</button>
                              <button onClick={() => setEditingNoteId(null)} className="text-slate-400 text-xs font-bold">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="hover:bg-slate-50 p-2 rounded-2xl transition">
                            <p className="text-sm font-medium text-slate-700 leading-relaxed mb-2">{n.message}</p>
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                {n.authorName} • {n.date}
                              </p>
                              {isNoteOwner && (
                                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition">
                                  <button onClick={() => { setEditingNoteId(n.id); setEditMessage(n.message); }} className="text-blue-600 text-[10px] font-black">EDIT</button>
                                  <button onClick={() => deleteTransactionProgress(transaction.id, n.id)} className="text-red-500 text-[10px] font-black">DELETE</button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="pl-10 text-sm text-slate-400 italic">No notes recorded yet.</p>
                )}
              </div>
            </div>

            {/* ADD NOTE BOX - Available to Owner and Manager */}
            {(isOwner || isManager) && (
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                <h3 className="text-sm font-black text-slate-400 uppercase mb-4 tracking-widest">Add New Update</h3>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border-0 rounded-2xl p-4 mb-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="Summarize the status of this transaction..."
                />
                <button onClick={handleAddNote} className="bg-[#0B1F3A] text-white px-8 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition">
                  Commit Note
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: DOCUMENTS PANEL */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <span>📎</span> Documents
              </h3>
              
              <div className="space-y-3 mb-6">
                {transaction.documents?.length ? (
                  transaction.documents.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📄</span>
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{doc.name}</span>
                      </div>
                      <button className="text-blue-600 text-[10px] font-black">OPEN</button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 font-bold text-center py-4">No documents yet.</p>
                )}
              </div>

              {(isOwner || isManager) && (
                <div className="relative group">
                  <input
                    type="file"
                    accept=".pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadTransactionDocument(transaction.id, e.target.files[0]);
                    }}
                  />
                  <div className="bg-blue-50 text-blue-600 border-2 border-dashed border-blue-200 rounded-2xl p-4 text-center group-hover:bg-blue-100 transition">
                    <p className="text-xs font-black uppercase tracking-widest">Upload PDF</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}