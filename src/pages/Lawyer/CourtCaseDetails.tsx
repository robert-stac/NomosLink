import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

export default function CourtCaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentUser, users, courtCases, updateCourtCase,
    addCourtCaseProgress, deleteCourtCaseProgress,
    uploadCourtCaseDocument, deleteCourtCaseDocument,
    draftRequests, addDraftRequest, completeDraftRequest, deleteDraftRequest
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"timeline" | "drafts">("timeline");
  const [newNote, setNewNote] = useState("");
  const [isCaseUploading, setIsCaseUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draft request form state
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [draftForm, setDraftForm] = useState({ title: "", description: "", deadline: "", assignedToId: "" });

  // Complete draft modal state
  const [completingDraftId, setCompletingDraftId] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({ hoursSpent: "", documentFile: null as File | null });
  const [uploading, setUploading] = useState(false);

  if (!currentUser) return <div className="p-10 text-center font-black text-slate-400">SESSION EXPIRED</div>;

  const isManagerOrAdmin = currentUser.role === 'manager' || currentUser.role === 'admin';

  const courtCase = courtCases.find(
    (c) => String(c.id) === String(id) &&
      (isManagerOrAdmin ||
        String(c.lawyerId) === String(currentUser.id) ||
        draftRequests.some(d => String(d.caseId) === String(c.id) && String(d.assignedToId) === String(currentUser.id)))
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

  const isLeadCounsel = String(courtCase.lawyerId) === String(currentUser.id);
  const canCreateDraft = isManagerOrAdmin || isLeadCounsel;

  // All lawyers except current user as potential assignees
  const assignableLawyers = users.filter(u => (u.role === 'lawyer') && String(u.id) !== String(currentUser.id));

  // Draft requests for this case
  const caseDrafts = draftRequests.filter(d => String(d.caseId) === String(courtCase.id));
  const pendingDrafts = caseDrafts.filter(d => d.status === 'Pending');
  const completedDrafts = caseDrafts.filter(d => d.status === 'Completed');

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addCourtCaseProgress(courtCase.id, newNote.trim());
    setNewNote("");
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Are you sure you want to remove this progress note?")) {
      deleteCourtCaseProgress?.(courtCase.id, noteId);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadCourtCaseDocument) {
      setIsCaseUploading(true);
      try {
        await uploadCourtCaseDocument(courtCase.id, file);
      } catch (error) {
        console.error("Upload failed", error);
      } finally {
        setIsCaseUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDoc = (docId: string) => {
    if (window.confirm("Are you sure you want to remove this document?")) {
      deleteCourtCaseDocument?.(courtCase.id, docId);
    }
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

  const toggleStatus = () => {
    updateCourtCase(courtCase.id, { status: courtCase.status === "Completed" ? "Ongoing" : "Completed" });
  };

  const handleCreateDraft = async () => {
    if (!draftForm.title || !draftForm.assignedToId || !draftForm.deadline) {
      alert("Please fill in all required fields.");
      return;
    }
    const assignedUser = users.find(u => u.id === draftForm.assignedToId);
    if (!assignedUser) return;

    await addDraftRequest({
      caseId: courtCase.id,
      caseFileName: courtCase.fileName,
      title: draftForm.title,
      description: draftForm.description,
      deadline: draftForm.deadline,
      assignedToId: assignedUser.id,
      assignedToName: assignedUser.name,
      requestedById: currentUser.id,
      requestedByName: currentUser.name,
    });
    setDraftForm({ title: "", description: "", deadline: "", assignedToId: "" });
    setShowDraftForm(false);
  };

  const handleCompleteDraft = async () => {
    if (!completingDraftId) return;
    setUploading(true);
    let documentUrl: string | undefined;
    let documentName: string | undefined;

    if (completeForm.documentFile) {
      const { supabase } = await import("../../lib/supabaseClient");
      const file = completeForm.documentFile;
      const filePath = `draft-docs/${completingDraftId}/${Date.now()}_${file.name}`;
      const { error, data } = await supabase.storage.from('documents').upload(filePath, file);
      if (!error) {
        documentUrl = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;
        documentName = file.name;
      }
    }

    completeDraftRequest(
      completingDraftId,
      completeForm.hoursSpent ? Number(completeForm.hoursSpent) : undefined,
      documentUrl,
      documentName,
    );
    setCompletingDraftId(null);
    setCompleteForm({ hoursSpent: "", documentFile: null });
    setUploading(false);
  };

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
          <div className="flex gap-3">
            {isManagerOrAdmin && (
              <button
                onClick={downloadProgressReport}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
              >
                <span>📥</span> Export Notes
              </button>
            )}
            <button
              onClick={toggleStatus}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${courtCase.status === 'Completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {courtCase.status === 'Completed' ? '✓ Matter Closed' : 'Mark as Completed'}
            </button>
          </div>
        </div>

        {/* HEADER */}
        <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-9xl pointer-events-none italic font-black">BCA</div>
          <div className="relative z-10">
            <span className="bg-purple-50 text-purple-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
              {courtCase.status} Litigation
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-none">{courtCase.fileName}</h1>
            <div className="flex gap-2 items-center mb-6">
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isLeadCounsel ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {isLeadCounsel ? 'Lead Counsel' : 'Assisting Counsel'}
              </span>
              {isManagerOrAdmin && <span className="bg-purple-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">Management View</span>}
            </div>
            <p className="text-slate-500 max-w-2xl font-medium leading-relaxed">{courtCase.details || "No matter details provided for this litigation case."}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT */}
          <div className="lg:col-span-8 space-y-6">

            {/* TABS */}
            <div className="flex gap-8 border-b border-slate-200">
              {(["timeline", "drafts"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                >
                  {tab === "timeline" ? "Case Timeline" : `Draft Requests ${caseDrafts.length > 0 ? `(${caseDrafts.length})` : ''}`}
                </button>
              ))}
            </div>

            {/* TIMELINE TAB */}
            {activeTab === "timeline" && (
              <>
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
                          <div className="bg-slate-50/50 p-6 rounded-[28px] border border-transparent hover:border-slate-100 transition-all relative">
                            {(note.authorId === currentUser.id || isManagerOrAdmin) && (
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <span className="text-[10px]">🗑️</span>
                              </button>
                            )}
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

                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Submit Case Update</h3>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Briefly state today's proceedings or filings..."
                    rows={4}
                    className="w-full bg-slate-50 border-0 rounded-[24px] p-6 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                  />
                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      onClick={handleAddNote}
                      className="bg-[#0B1F3A] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:bg-blue-900 active:scale-95 transition"
                    >
                      Post to Timeline
                    </button>
                    <button
                      disabled={isCaseUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className={`bg-white border border-slate-200 text-slate-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2 ${isCaseUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isCaseUploading ? (
                        <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                      ) : <span>📎</span>}
                      {isCaseUploading ? "Uploading..." : "Attach Document"}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  </div>
                </div>
              </>
            )}

            {/* DRAFTS TAB */}
            {activeTab === "drafts" && (
              <div className="space-y-6">

                {/* Create Draft Button */}
                {canCreateDraft && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowDraftForm(!showDraftForm)}
                      className="bg-[#0B1F3A] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-900 transition"
                    >
                      {showDraftForm ? "✕ Cancel" : "+ New Draft Request"}
                    </button>
                  </div>
                )}

                {/* Draft Form */}
                {showDraftForm && canCreateDraft && (
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-blue-100">
                    <h3 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest">New Draft Request</h3>
                    <div className="space-y-4">
                      <input
                        placeholder="Title (e.g. Draft Written Submissions)"
                        className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={draftForm.title}
                        onChange={e => setDraftForm({ ...draftForm, title: e.target.value })}
                      />
                      <textarea
                        placeholder="Instructions / Description..."
                        className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={draftForm.description}
                        onChange={e => setDraftForm({ ...draftForm, description: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Deadline *</label>
                          <input
                            type="date"
                            className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={draftForm.deadline}
                            onChange={e => setDraftForm({ ...draftForm, deadline: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Assign To *</label>
                          <select
                            className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold text-sm outline-none"
                            value={draftForm.assignedToId}
                            onChange={e => setDraftForm({ ...draftForm, assignedToId: e.target.value })}
                          >
                            <option value="">Select Assistant...</option>
                            {assignableLawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleCreateDraft}
                          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 transition"
                        >
                          Send Draft Request
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Drafts */}
                {pendingDrafts.length > 0 && (
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Pending Drafts ({pendingDrafts.length})</h3>
                    <div className="space-y-4">
                      {pendingDrafts.map(draft => (
                        <div key={draft.id} className="bg-orange-50 border border-orange-100 p-6 rounded-[24px]">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-black text-slate-900 text-sm">{draft.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{draft.description}</p>
                            </div>
                            <span className="bg-orange-100 text-orange-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Pending</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-[10px] font-black text-slate-400 uppercase mt-3">
                            <span>👤 {draft.assignedToName}</span>
                            <span>📅 Due {draft.deadline}</span>
                            <span>🗂 Requested by {draft.requestedByName}</span>
                          </div>
                          {/* Assistant can complete, requester/manager can delete */}
                          <div className="flex gap-3 mt-4">
                            {String(draft.assignedToId) === String(currentUser.id) && (
                              <button
                                onClick={() => setCompletingDraftId(draft.id)}
                                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition"
                              >
                                Mark Complete
                              </button>
                            )}
                            {(canCreateDraft || String(draft.requestedById) === String(currentUser.id)) && (
                              <button
                                onClick={() => deleteDraftRequest(draft.id)}
                                className="bg-white border border-red-200 text-red-500 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-50 transition"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Drafts */}
                {completedDrafts.length > 0 && (
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Completed Drafts ({completedDrafts.length})</h3>
                    <div className="space-y-4">
                      {completedDrafts.map(draft => (
                        <div key={draft.id} className="bg-emerald-50 border border-emerald-100 p-6 rounded-[24px]">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-black text-slate-900 text-sm">{draft.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{draft.description}</p>
                            </div>
                            <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Completed</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-[10px] font-black text-slate-400 uppercase mt-3">
                            <span>👤 {draft.assignedToName}</span>
                            {draft.hoursSpent && <span>⏱ {draft.hoursSpent} hrs</span>}
                            {draft.dateCompleted && <span>✅ {new Date(draft.dateCompleted).toLocaleDateString('en-GB')}</span>}
                          </div>
                          {draft.documentUrl && (
                            <a
                              href={draft.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-3 text-blue-600 text-xs font-black hover:underline"
                            >
                              📎 {draft.documentName || "View Document"}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {caseDrafts.length === 0 && (
                  <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate-100 text-center">
                    <p className="text-4xl mb-4">📝</p>
                    <p className="text-slate-400 font-bold italic">No draft requests for this case yet.</p>
                    {canCreateDraft && <p className="text-slate-300 text-sm mt-2">Use the button above to assign drafting work to an assistant.</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: BILLING & INFO */}
          <div className="lg:col-span-4 space-y-6">
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

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center justify-between">
                Case Documents
                <span className="text-[10px] text-slate-400 font-bold">{courtCase.documents?.length || 0}</span>
              </h3>
              <div className="space-y-3">
                {courtCase.documents?.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 group">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition border border-slate-100"
                    >
                      <span className="text-[10px] font-bold text-slate-700 truncate max-w-[140px]">{doc.name}</span>
                      <span className="text-[9px] font-black text-blue-600 opacity-0 group-hover:opacity-100 transition">VIEW ↗</span>
                    </a>
                    {isLeadCounsel && (
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-3 text-slate-300 hover:text-red-500 bg-white border border-slate-100 rounded-xl transition shadow-sm opacity-0 group-hover:opacity-100"
                        title="Delete document"
                      >
                        <span className="text-[10px]">🗑️</span>
                      </button>
                    )}
                  </div>
                ))}
                {!courtCase.documents?.length && <p className="text-slate-400 text-[10px] italic">No case-level files uploaded yet.</p>}
              </div>
            </div>

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
                  <p className="text-sm font-bold text-slate-700">{users.find(u => u.id === courtCase.lawyerId)?.name || "Not Assigned"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Draft Requests</p>
                  <p className="text-sm font-bold text-slate-700">
                    {pendingDrafts.length} pending · {completedDrafts.length} completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPLETE DRAFT MODAL */}
      {completingDraftId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-2">Complete Draft</h3>
            <p className="text-slate-400 text-sm mb-8">Attach the completed document. **Hours spent will be calculated automatically** based on the time since assignment.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Upload Document (optional)</label>
                <input
                  type="file"
                  className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold text-sm outline-none"
                  onChange={e => setCompleteForm({ ...completeForm, documentFile: e.target.files?.[0] || null })}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => { setCompletingDraftId(null); setCompleteForm({ hoursSpent: "", documentFile: null }); }}
                className="flex-1 font-black text-slate-400 uppercase text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteDraft}
                disabled={uploading}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Mark as Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}