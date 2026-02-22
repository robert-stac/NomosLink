import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

export default function CourtCaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, courtCases, updateCourtCase, addCourtCaseProgress } = useAppContext();
  const [newNote, setNewNote] = useState("");

  if (!currentUser) return <div className="p-10 text-center font-black text-slate-400">SESSION EXPIRED</div>;

  // Strict ID matching to prevent "Not Found" errors
  const courtCase = courtCases.find(
    (c) => String(c.id) === String(id) && String(c.lawyerId) === String(currentUser.id)
  );

  if (!courtCase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-xl text-center max-w-sm">
          <div className="text-4xl mb-4">⚖️</div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Matter Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">This case file is either restricted or has been archived.</p>
          <button onClick={() => navigate(-1)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Return to Workspace</button>
        </div>
      </div>
    );
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addCourtCaseProgress(courtCase.id, newNote.trim());
    setNewNote("");
  };

  const toggleStatus = () => {
    const nextStatus = courtCase.status === "Completed" ? "Ongoing" : "Completed";
    updateCourtCase(courtCase.id, { status: nextStatus });
  };

  // Financial calculations
  const billed = courtCase.billed || 0;
  const paid = courtCase.paid || 0;
  const balance = billed - paid;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* TOP NAV */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-blue-600 transition">
            <span className="bg-white w-8 h-8 flex items-center justify-center rounded-xl shadow-sm">←</span> 
            Back to Portfolio
          </button>
          <button 
            onClick={toggleStatus}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              courtCase.status === 'Completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {courtCase.status === 'Completed' ? '✓ Matter Closed' : 'Mark as Completed'}
          </button>
        </div>

        {/* HEADER SECTION */}
        <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-9xl pointer-events-none italic font-black">LEX</div>
          <div className="relative z-10">
            <span className="bg-purple-50 text-purple-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
              {courtCase.status} Litigation
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-none">{courtCase.fileName}</h1>
            <p className="text-slate-500 max-w-2xl font-medium leading-relaxed">{courtCase.details || "No matter details provided for this litigation case."}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: TIMELINE & PROGRESS */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                <span className="w-10 h-10 bg-blue-50 flex items-center justify-center rounded-2xl text-blue-600">⚖️</span>
                Case Progression
              </h3>

              <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-5 before:w-0.5 before:bg-slate-50">
                {courtCase.progressNotes?.length ? (
                  [...courtCase.progressNotes].reverse().map((note) => (
                    <div key={note.id} className="relative pl-14 group">
                      <div className="absolute left-4 top-2 w-2.5 h-2.5 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                      <div className="bg-slate-50/50 p-6 rounded-[28px] border border-transparent hover:border-slate-100 transition-all">
                        <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-4">{note.message}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          {note.authorName} • {note.date}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pl-14 py-6 text-slate-400 font-bold italic text-sm">No recorded actions for this case.</div>
                )}
              </div>
            </div>

            {/* ADD NOTE */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Submit Case Update</h3>
              <textarea 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Briefly state today's proceedings or filings..."
                rows={4}
                className="w-full bg-slate-50 border-0 rounded-[24px] p-6 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              />
              <div className="flex justify-end">
                <button 
                  onClick={handleAddNote}
                  className="bg-[#0B1F3A] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:bg-blue-900 active:scale-95 transition"
                >
                  Post to Timeline
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: BILLING & INFO */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* BILLING CARD */}
            <div className="bg-[#0B1F3A] text-white p-8 rounded-[40px] shadow-xl">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Financial Summary</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Fee Billed</p>
                  <p className="text-2xl font-black tracking-tight">UGX {billed.toLocaleString()}</p>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-6">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Paid</p>
                    <p className="text-sm font-bold text-emerald-400">{paid.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Outstanding</p>
                    <p className="text-sm font-bold text-orange-400">{balance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CASE DETAILS INFO */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-900 mb-6">Quick Info</h3>
              <div className="space-y-5">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Next Court Date</p>
                  <p className="text-sm font-bold text-blue-600">{courtCase.nextCourtDate || "TBD"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Reference ID</p>
                  <p className="text-sm font-bold text-slate-700">#{courtCase.id.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Lead Counsel</p>
                  <p className="text-sm font-bold text-slate-700">{currentUser.name}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}