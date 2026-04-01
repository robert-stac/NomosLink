import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { supabase } from "../../lib/supabaseClient"; 

export default function LawyerLetterDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentUser, 
    letters, 
    updateLetter, 
    addLetterProgress,
    users 
  } = useAppContext();
  
  const [newNote, setNewNote] = useState("");
  const [isFeedback, setIsFeedback] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); 
  const [localNotes, setLocalNotes] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Find the fresh version of the letter from global state
  const foundLetter = letters.find((l) => String(l.id) === String(id));

  // 2. FIXED SYNC: Added 'letters' to dependencies so the UI updates 
  // immediately when addLetterProgress is called.
  useEffect(() => {
    if (foundLetter?.progressNotes) {
      setLocalNotes([...foundLetter.progressNotes]);
    }
  }, [foundLetter, letters]); 

  if (!currentUser) return <div className="p-10 text-center font-black text-slate-400">SESSION EXPIRED</div>;

  const letter = foundLetter;
  const lid = letter?.lawyerId || (letter as any)?.lawyer?.id;
  const isOwner = letter && String(lid) === String(currentUser.id);
  const isManager = currentUser.role === "manager";
  const isAdmin = currentUser.role === "admin";

  if (!letter || (!isOwner && !isManager && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-xl text-center max-w-sm">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Letter Not Found</h2>
          <button onClick={() => navigate(-1)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const assignedLawyer = users.find(u => u.id === lid);

  // --- MULTI-FILE HANDLERS ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveUpdate = async () => {
    if (!newNote.trim() && selectedFiles.length === 0) return;
    setIsSubmitting(true);

    try {
      let updatedDocs = [...(letter.documents || [])];
      let attachmentNames: string[] = [];

      // 1. Upload all selected PDFs to Supabase
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `letters/${letter.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('letter-docs')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('letter-docs')
          .getPublicUrl(filePath);

        updatedDocs.push({ 
          id: crypto.randomUUID(), 
          name: file.name, 
          url: publicUrl, 
          date: new Date().toISOString() 
        });
        attachmentNames.push(file.name);
      }

      // 2. Prepare combined message for the history
      const combinedMessage = attachmentNames.length > 0 
        ? `${newNote.trim()} (Attachments: ${attachmentNames.join(", ")})` 
        : newNote.trim();

      // 3. Update Letter state (documents and progress)
      // We update docs first, then add progress to trigger the re-render chain
      await updateLetter(letter.id, { documents: updatedDocs });
      await addLetterProgress(letter.id, combinedMessage, isFeedback);

      // 4. Cleanup UI state
      setNewNote("");
      setSelectedFiles([]);
      setIsFeedback(false);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Delete this update?")) return;
    const updated = (letter.progressNotes || []).filter((n: any) => n.id !== noteId);
    await updateLetter(letter.id, { progressNotes: updated });
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm("Permanently remove this PDF from the repository?")) return;
    const updated = (letter.documents || []).filter((d: any) => d.id !== docId);
    await updateLetter(letter.id, { documents: updated });
  };

  const toggleStatus = () => {
    const nextStatus = letter.status === "Completed" ? "Pending" : "Completed";
    updateLetter(letter.id, { status: nextStatus });
  };

  const downloadProgressReport = () => {
    if (!letter.progressNotes?.length) return;
    const headers = ["Date", "Author", "Update Details"];
    const rows = letter.progressNotes.map(n => [
      `"${n.date}"`, `"${n.authorName || "Counsel"}"`, `"${n.message.replace(/"/g, '""')}"`
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
            <span className="bg-white w-8 h-8 flex items-center justify-center rounded-xl shadow-sm">←</span> Back
          </button>
          
          <div className="flex gap-3">
            {(isManager || isAdmin) && (
              <button onClick={downloadProgressReport} className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
                <span>📥</span> Export Notes
              </button>
            )}

            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${letter.type === 'Incoming' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
               {letter.type} Mail
            </span>

             <button onClick={toggleStatus} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${letter.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                {letter.status === 'Completed' ? '✓ Filed' : 'Mark as Actioned'}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-slate-100">
              <h1 className="text-3xl font-black text-slate-900 mb-4">{letter.subject}</h1>
              <div className="flex gap-4 items-center mb-8">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Dated: {letter.date || "N/A"}</p>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${letter.lastClientFeedbackDate ? 'bg-white text-slate-600 border-slate-200' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                  Last Feedback: {letter.lastClientFeedbackDate 
                    ? new Date(letter.lastClientFeedbackDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
                    : "None Recorded"}
                </div>
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 leading-relaxed font-medium">
                  {letter.type === 'Incoming' ? "Correspondence received. Details logged below." : "Outgoing correspondence drafted and dispatched."}
                </p>
              </div>
            </div>

            {/* PROGRESS NOTES SECTION */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-900 mb-6">History & Actions</h3>
              <div className="space-y-6 mb-10">
                {localNotes.length > 0 ? (
                  localNotes.slice().reverse().map((note: any, index: number) => (
                    <div key={note.id || index} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 group relative">
                      <p className="text-sm text-slate-700 font-bold mb-2 pr-8">{note.message}</p>
                      {(note.authorId === currentUser.id || isAdmin) && (
                        <button onClick={() => handleDeleteNote(note.id)} className="absolute top-5 right-5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">✕</button>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{note.date}</span>
                        <span className="text-[9px] font-black text-blue-400 uppercase">By {note.authorName || "Counsel"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-sm font-medium">No actions logged yet.</p>
                )}
              </div>

              {/* UNIFIED INPUT: Multiple Files + Text */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type your formal update here..."
                  className="w-full bg-transparent border-0 text-sm font-bold outline-none mb-4 resize-none"
                  rows={3}
                />
                
                {/* Pending Files List (Before Upload) */}
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-2">
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <button onClick={() => removeSelectedFile(idx)} className="text-blue-400 hover:text-red-500 font-black">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="isFeedback"
                    checked={isFeedback}
                    onChange={(e) => setIsFeedback(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="isFeedback" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none">
                    Log as Client Feedback (Verbal/Phone)
                  </label>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4 border-t border-slate-200">
                  <div className="relative">
                    <input type="file" accept=".pdf" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                    <div className="text-[9px] font-black uppercase px-4 py-3 rounded-xl border-2 border-dashed bg-white text-slate-400 hover:border-blue-400 transition">
                      + Add PDF(s)
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveUpdate}
                    disabled={isSubmitting}
                    className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition disabled:opacity-50 shadow-lg"
                  >
                    {isSubmitting ? 'Sending...' : 'Post Update & Attachments'}
                  </button>
                </div>
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
                  <p className="text-[9px] text-slate-400 font-black uppercase">Recipient</p>
                  <p className="text-sm font-bold">{letter.recipient || "Legal Department"}</p>
                </div>
              </div>
            </div>

            {/* FILE REPOSITORY */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h4 className="text-sm font-black text-slate-900 mb-4">File Repository</h4>
              <div className="flex flex-col gap-2">
                {letter.documents?.length ? (
                  letter.documents.map((doc: any) => (
                    <div key={doc.id} className="group flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-blue-600 truncate flex-1">📄 {doc.name}</a>
                      {(isOwner || isAdmin || isManager) && (
                        <button onClick={() => handleDeleteDocument(doc.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
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