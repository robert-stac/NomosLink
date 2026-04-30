import { useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { getDeadlineUrgency } from "../../utils/dateUtils";

export default function LawyerCourtCaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const goBack = () => {
    const fromPath = (location.state as any)?.from;
    if (fromPath) {
      navigate(fromPath, { replace: true });
    } else {
      navigate(-1);
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [newNote, setNewNote] = useState("");

  const {
    currentUser,
    courtCases,
    updateCourtCase,
    addCourtCaseProgress,
    deleteCourtCaseProgress,
    uploadCourtCaseDocument,
    deleteCourtCaseDocument,
    users
  } = useAppContext();

  if (!currentUser) return <div className="p-10 text-center font-bold text-slate-400">SESSION EXPIRED</div>;

  const foundCase = courtCases.find((c) => String(c.id) === String(id));

  const isOwner = foundCase && String(foundCase.lawyerId) === String(currentUser.id);
  const isManager = currentUser.role === "manager";
  const isAdmin = currentUser.role === "admin";

  if (!foundCase || (!isOwner && !isManager && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-xl text-center max-w-sm">
          <div className="text-4xl mb-4">⚖️</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Case Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">You may not have permission to view this file or the ID is incorrect.</p>
          <button onClick={goBack} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-semibold text-xs uppercase tracking-widest">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const courtCase = foundCase;
  const assignedLawyer = users.find(u => u.id === courtCase.lawyerId);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addCourtCaseProgress(courtCase.id, newNote.trim());
    setNewNote("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadCourtCaseDocument) {
      setIsUploading(true);
      try {
        await uploadCourtCaseDocument(courtCase.id, file);
      } catch (error) {
        console.error("Upload failed", error);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDoc = (docId: string) => {
    if (window.confirm("Are you sure you want to remove this document?")) {
      deleteCourtCaseDocument?.(courtCase.id, docId);
    }
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
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* TOP BAR */}
        <div className="flex justify-between items-center">
            <button onClick={goBack} className="text-slate-400 font-semibold text-xs uppercase tracking-widest hover:text-blue-600 transition">
                onClick={downloadProgressReport}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
              >
                <span>📥</span> Export Notes
              </button>
            )}

            <button
              onClick={toggleStatus}
              className={`px-6 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${courtCase.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
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
              <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider mb-4 inline-block">
                Court Matter
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>{courtCase.fileName}</h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                {courtCase.details || "Ongoing litigation matter. See progression history for recent updates."}
              </p>
            </div>

            {/* PROGRESS LOG */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 mb-8">Matter Progression</h3>
              <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-slate-100">
                {courtCase.progressNotes?.length ? (
                  [...courtCase.progressNotes].map((note) => {
                    const renderDate = (dStr: string) => {
                      const d = new Date(dStr);
                      if (isNaN(d.getTime())) return dStr;
                      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    };
                    return (
                    <div key={note.id} className="relative pl-10 group">
                      <div className="absolute left-1.5 top-2 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 relative">

                        {(note.authorId === currentUser.id || isAdmin) && (
                          <button
                            onClick={() => {
                              if (window.confirm("Delete this progress note?")) {
                                deleteCourtCaseProgress?.(courtCase.id, note.id);
                              }
                            }}
                            className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <span className="text-xs">🗑️</span>
                          </button>
                        )}

                        <p className="text-sm font-medium text-slate-700 mb-2">{note.message}</p>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">
                          Logged on {renderDate(note.date)} by {note.authorName}
                        </p>
                      </div>
                    </div>
                  )})
                ) : (
                  <div className="pl-10 text-slate-400 font-medium italic text-sm">No recorded updates.</div>
                )}
              </div>

              {/* ADD UPDATE FORM */}
              <div className="mt-10 pt-10 border-t border-slate-50">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Post Case Update</h4>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Summarize today's court appearance or filing..."
                  className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleAddNote}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold text-xs uppercase tracking-widest hover:bg-blue-800 transition shadow-lg"
                  >
                    Save Progression
                  </button>

                  <button
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className={`bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isUploading ? (
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                    ) : <span>📎</span>}
                    {isUploading ? "Uploading..." : "Attach Document"}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: QUICK STATS & DOCUMENTS */}
          <div className="lg:col-span-4 space-y-6">

            {/* DOCUMENTS LIST */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">Court Documents</h3>
              <div className="space-y-3">
                {courtCase.documents?.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 group">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition border border-slate-100"
                    >
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{doc.name}</span>
                      <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition">VIEW ↗</span>
                    </a>

                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-3 text-slate-300 hover:text-red-500 bg-white border border-slate-100 rounded-xl transition shadow-sm opacity-0 group-hover:opacity-100"
                      title="Delete document"
                    >
                      <span className="text-xs">🗑️</span>
                    </button>
                  </div>
                ))}
                {!courtCase.documents?.length && <p className="text-slate-400 text-xs italic">No files uploaded yet.</p>}
              </div>
            </div>

            <div className="bg-[#0B1F3A] text-white p-8 rounded-[40px] shadow-xl">
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-6">File Summary</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Next Court Date</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-lg font-bold ${
                      getDeadlineUrgency(courtCase.nextCourtDate) === 'overdue' ? 'text-red-400' : 
                      getDeadlineUrgency(courtCase.nextCourtDate) === 'soon' ? 'text-amber-400' : 'text-blue-200'
                    }`}>
                      {courtCase.nextCourtDate || "TBD"}
                    </p>
                    {courtCase.nextCourtDate && getDeadlineUrgency(courtCase.nextCourtDate) !== 'normal' && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                        getDeadlineUrgency(courtCase.nextCourtDate) === 'overdue' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {getDeadlineUrgency(courtCase.nextCourtDate)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs font-semibold text-slate-400 uppercase">Outstanding Balance</p>
                  <p className="text-lg font-bold">
                    UGX {((courtCase.billed || 0) - (courtCase.paid || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Reference</h4>
              <p className="text-xs font-medium text-slate-600">ID: #{courtCase.id.slice(-8).toUpperCase()}</p>
              <p className="text-xs font-medium text-slate-600 mt-2">Assigned To: {assignedLawyer?.name || "Unknown"}</p>
              <p className="text-xs font-semibold text-blue-600 uppercase mt-1">Viewing as: {currentUser.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}