import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import NotificationBell from "../NotificationBell";
import { getDeadlineUrgency, getUrgencyStyles } from "../../utils/dateUtils";
import CourtCalendar from "../CourtCalendar";

const body: React.CSSProperties = {};
const serif: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

const FileCard = ({ title, subtitle, status, date, onView, isLead }: any) => (
  <div className="bg-white p-6 rounded-[32px] hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden shadow-sm">
    {isLead !== undefined && (
      <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-semibold ${isLead ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
        {isLead ? 'Lead' : 'Assisting'}
      </div>
    )}
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-1 pr-12">
        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition">{title}</h4>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{subtitle}</p>
      </div>
      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
        {status}
      </span>
    </div>
    <div className="flex justify-between items-center mt-6">
      <p className="text-xs font-medium text-slate-300">{date}</p>
      <button onClick={onView} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-blue-600 transition">
        View File
      </button>
    </div>
  </div>
);

export default function LawyerDashboard() {
  const navigate = useNavigate();
  const {
    currentUser, courtCases, transactions, letters, logout,
    users, tasks, addTask, deleteTask, updateTask,
    notifications, markNotificationsAsRead,
    draftRequests, completeDraftRequest,
    filingRequests, updateFilingRequest,
    updateCourtCaseDeadline,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"Cases" | "Transactions" | "Letters" | "Drafts" | "Registry" | "Calendar">("Cases");
  const [draftsTab, setDraftsTab] = useState<"Pending" | "Completed">("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedToId: "", priority: "Medium" as any, dueDate: "", relatedFileId: "", relatedFileType: "" as any, relatedFileName: "" });
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");

  const [completingDraftId, setCompletingDraftId] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({ hoursSpent: "", documentFile: null as File | null, completionNote: "" });
  const [uploading, setUploading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!currentUser) return null;

  const clerks = users.filter(u => u.role === "clerk");
  const myTasks = tasks.filter(t => String(t.assignedById) === String(currentUser.id) && !t.deleted);
  const draftsAssignedToMe = draftRequests.filter(d => String(d.assignedToId) === String(currentUser.id));
  const draftsRequestedByMe = draftRequests.filter(d => String(d.requestedById) === String(currentUser.id));
  const pendingIncomingCount = draftsAssignedToMe.filter(d => d.status === 'Pending').length;
  const filingsAssignedToMe = filingRequests.filter(f => String(f.assignedToId) === String(currentUser.id));
  const filingsRequestedByMe = filingRequests.filter(f => String(f.requestedById) === String(currentUser.id));

  const handleSaveTask = () => {
    const clerk = clerks.find(c => String(c.id) === String(taskForm.assignedToId));
    if (!taskForm.title || !clerk) return alert("Please fill title and select a clerk");
    const payload = { title: taskForm.title, description: taskForm.description, priority: taskForm.priority || "Medium", dueDate: taskForm.dueDate || undefined, assignedToId: clerk.id, assignedToName: clerk.name, relatedFileId: taskForm.relatedFileId || undefined, relatedFileType: taskForm.relatedFileType || undefined, relatedFileName: taskForm.relatedFileName || undefined };
    if (editingTaskId) updateTask(editingTaskId, payload);
    else addTask({ ...payload, assignedById: currentUser.id, assignedByName: currentUser.name });
    closeModal();
  };

  const openEditModal = (task: any) => {
    setEditingTaskId(task.id);
    setTaskForm({ title: task.title, description: task.description, priority: task.priority || "Medium", dueDate: task.dueDate || "", assignedToId: task.assignedToId, relatedFileId: task.relatedFileId || "", relatedFileType: task.relatedFileType || "", relatedFileName: task.relatedFileName || "" });
    setIsTaskModalOpen(true);
  };

  const closeModal = () => { setEditingTaskId(null); setTaskForm({ title: "", description: "", assignedToId: "", priority: "Medium", dueDate: "", relatedFileId: "", relatedFileType: "" as any, relatedFileName: "" }); setIsTaskModalOpen(false); };

  const handleCompleteDraft = async () => {
    if (!completingDraftId) return;
    setUploading(true);
    let documentUrl: string | undefined, documentName: string | undefined;
    if (completeForm.documentFile) {
      const { supabase } = await import("../../lib/supabaseClient");
      const file = completeForm.documentFile;
      const filePath = `draft-docs/${completingDraftId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('transactions').upload(filePath, file);
      if (!error) { documentUrl = supabase.storage.from('transactions').getPublicUrl(filePath).data.publicUrl; documentName = file.name; }
    }
    completeDraftRequest(completingDraftId, completeForm.hoursSpent ? Number(completeForm.hoursSpent) : undefined, documentUrl, documentName, completeForm.completionNote);
    setCompletingDraftId(null); setCompleteForm({ hoursSpent: "", documentFile: null, completionNote: "" }); setUploading(false);
  };

  const [showRegistryBanner, setShowRegistryBanner] = useState(() => !localStorage.getItem("dismissed_registry_banner_v1"));

  const myData = useMemo(() => {
    const userId = String(currentUser.id);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);

    const assignedCases = courtCases.filter(c => {
      const isLead = String(c.lawyerId) === userId;
      const isAssistant = draftRequests.some(d => String(d.caseId) === String(c.id) && String(d.assignedToId) === userId && d.status === 'Pending');
      return !c.archived && (isLead || isAssistant);
    });

    const upcoming = assignedCases
      .filter(c => c.nextCourtDate && !isNaN(new Date(c.nextCourtDate).getTime()))
      .map(c => ({ id: c.id, fileName: c.fileName, dateStr: c.nextCourtDate, timestamp: new Date(c.nextCourtDate!).getTime() }))
      .filter(c => c.timestamp >= now.getTime())
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    const urgentReminders = assignedCases.filter(c => {
      if (!c.nextCourtDate) return false;
      const d = new Date(c.nextCourtDate); d.setHours(0, 0, 0, 0);
      return d.getTime() === now.getTime() || d.getTime() === tomorrow.getTime();
    });

    const pendingDeadlines = assignedCases.flatMap(c => 
      (c.deadlines || []).filter(d => d.status === 'Pending').map(d => ({
        ...d,
        caseId: c.id,
        caseFileName: c.fileName
      }))
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return {
      cases: assignedCases,
      txs: transactions.filter(t => String(t.lawyerId) === userId && !t.archived),
      ltrs: letters.filter(l => (String(l.lawyerId) === userId || String((l as any).lawyer?.id) === userId) && !l.archived),
      filings: filingsRequestedByMe,
      assignedFilings: filingsAssignedToMe,
      nextHearing: upcoming || null,
      urgentReminders,
      pendingDeadlines,
    };
  }, [courtCases, transactions, letters, currentUser.id, draftRequests, filingRequests]);

  const dismissBanner = () => {
    localStorage.setItem("dismissed_registry_banner_v1", "true");
    setShowRegistryBanner(false);
  };

  const filteredCases = myData.cases.filter(c => c.fileName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTxs = myData.txs.filter(t => t.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) || t.type?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredLtrs = myData.ltrs.filter(l => l.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || l.type?.toLowerCase().includes(searchQuery.toLowerCase()) || l.recipient?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAssignedDrafts = draftsAssignedToMe.filter(d => d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.caseFileName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRequestedDrafts = draftsRequestedByMe.filter(d => d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.caseFileName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAssignedFilings = filingsAssignedToMe.filter(f => f.documentName?.toLowerCase().includes(searchQuery.toLowerCase()) || f.caseFileName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRequestedFilings = filingsRequestedByMe.filter(f => f.documentName?.toLowerCase().includes(searchQuery.toLowerCase()) || f.caseFileName?.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentCount = activeTab === "Cases" ? filteredCases.length : activeTab === "Transactions" ? filteredTxs.length : activeTab === "Letters" ? filteredLtrs.length : activeTab === "Drafts" ? (filteredAssignedDrafts.length + filteredRequestedDrafts.length) : (filteredAssignedFilings.length + filteredRequestedFilings.length);

  const inp = "w-full bg-slate-50/50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition shadow-sm";

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">

      {/* HEADER */}
      <div className="bg-[#0B1F3A] pt-12 pb-20 px-5 md:px-12 rounded-b-[48px] shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-blue-400 text-[10px] font-semibold uppercase tracking-widest mb-1">Lawyer Portal</p>
              <h1 className="text-white text-2xl font-semibold tracking-tight">
                Welcome, {currentUser.name.split(' ')[0]}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell currentUser={currentUser} notifications={notifications} markAsRead={() => markNotificationsAsRead(currentUser.id)} />
              <button onClick={() => navigate("/requisitions")} className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition" title="Requisitions">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
              <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition" title="Assign Clerk Task">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <button onClick={logout} className="bg-white/10 hover:bg-red-500/30 text-white/70 hover:text-white p-2.5 rounded-xl transition" title="Logout">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl">
              <p className="text-[10px] font-medium text-blue-300 uppercase tracking-wider mb-1">Active Matters</p>
              <p className="text-2xl font-semibold text-white">{myData.cases.length + myData.txs.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl">
              <p className="text-[10px] font-medium text-blue-300 uppercase tracking-wider mb-1">Letters</p>
              <p className="text-2xl font-semibold text-white">{myData.ltrs.length}</p>
            </div>
            <div className={`p-4 rounded-2xl cursor-pointer transition ${pendingIncomingCount > 0 ? "bg-amber-500/20" : "bg-white/5"}`} onClick={() => setActiveTab("Drafts")}>
              <p className="text-[10px] font-medium text-blue-300 uppercase tracking-wider mb-1">Incoming Drafts</p>
              <p className="text-2xl font-semibold text-white">{pendingIncomingCount}</p>
            </div>
            <div onClick={() => myData.nextHearing && navigate(`/lawyer/cases/${myData.nextHearing.id}`)}
              className={`p-4 rounded-2xl cursor-pointer transition ${myData.nextHearing ? "bg-blue-600 hover:bg-blue-500" : "bg-white/5"}`}>
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-medium text-blue-200 uppercase tracking-wider mb-1">Next Hearing</p>
                {myData.nextHearing && <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white font-medium">Linked</span>}
              </div>
              <p className="text-base font-semibold text-white truncate">{myData.nextHearing ? myData.nextHearing.dateStr : "No Hearings"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-12 space-y-8">

        {/* GLASSMORPHISM FEATURE ANNOUNCEMENT OVERLAY */}
        {showRegistryBanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[48px] p-10 md:p-14 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] max-w-2xl w-full text-center relative overflow-hidden group">
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-colors" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-400/30 transition-colors" />
              
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white/10 rounded-[32px] flex items-center justify-center text-5xl mb-8 mx-auto border border-white/10 shadow-inner">
                  ⚖️
                </div>
                
                <span className="bg-blue-400/20 text-blue-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 inline-block border border-blue-400/20">
                  New Feature Release
                </span>
                
                <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-tight">
                  Registry Filing <br />
                  <span className="text-blue-300">is Now Live</span>
                </h2>
                
                <p className="text-blue-100/80 text-lg leading-relaxed mb-10 font-medium max-w-lg mx-auto">
                  Seamlessly request and track court document filings directly from your matter files. 
                  Real-time status updates and ECCMIS reference tracking are now at your fingertips.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button 
                    onClick={() => {
                      setActiveTab("Registry");
                      dismissBanner();
                    }}
                    className="w-full sm:w-auto bg-white text-blue-900 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.3)]"
                  >
                    Open Registry Portal 🚀
                  </button>
                  <button 
                    onClick={dismissBanner}
                    className="w-full sm:w-auto bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* URGENT ALERT */}
        {myData.urgentReminders.length > 0 && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-1 self-stretch bg-red-500 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold text-sm">Urgent — Hearing Today or Tomorrow</h3>
                <p className="text-red-500 text-xs mt-0.5 mb-3">Prepare immediately for the following matters.</p>
                <div className="flex flex-wrap gap-2">
                  {myData.urgentReminders.map(c => (
                    <button key={c.id} onClick={() => navigate(`/lawyer/cases/${c.id}`)} className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-600 hover:text-white transition">
                      {c.fileName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PENDING DRAFTS ALERT */}
        {pendingIncomingCount > 0 && activeTab !== "Drafts" && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl cursor-pointer" onClick={() => setActiveTab("Drafts")}>
            <div className="flex items-center gap-3">
              <div className="w-1 self-stretch bg-amber-500 rounded-full flex-shrink-0" />
              <div>
                <h3 className="text-amber-800 font-semibold text-sm">Drafting Work Pending</h3>
                <p className="text-amber-600 text-xs mt-0.5">You have {pendingIncomingCount} draft request{pendingIncomingCount > 1 ? 's' : ''} awaiting your attention.</p>
              </div>
            </div>
          </div>
        )}

        {/* UPCOMING DEADLINES */}
        {myData.pendingDeadlines.length > 0 && (
          <div className="bg-white p-8 rounded-[40px] shadow-sm border-none">
            <h2 className="text-sm font-semibold text-slate-800 mb-6 uppercase tracking-wider">Upcoming Court Deadlines</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-4">Deadline / Required Action</th>
                    <th className="pb-4">Related Matter</th>
                    <th className="pb-4">Due Date</th>
                    <th className="pb-4">Category</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {myData.pendingDeadlines.map(deadline => (
                    <tr key={deadline.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-slate-800">{deadline.title}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <button onClick={() => navigate(`/lawyer/cases/${deadline.caseId}`)} className="text-blue-500 hover:text-blue-700 font-medium text-xs uppercase tracking-wide transition truncate max-w-[200px] block text-left">
                          ⚖️ {deadline.caseFileName}
                        </button>
                      </td>
                      <td className="py-4 pr-4 font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-slate-600">{new Date(deadline.dueDate).toLocaleDateString()}</span>
                          <span className={`mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border w-fit ${getUrgencyStyles(getDeadlineUrgency(deadline.dueDate))}`}>
                            {getDeadlineUrgency(deadline.dueDate)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                          {deadline.category || "GENERAL"}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => updateCourtCaseDeadline(deadline.caseId, deadline.id, { status: 'Completed' })}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-2 ml-auto"
                        >
                          ✓ Mark Done
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TASKS TABLE */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Instructions to Clerks</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3">Instruction</th>
                  <th className="px-5 py-3 whitespace-nowrap">Assigned Clerk</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 hidden md:table-cell">Feedback</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {myTasks.length > 0 ? myTasks.map(task => (
                  <tr key={task.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{task.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                      {task.relatedFileName && <p className="text-xs text-blue-500 font-medium mt-1">{task.relatedFileName}</p>}
                    </td>
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{task.assignedToName}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-semibold ${task.status === "Completed" ? "text-emerald-600" : "text-amber-600"}`}>{task.status}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs italic hidden md:table-cell">{task.clerkNote || "Awaiting update…"}</td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button onClick={() => openEditModal(task)} className="text-slate-400 hover:text-blue-600 text-[11px] font-medium uppercase tracking-wider mr-3 transition">Edit</button>
                      <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-red-600 text-[11px] font-medium uppercase tracking-wider transition">Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm italic text-slate-300">No instructions currently pending.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABS — hidden on mobile, shown on desktop */}
        <div>
          <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex gap-8 border-b border-slate-200 overflow-x-auto">
              {(["Cases", "Transactions", "Letters", "Drafts", "Registry", "Calendar"] as const).map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                  className={`pb-3 text-xs font-semibold uppercase tracking-wider transition border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                  {tab}
                  {tab === "Drafts" && pendingIncomingCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{pendingIncomingCount}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative">
              <input type="text" placeholder={`Search ${activeTab.toLowerCase()}…`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm text-sm outline-none focus:ring-2 focus:ring-blue-500 w-72" />
              <span className="absolute left-3.5 top-3.5 text-slate-400 text-sm">🔍</span>
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>}
            </div>
          </div>

          {searchQuery && <p className="text-xs font-medium text-slate-400 mb-4">{currentCount} result{currentCount !== 1 ? "s" : ""} for "{searchQuery}"</p>}

          {activeTab === "Calendar" && (
            <div className="col-span-3 bg-white p-8 rounded-[40px] shadow-sm">
              <CourtCalendar embedded />
            </div>
          )}

          <div className={activeTab === "Calendar" ? "hidden" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
            {activeTab === "Cases" && (filteredCases.length > 0
              ? filteredCases.map(c => <FileCard key={c.id} title={c.fileName} subtitle="Litigation Matter" status={c.status} date={c.nextCourtDate || "Date TBD"} onView={() => navigate(`/lawyer/cases/${c.id}`)} isLead={String(c.lawyerId) === String(currentUser.id)} />)
              : <p className="col-span-3 text-center text-sm italic text-slate-300 py-10">No cases found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>
            )}
            {activeTab === "Transactions" && (filteredTxs.length > 0
              ? filteredTxs.map(t => <FileCard key={t.id} title={t.fileName} subtitle={t.type} status={(t as any).status} date={t.date} onView={() => navigate(`/lawyer/transactions/${t.id}`)} />)
              : <p className="col-span-3 text-center text-sm italic text-slate-300 py-10">No transactions found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>
            )}
            {activeTab === "Letters" && (filteredLtrs.length > 0
              ? filteredLtrs.map(l => <FileCard key={l.id} title={l.subject} subtitle={l.type} status={l.status} date={l.date} onView={() => navigate(`/lawyer/letters/${l.id}`)} />)
              : <p className="col-span-3 text-center text-sm italic text-slate-300 py-10">No letters found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>
            )}
            {activeTab === "Drafts" && (
              <div className="col-span-3 space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Drafts assigned to me ({filteredAssignedDrafts.filter(d => d.status === draftsTab).length})</p>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setDraftsTab("Pending")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition ${draftsTab === "Pending" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Pending ({filteredAssignedDrafts.filter(d => d.status === 'Pending').length})
                      </button>
                      <button 
                        onClick={() => setDraftsTab("Completed")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition ${draftsTab === "Completed" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Completed ({filteredAssignedDrafts.filter(d => d.status === 'Completed').length})
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border-none overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="pb-4 pr-4">Draft Details</th>
                          <th className="pb-4 pr-4">Related Matter</th>
                          <th className="pb-4 pr-4">Requester</th>
                          <th className="pb-4 pr-4">Status & Due Date</th>
                          <th className="pb-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredAssignedDrafts.filter(d => d.status === draftsTab).length > 0 ? filteredAssignedDrafts.filter(d => d.status === draftsTab).map(draft => (
                          <tr key={draft.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                            <td className="py-4 pr-4 align-top">
                              <p className="font-semibold text-slate-800">{draft.title}</p>
                              <p className="text-xs text-slate-500 mt-1 max-w-sm">{draft.description}</p>
                            </td>
                            <td className="py-4 pr-4 align-top">
                              <button onClick={() => navigate(`/lawyer/cases/${draft.caseId}`)} className="text-blue-500 hover:text-blue-700 font-medium text-xs uppercase tracking-wide transition truncate max-w-[200px] block text-left">
                                ⚖️ {draft.caseFileName}
                              </button>
                            </td>
                            <td className="py-4 pr-4 align-top">
                              <span className="text-slate-600 font-medium">{draft.requestedByName}</span>
                            </td>
                            <td className="py-4 pr-4 align-top">
                              <div className="flex flex-col gap-2 items-start">
                                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${draft.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                  {draft.status}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">Due {draft.deadline}</span>
                              </div>
                            </td>
                            <td className="py-4 text-right align-top">
                              {draft.status === 'Pending' && (
                                <button onClick={() => setCompletingDraftId(draft.id)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ml-auto block">
                                  Complete
                                </button>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={5} className="py-8 text-center text-sm italic text-slate-300">No {draftsTab.toLowerCase()} drafts found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {filteredRequestedDrafts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Drafts I've delegated ({filteredRequestedDrafts.length})</p>
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border-none overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <th className="pb-4 pr-4">Draft Details</th>
                            <th className="pb-4 pr-4">Related Matter</th>
                            <th className="pb-4 pr-4">Assignee</th>
                            <th className="pb-4">Status & Due Date</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {filteredRequestedDrafts.map(draft => (
                            <tr key={draft.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                              <td className="py-4 pr-4 align-top">
                                <p className="font-semibold text-slate-800">{draft.title}</p>
                              </td>
                              <td className="py-4 pr-4 align-top">
                                <button onClick={() => navigate(`/lawyer/cases/${draft.caseId}`)} className="text-blue-500 hover:text-blue-700 font-medium text-xs uppercase tracking-wide transition truncate max-w-[200px] block text-left">
                                  ⚖️ {draft.caseFileName}
                                </button>
                              </td>
                              <td className="py-4 pr-4 align-top">
                                <span className="text-slate-600 font-medium">{draft.assignedToName}</span>
                              </td>
                              <td className="py-4 align-top">
                                <div className="flex flex-col gap-2 items-start">
                                  <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${draft.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {draft.status}
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">Due {draft.deadline}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "Registry" && (
              <div className="col-span-3 space-y-8">
                {/* Filings Requested by Me */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">My Outgoing Filing Requests ({filteredRequestedFilings.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequestedFilings.map(filing => (
                      <div key={filing.id} className="bg-white p-6 rounded-[32px] shadow-sm border-none">
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1 pr-4">
                            <h4 className="text-sm font-semibold text-slate-900">{filing.documentName}</h4>
                            <p className="text-[10px] font-bold text-blue-500 uppercase">⚖️ {filing.caseFileName}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${filing.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-600 text-white animate-pulse'}`}>{filing.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 line-clamp-2">{filing.description || "No specific instructions provided."}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-black text-slate-400 uppercase">
                          <span>👤 To Registry: {filing.assignedToName}</span>
                          {filing.status === 'Completed' && filing.eccmisReference && (
                            <span className="text-emerald-600">Ref: {filing.eccmisReference}</span>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50">
                          <button onClick={() => navigate(`/lawyer/cases/${filing.caseId}`)} className="text-[10px] font-black text-blue-600 uppercase hover:underline">View Matter Details</button>
                        </div>
                      </div>
                    ))}
                    {filteredRequestedFilings.length === 0 && (
                      <p className="col-span-3 text-center text-sm italic text-slate-300 py-10">No outgoing filings found.</p>
                    )}
                  </div>
                </div>

                {/* Filings Assigned to me (In case registry staff use this dashboard) */}
                {filteredAssignedFilings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Registry Filings Assigned to Me ({filteredAssignedFilings.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredAssignedFilings.map(filing => (
                        <div key={filing.id} className={`bg-white p-6 rounded-[32px] transition-all shadow-md`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1">
                              <h4 className="text-sm font-semibold text-slate-900">{filing.documentName}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">⚖️ {filing.caseFileName}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${filing.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{filing.status}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-[10px] font-black text-slate-400 uppercase mb-4">
                            <span>📦 From {filing.requestedByName}</span>
                            <span>📅 {new Date(filing.dateCreated).toLocaleDateString()}</span>
                          </div>
                          <div className="space-y-2">
                            {filing.status === 'Pending' && (
                              <button 
                                onClick={() => {
                                  const ref = prompt("Enter ECCMIS Reference Number:");
                                  if (ref) {
                                    updateFilingRequest(filing.id, { 
                                      status: 'Completed', 
                                      eccmisReference: ref,
                                      dateCompleted: new Date().toISOString()
                                    });
                                  }
                                }}
                                className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg shadow-emerald-900/10"
                              >
                                ✓ Mark as Filed
                              </button>
                            )}
                            <button onClick={() => navigate(`/lawyer/cases/${filing.caseId}`)} className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-blue-600 transition">
                              Open Matter Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row">
            <div className="bg-gradient-to-br from-[#0B1F3A] to-blue-900 md:w-2/5 p-10 text-white flex-col justify-between hidden md:flex">
              <div>
                <div className="bg-white/10 w-14 h-14 rounded-3xl flex items-center justify-center text-3xl mb-8 border border-white/5">{editingTaskId ? "✏️" : "✨"}</div>
                <h3 className="text-3xl font-bold tracking-tight mb-4 leading-tight">
                  {editingTaskId ? "Update" : "Delegate"}<br /><span className="text-blue-400">{editingTaskId ? "Instruction" : "New Work"}</span>
                </h3>
                <p className="text-blue-200/80 text-sm leading-relaxed max-w-[230px]">
                  {editingTaskId ? "Modify the details of this assignment." : "Clear instructions ensure timely, accurate delivery."}
                </p>
              </div>
              <div className="mt-10 bg-white/5 rounded-2xl p-5 border border-white/10">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">💡 Tip</p>
                <p className="text-xs text-blue-100/90 leading-relaxed">Linking a file gives the clerk instant access to related documents.</p>
              </div>
            </div>

            <div className="bg-white md:w-3/5 p-8 md:p-10 flex flex-col max-h-[90vh] overflow-y-auto w-full">
              <div className="flex justify-between items-center mb-8 md:hidden">
                <h3 className="text-xl font-bold text-slate-900">{editingTaskId ? "Edit Task" : "Assign Clerk"}</h3>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">✕</button>
              </div>

              <div className="flex-1 space-y-5">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Task Title</label>
                  <input placeholder="e.g., File documents at the High Court" className={inp} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Detailed Instructions</label>
                  <textarea placeholder="Provide specific deliverables and context…" className={inp + " resize-none"} rows={4} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Priority</label>
                    <select className={inp} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}>
                      <option value="Low">🟢 Low</option><option value="Medium">🟡 Medium</option><option value="High">🟠 High</option><option value="Urgent">🔴 Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Due Date</label>
                    <input type="date" className={inp} value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Assign To Clerk</label>
                    <select className={inp} value={taskForm.assignedToId} onChange={e => setTaskForm({ ...taskForm, assignedToId: e.target.value })}>
                      <option value="" disabled>Select assignee…</option>
                      {clerks.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Link File (Optional)</label>
                    <div className="relative">
                      <div onClick={() => setIsFileDropdownOpen(!isFileDropdownOpen)}
                        className={`${inp} cursor-pointer flex justify-between items-center pl-10 ${isFileDropdownOpen ? "border-blue-500 ring-4 ring-blue-500/10" : ""}`}>
                        <span className="truncate text-sm">{taskForm.relatedFileName || "No File Linked"}</span>
                        <span className={`text-slate-400 text-xs transition-transform ${isFileDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">📎</span>
                      </div>
                      {isFileDropdownOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden max-h-72">
                          <div className="p-3 border-b border-slate-100 bg-slate-50">
                            <div className="relative">
                              <input autoFocus type="text" placeholder="Search by file name…" value={fileSearch} onChange={e => setFileSearch(e.target.value)} onClick={e => e.stopPropagation()}
                                className="w-full bg-white border border-slate-200 p-2.5 pl-8 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                            </div>
                          </div>
                          <div className="overflow-y-auto p-2 space-y-1" onClick={e => e.stopPropagation()}>
                            <button className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium hover:bg-slate-50 transition ${!taskForm.relatedFileId ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                              onClick={() => { setTaskForm({ ...taskForm, relatedFileId: "", relatedFileType: "" as any, relatedFileName: "" }); setIsFileDropdownOpen(false); setFileSearch(""); }}>
                              ❌ No File Linked
                            </button>
                            {myData.cases.filter(c => c.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                              <div className="pt-2">
                                <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Court Cases</p>
                                {myData.cases.filter(c => c.fileName.toLowerCase().includes(fileSearch.toLowerCase())).map(c => (
                                  <button key={c.id} onClick={() => { setTaskForm({ ...taskForm, relatedFileId: c.id, relatedFileType: "case", relatedFileName: c.fileName }); setIsFileDropdownOpen(false); setFileSearch(""); }}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium hover:bg-slate-50 transition truncate flex items-center gap-2 ${taskForm.relatedFileId === c.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}>
                                    ⚖️ {c.fileName}
                                  </button>
                                ))}
                              </div>
                            )}
                            {myData.txs.filter(t => t.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                              <div className="pt-2">
                                <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Transactions</p>
                                {myData.txs.filter(t => t.fileName.toLowerCase().includes(fileSearch.toLowerCase())).map(t => (
                                  <button key={t.id} onClick={() => { setTaskForm({ ...taskForm, relatedFileId: t.id, relatedFileType: "transaction", relatedFileName: t.fileName }); setIsFileDropdownOpen(false); setFileSearch(""); }}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium hover:bg-slate-50 transition truncate flex items-center gap-2 ${taskForm.relatedFileId === t.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}>
                                    💼 {t.fileName}
                                  </button>
                                ))}
                              </div>
                            )}
                            {myData.ltrs.filter(l => ((l as any).subject || (l as any).title || (l as any).fileName || "").toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                              <div className="pt-2 pb-2">
                                <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Letters</p>
                                {myData.ltrs.filter(l => ((l as any).subject || (l as any).title || (l as any).fileName || "").toLowerCase().includes(fileSearch.toLowerCase())).map((l: any) => {
                                  const lName = l.subject || l.title || l.fileName || "Letter";
                                  return (
                                    <button key={l.id} onClick={() => { setTaskForm({ ...taskForm, relatedFileId: l.id, relatedFileType: "letter", relatedFileName: lName }); setIsFileDropdownOpen(false); setFileSearch(""); }}
                                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium hover:bg-slate-50 transition truncate flex items-center gap-2 ${taskForm.relatedFileId === l.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}>
                                      ✉️ {lName}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {isFileDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsFileDropdownOpen(false)} />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                <button onClick={closeModal} className="flex-1 bg-white border border-slate-200 text-slate-500 py-4 rounded-2xl text-xs font-semibold uppercase tracking-wider hover:bg-slate-50 transition">Cancel</button>
                <button onClick={handleSaveTask} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2">
                  {editingTaskId ? "Update Instruction" : "Dispatch Instruction"} 🚀
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE DRAFT MODAL */}
      {completingDraftId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Complete Draft</h3>
            <p className="text-slate-400 text-sm mb-7 leading-relaxed">Optionally attach the completed document before marking this as done.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Completion Note / Update (optional)</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                  rows={3}
                  placeholder="Provide a brief update..."
                  value={completeForm.completionNote}
                  onChange={e => setCompleteForm({ ...completeForm, completionNote: e.target.value })} 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Upload Document (optional)</label>
                <input type="file" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none" onChange={e => setCompleteForm({ ...completeForm, documentFile: e.target.files?.[0] || null })} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setCompletingDraftId(null); setCompleteForm({ hoursSpent: "", documentFile: null, completionNote: "" }); }} className="flex-1 text-slate-400 text-xs font-semibold uppercase">Cancel</button>
              <button onClick={handleCompleteDraft} disabled={uploading} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-lg hover:bg-emerald-700 transition disabled:opacity-50">
                {uploading ? "Uploading…" : "Mark as Complete"}
              </button>
            </div>
          </div>
        </div>
      )}\n
      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden">

        {/* Slide-up Menu Sheet */}
        {isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed bottom-[64px] inset-x-0 bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 animate-in slide-in-from-bottom duration-200">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Navigate to</p>
              <div className="grid grid-cols-4 gap-3">
                {([
                  { label: "Cases",        tab: "Cases" as const,       icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>) },
                  { label: "Transactions", tab: "Transactions" as const, icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
                  { label: "Letters",      tab: "Letters" as const,     icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>) },
                  { label: "Drafts",       tab: "Drafts" as const,      icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>), badge: pendingIncomingCount },
                  { label: "Registry",     tab: "Registry" as const,    icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>) },
                  { label: "Calendar",     tab: "Calendar" as const,    icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>) },
                ] as any[]).map(item => (
                  <button key={item.label}
                    onClick={() => { setActiveTab(item.tab); setSearchQuery(""); setIsMobileMenuOpen(false); }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition ${
                      activeTab === item.tab ? "bg-[#0B1F3A] text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}>
                    <div className="relative">
                      {item.icon}
                      {item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{item.badge}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium leading-none">{item.label}</span>
                  </button>
                ))}
                {/* Requisitions */}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate("/requisitions"); }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <span className="text-[10px] font-medium leading-none">Requisitions</span>
                </button>
                {/* Assign Task */}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setIsTaskModalOpen(true); }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                  <span className="text-[10px] font-medium leading-none text-center">Assign Task</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Bottom Tab Bar */}
        <nav className="bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-around px-2 h-16">
          {([
            { label: "Cases",    tab: "Cases" as const,    icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>) },
            { label: "Drafts",  tab: "Drafts" as const,   icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>), badge: pendingIncomingCount },
            { label: "Calendar",tab: "Calendar" as const,  icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>) },
            { label: "Letters", tab: "Letters" as const,   icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>) },
          ] as any[]).map(item => (
            <button key={item.label}
              onClick={() => { setActiveTab(item.tab); setSearchQuery(""); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition relative ${
                activeTab === item.tab && !isMobileMenuOpen ? "text-[#0B1F3A]" : "text-slate-400"
              }`}>
              <div className="relative">
                {item.icon}
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{item.badge}</span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${activeTab === item.tab && !isMobileMenuOpen ? "text-[#0B1F3A]" : "text-slate-400"}`}>{item.label}</span>
              {activeTab === item.tab && !isMobileMenuOpen && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0B1F3A] rounded-full" />}
            </button>
          ))}
          {/* Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(v => !v)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition ${
              isMobileMenuOpen ? "text-[#0B1F3A]" : "text-slate-400"
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}