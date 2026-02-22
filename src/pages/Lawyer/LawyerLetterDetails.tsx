import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

export default function LawyerLetterDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentUser, 
    letters, 
    updateLetter, 
    addLetterProgress,
    users // Added to identify assigned counsel
  } = useAppContext();
  const [newNote, setNewNote] = useState("");

  if (!currentUser) return <div className="p-10 text-center font-black text-slate-400">SESSION EXPIRED</div>;

  // 1. Find the letter by ID first
  const foundLetter = letters.find((l) => String(l.id) === String(id));

  // 2. Permission Logic: Allow Owner, Manager, or Admin
  const lid = foundLetter?.lawyerId || (foundLetter as any)?.lawyer?.id;
  const isOwner = foundLetter && String(lid) === String(currentUser.id);
  const isManager = currentUser.role === "manager";
  const isAdmin = currentUser.role === "admin";

  if (!foundLetter || (!isOwner && !isManager && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-xl text-center max-w-sm">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Letter Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">You may not have permission to view this correspondence or it has been moved.</p>
          <button onClick={() => navigate(-1)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const letter = foundLetter;
  const assignedLawyer = users.find(u => u.id === lid);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addLetterProgress(letter.id, newNote.trim());
    setNewNote("");
  };

  const toggleStatus = () => {
    const nextStatus = letter.status === "Completed" ? "Pending" : "Completed";
    updateLetter(letter.id, { status: nextStatus });
  };

  const downloadProgressReport = () => {
    if (!letter.progressNotes?.length) return;
    const headers = ["Date", "Author", "Update Details"];
    const rows = letter.progressNotes.map(n => [
      `"${n.date}"`,
      `"${n.authorName || "Counsel"}"`,
      `"${n.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Letter_Ref_${letter.id.slice(-6)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* TOP NAV */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-blue-600 transition">
            <span className="bg-white w-8 h-8 flex items-center justify-center rounded-xl shadow-sm">←</span> 
            Back
          </button>
          
          <div className="flex gap-3">
            {/* EXPORT BUTTON: Visible to Admin/Manager */}
            {(isManager || isAdmin) && (
              <button 
                onClick={downloadProgressReport}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
              >
                <span>📥</span> Export Notes
              </button>
            )}

            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
               letter.type === 'Incoming' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'
             }`}>
               {letter.type} Mail
             </span>

             <button 
                onClick={toggleStatus}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  letter.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {letter.status === 'Completed' ? '✓ Filed' : 'Mark as Actioned'}
             </button>
          </div>
        </div>

        {/* CONTENT CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-slate-100">
              <h1 className="text-3xl font-black text-slate-900 mb-4">{letter.subject}</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">Dated: {letter.date || "N/A"}</p>
              
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 leading-relaxed font-medium">
                  {letter.type === 'Incoming' 
                    ? "Correspondence received and awaiting formal response or filing. Details and progress notes are logged below." 
                    : "Outgoing correspondence drafted and dispatched. Tracking delivery and acknowledgment status."}
                </p>
              </div>
            </div>

            {/* PROGRESS NOTES */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-900 mb-6">History & Actions</h3>
              <div className="space-y-6">
                {letter.progressNotes?.length ? (
                  [...letter.progressNotes].reverse().map((note: any) => (
                    <div key={note.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-sm text-slate-700 font-bold mb-2">{note.message}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{note.date}</span>
                        <span className="text-[9px] font-black text-blue-400 uppercase">By {note.authorName || "System"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-sm font-medium">No actions logged yet.</p>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50">
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a comment or update on this letter..."
                  className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none mb-4"
                />
                <button onClick={handleAddNote} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-900 transition shadow-lg">
                  Update History
                </button>
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">
            <div className="bg-[#0B1F3A] text-white p-8 rounded-[40px] shadow-xl">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Letter Meta</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase">Ref ID</p>
                  <p className="text-sm font-bold">#{letter.id.slice(-6).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase">Counsel Responsible</p>
                  <p className="text-sm font-bold">{assignedLawyer?.name || "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase">Recipient/Sender</p>
                  <p className="text-sm font-bold">{letter.recipient || "Legal Department"}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h4 className="text-sm font-black text-slate-900 mb-4">Attached Docs</h4>
              <div className="flex flex-col gap-2">
                {letter.documents?.length ? (
                  letter.documents.map((doc: any) => (
                    <a key={doc.id} href={doc.url} target="_blank" className="text-[10px] font-black text-blue-600 bg-blue-50 p-3 rounded-xl hover:bg-blue-100 transition truncate">
                      📄 {doc.name}
                    </a>
                  ))
                ) : (
                  <p className="text-[10px] font-bold text-slate-400 italic">No attachments found.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}