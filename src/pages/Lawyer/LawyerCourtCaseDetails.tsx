import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

export default function LawyerCourtCaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentUser, 
    courtCases, 
    updateCourtCase, 
    addCourtCaseProgress,
    users // Added to find the assigned lawyer's name
  } = useAppContext();
  
  const [newNote, setNewNote] = useState("");

  if (!currentUser) return <div className="p-10 text-center font-black text-slate-400">SESSION EXPIRED</div>;

  // 1. Find the case by ID only first
  const foundCase = courtCases.find((c) => String(c.id) === String(id));

  // 2. Determine Permission
  const isOwner = foundCase && String(foundCase.lawyerId) === String(currentUser.id);
  const isManager = currentUser.role === "manager";
  const isAdmin = currentUser.role === "admin";

  // If case doesn't exist OR user isn't allowed to see it, show error
  if (!foundCase || (!isOwner && !isManager && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-xl text-center max-w-sm">
          <div className="text-4xl mb-4">⚖️</div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Case Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">You may not have permission to view this file or the ID is incorrect.</p>
          <button onClick={() => navigate(-1)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const courtCase = foundCase;
  // Get assigned lawyer's name for the reference card
  const assignedLawyer = users.find(u => u.id === courtCase.lawyerId);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addCourtCaseProgress(courtCase.id, newNote.trim());
    setNewNote("");
  };

  const toggleStatus = () => {
    const nextStatus = courtCase.status === "Completed" ? "Ongoing" : "Completed";
    updateCourtCase(courtCase.id, { status: nextStatus });
  };

  const downloadProgressReport = () => {
    if (!courtCase.progressNotes?.length) return;
    const headers = ["Date", "Author", "Update Details"];
    const rows = courtCase.progressNotes.map(n => [
      `"${n.date}"`,
      `"${n.authorName}"`,
      `"${n.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${courtCase.fileName}_Court_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition">
            ← Back to Portfolio
          </button>
          
          <div className="flex gap-3">
            {/* DOWNLOAD BUTTON: Only visible to Managers/Admins */}
            {(isManager || isAdmin) && (
              <button 
                onClick={downloadProgressReport}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
              >
                <span>📥</span> Export Notes
              </button>
            )}

            <button 
              onClick={toggleStatus}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                courtCase.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {courtCase.status === 'Completed' ? '✓ Case Closed' : 'Mark as Completed'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: MAIN INFO */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-slate-100">
              <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 inline-block">
                Court Matter
              </span>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">{courtCase.fileName}</h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                {courtCase.details || "Ongoing litigation matter. See progression history for recent updates."}
              </p>
            </div>

            {/* PROGRESS LOG */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 mb-8">Matter Progression</h3>
              <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-slate-100">
                {courtCase.progressNotes?.length ? (
                  [...courtCase.progressNotes].reverse().map((note) => (
                    <div key={note.id} className="relative pl-10">
                      <div className="absolute left-1.5 top-2 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                        <p className="text-sm font-bold text-slate-700 mb-2">{note.message}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          Logged on {note.date} by {note.authorName}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pl-10 text-slate-400 font-bold italic text-sm">No recorded updates.</div>
                )}
              </div>

              {/* ADD UPDATE FORM */}
              <div className="mt-10 pt-10 border-t border-slate-50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Post Case Update</h4>
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Summarize today's court appearance or filing..."
                  className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  rows={3}
                />
                <button 
                  onClick={handleAddNote}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition shadow-lg"
                >
                  Save Progression
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: QUICK STATS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0B1F3A] text-white p-8 rounded-[40px] shadow-xl">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">File Summary</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Next Court Date</p>
                  <p className="text-lg font-black text-blue-200">{courtCase.nextCourtDate || "TBD"}</p>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Outstanding Balance</p>
                  <p className="text-lg font-black">
                    UGX {((courtCase.billed || 0) - (courtCase.paid || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Reference</h4>
              <p className="text-xs font-bold text-slate-600">ID: #{courtCase.id.slice(-8).toUpperCase()}</p>
              <p className="text-xs font-bold text-slate-600 mt-2">Assigned To: {assignedLawyer?.name || "Unknown"}</p>
              <p className="text-[9px] font-black text-blue-600 uppercase mt-1">Viewing as: {currentUser.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}