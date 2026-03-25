import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import NotificationBell from "../NotificationBell";

const body: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const serif: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

const FileCard = ({ title, subtitle, status, date, onView, isLead }: any) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden">
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
    updateCourtCaseDeadline,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"Cases" | "Transactions" | "Letters" | "Drafts">("Cases");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedToId: "", priority: "Medium" as any, dueDate: "", relatedFileId: "", relatedFileType: "" as any, relatedFileName: "" });
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");

  const [completingDraftId, setCompletingDraftId] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({ hoursSpent: "", documentFile: null as File | null });
  const [uploading, setUploading] = useState(false);

  if (!currentUser) return null;

  const clerks = users.filter(u => u.role === "clerk");
  const myTasks = tasks.filter(t => String(t.assignedById) === String(currentUser.id));
  const draftsAssignedToMe = draftRequests.filter(d => String(d.assignedToId) === String(currentUser.id));
  const draftsRequestedByMe = draftRequests.filter(d => String(d.requestedById) === String(currentUser.id));
  const pendingIncomingCount = draftsAssignedToMe.filter(d => d.status === 'Pending').length;

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
      const { error } = await supabase.storage.from('documents').upload(filePath, file);
      if (!error) { documentUrl = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl; documentName = file.name; }
    }
    completeDraftRequest(completingDraftId, completeForm.hoursSpent ? Number(completeForm.hoursSpent) : undefined, documentUrl, documentName);
    setCompletingDraftId(null); setCompleteForm({ hoursSpent: "", documentFile: null }); setUploading(false);
  };

  const myData = useMemo(() => {
    const userId = String(currentUser.id);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);

    const assignedCases = courtCases.filter(c => {
      const isLead = String(c.lawyerId) === userId;
      const isAssistant = draftRequests.some(d => String(d.caseId) === String(c.id) && String(d.assignedToId) === userId);
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
      nextHearing: upcoming || null,
      urgentReminders,
      pendingDeadlines,
    };
  }, [courtCases, transactions, letters, currentUser.id, draftRequests]);

  const filteredCases = myData.cases.filter(c => c.fileName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTxs = myData.txs.filter(t => t.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) || t.type?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredLtrs = myData.ltrs.filter(l => l.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || l.type?.toLowerCase().includes(searchQuery.toLowerCase()) || l.recipient?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAssignedDrafts = draftsAssignedToMe.filter(d => d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.caseFileName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRequestedDrafts = draftsRequestedByMe.filter(d => d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.caseFileName?.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentCount = activeTab === "Cases" ? filteredCases.length : activeTab === "Transactions" ? filteredTxs.length : activeTab === "Letters" ? filteredLtrs.length : (filteredAssignedDrafts.length + filteredRequestedDrafts.length);

  const inp = "w-full bg-slate-50/50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition shadow-sm";

  return (
    <div style={body} className="min-h-screen bg-[#F8FAFC] pb-20">

      {/* HEADER */}
      <div className="bg-[#0B1F3A] pt-14 pb-24 px-6 md:px-12 rounded-b-[60px] shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-2">Lawyer Portal</p>
              <h1 style={serif} className="text-white text-3xl md:text-4xl font-bold tracking-tight">
                Welcome, {currentUser.name.split(' ')[0]}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell currentUser={currentUser} notifications={notifications} markAsRead={() => markNotificationsAsRead(currentUser.id)} />
              <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3.5 rounded-2xl transition text-xs font-semibold uppercase tracking-wider shadow-lg">
                + Assign Clerk Task
              </button>
              <button onClick={logout} className="bg-white/10 hover:bg-red-500/20 text-white px-4 py-3.5 rounded-2xl transition">
                <span className="text-xs font-semibold uppercase tracking-wider">Logout</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Active Matters", value: myData.cases.length + myData.txs.length, onClick: undefined, active: false },
              { label: "Letters", value: myData.ltrs.length, onClick: undefined, active: false },
            ].map(card => (
              <div key={card.label} className="bg-white/5 backdrop-blur-md p-6 rounded-[28px] border border-white/10">
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
            ))}
            <div className={`p-6 rounded-[28px] border transition cursor-pointer ${pendingIncomingCount > 0 ? "bg-orange-500/20 border-orange-400/40" : "bg-white/5 border-white/10"}`} onClick={() => setActiveTab("Drafts")}>
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">Incoming Drafts</p>
              <p className="text-2xl font-bold text-white">{pendingIncomingCount}</p>
            </div>
            <div onClick={() => myData.nextHearing && navigate(`/lawyer/cases/${myData.nextHearing.id}`)}
              className={`p-6 rounded-[28px] border transition cursor-pointer ${myData.nextHearing ? "bg-blue-600 border-blue-400 shadow-lg hover:bg-blue-500" : "bg-white/5 border-white/10"}`}>
              <div className="flex justify-between items-start">
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">Next Court</p>
                {myData.nextHearing && <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-semibold">Linked</span>}
              </div>
              <p className="text-lg font-bold text-white truncate">{myData.nextHearing ? myData.nextHearing.dateStr : "No Hearings"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-12 space-y-10">

        {/* URGENT ALERT */}
        {myData.urgentReminders.length > 0 && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-[32px] shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-red-500 text-white p-3 rounded-2xl text-xl animate-bounce">⚠️</div>
                <div>
                  <h3 className="text-red-900 font-semibold text-xs uppercase tracking-wider">Urgent Preparation Required</h3>
                  <p className="text-red-600/80 text-xs font-medium mt-0.5">You have hearings scheduled for today or tomorrow.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {myData.urgentReminders.map(c => (
                  <button key={c.id} onClick={() => navigate(`/lawyer/cases/${c.id}`)} className="bg-white border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-red-600 hover:text-white transition">
                    {c.fileName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PENDING DRAFTS ALERT */}
        {pendingIncomingCount > 0 && activeTab !== "Drafts" && (
          <div className="bg-orange-50 border border-orange-100 p-6 rounded-[32px] shadow-sm cursor-pointer" onClick={() => setActiveTab("Drafts")}>
            <div className="flex items-center gap-4">
              <div className="bg-orange-500 text-white p-3 rounded-2xl text-xl">📝</div>
              <div>
                <h3 className="text-orange-900 font-semibold text-xs uppercase tracking-wider">Drafting Work Pending</h3>
                <p className="text-orange-600/80 text-xs font-medium mt-0.5">You have {pendingIncomingCount} draft request{pendingIncomingCount > 1 ? 's' : ''} awaiting your attention.</p>
              </div>
            </div>
          </div>
        )}

        {/* UPCOMING DEADLINES */}
        {myData.pendingDeadlines.length > 0 && (
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
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
                      <td className="py-4 pr-4 font-medium text-slate-600 whitespace-nowrap">
                        {new Date(deadline.dueDate).toLocaleDateString()}
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
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800 mb-6 uppercase tracking-wider">Instructions to Clerks</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-4">Instruction</th><th className="pb-4">Assigned Clerk</th><th className="pb-4">Status</th><th className="pb-4">Clerk Feedback</th><th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {myTasks.length > 0 ? myTasks.map(task => (
                  <tr key={task.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="py-4">
                      <p className="font-semibold text-slate-800">{task.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                      {task.relatedFileName && <p className="text-xs text-blue-500 font-medium mt-1 uppercase tracking-wide">📎 {task.relatedFileName}</p>}
                    </td>
                    <td className="py-4 font-medium text-slate-600">{task.assignedToName}</td>
                    <td className="py-4"><span className={`px-2.5 py-1 rounded text-xs font-semibold ${task.status === "Completed" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{task.status}</span></td>
                    <td className="py-4 italic text-slate-400 text-xs">{task.clerkNote || "Awaiting update…"}</td>
                    <td className="py-4 text-right space-x-4">
                      <button onClick={() => openEditModal(task)} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">Edit</button>
                      <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-600 font-semibold text-xs">Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-8 text-center text-sm italic text-slate-300">No instructions currently pending.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABS */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex gap-8 border-b border-slate-200">
              {(["Cases", "Transactions", "Letters", "Drafts"] as const).map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                  className={`pb-3 text-xs font-semibold uppercase tracking-wider transition border-b-2 -mb-px flex items-center gap-2 ${activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Drafts assigned to me ({filteredAssignedDrafts.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssignedDrafts.map(draft => (
                      <div key={draft.id} className={`bg-white p-6 rounded-[32px] border transition-all ${draft.status === 'Completed' ? 'border-emerald-100' : 'border-orange-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1 pr-4">
                            <h4 className="text-sm font-semibold text-slate-900">{draft.title}</h4>
                            <p className="text-xs font-medium text-slate-400 uppercase">⚖️ {draft.caseFileName}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${draft.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{draft.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">{draft.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-400 mb-4">
                          <span>📅 Due {draft.deadline}</span>
                          <span>👤 From {draft.requestedByName}</span>
                        </div>
                        {draft.status === 'Pending' && (
                          <button onClick={() => setCompletingDraftId(draft.id)} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-emerald-700 transition">
                            Complete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {filteredRequestedDrafts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Drafts I've delegated ({filteredRequestedDrafts.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredRequestedDrafts.map(draft => (
                        <div key={draft.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                          <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1 pr-4">
                              <h4 className="text-sm font-semibold text-slate-700">{draft.title}</h4>
                              <p className="text-xs font-medium text-slate-400 uppercase">⚖️ {draft.caseFileName}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${draft.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{draft.status}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-400">
                            <span>📅 Due {draft.deadline}</span>
                            <span>👤 To {draft.assignedToName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {filteredAssignedDrafts.length === 0 && filteredRequestedDrafts.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-4">📝</p>
                    <p className="text-sm italic text-slate-300">No draft requests found.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TASK MODAL */}
      {isTaskModalOpen && (
        <div style={body} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row">
            <div className="bg-gradient-to-br from-[#0B1F3A] to-blue-900 md:w-2/5 p-10 text-white flex-col justify-between hidden md:flex">
              <div>
                <div className="bg-white/10 w-14 h-14 rounded-3xl flex items-center justify-center text-3xl mb-8 border border-white/5">{editingTaskId ? "✏️" : "✨"}</div>
                <h3 style={serif} className="text-3xl font-bold tracking-tight mb-4 leading-tight">
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
        <div style={body} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 style={serif} className="text-xl font-bold text-slate-900 mb-2">Complete Draft</h3>
            <p className="text-slate-400 text-sm mb-7 leading-relaxed">Optionally attach the completed document before marking this as done.</p>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Upload Document (optional)</label>
              <input type="file" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none" onChange={e => setCompleteForm({ ...completeForm, documentFile: e.target.files?.[0] || null })} />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setCompletingDraftId(null); setCompleteForm({ hoursSpent: "", documentFile: null }); }} className="flex-1 text-slate-400 text-xs font-semibold uppercase">Cancel</button>
              <button onClick={handleCompleteDraft} disabled={uploading} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-lg hover:bg-emerald-700 transition disabled:opacity-50">
                {uploading ? "Uploading…" : "Mark as Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}