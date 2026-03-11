import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import NotificationBell from "../NotificationBell";

const FileCard = ({ title, subtitle, status, date, onView, isLead }: any) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden">
    {isLead !== undefined && (
      <div className={`absolute top-0 right-0 px-3 py-1 text-[8px] font-black uppercase tracking-widest ${isLead ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
        {isLead ? 'Lead' : 'Assisting'}
      </div>
    )}
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-1">
        <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition">{title}</h4>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{subtitle}</p>
      </div>
      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
        }`}>
        {status}
      </span>
    </div>
    <div className="flex justify-between items-center mt-6">
      <p className="text-[10px] font-black text-slate-300 uppercase">{date}</p>
      <button
        onClick={onView}
        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition active:scale-95"
      >
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
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"Cases" | "Transactions" | "Letters" | "Drafts">("Cases");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedToId: "" });

  // Complete draft modal
  const [completingDraftId, setCompletingDraftId] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({ hoursSpent: "", documentFile: null as File | null });
  const [uploading, setUploading] = useState(false);

  if (!currentUser) return null;

  const clerks = users.filter(u => u.role === "clerk");
  const myTasks = tasks.filter(t => String(t.assignedById) === String(currentUser.id));

  // Draft requests logic
  const draftsAssignedToMe = draftRequests.filter(d => String(d.assignedToId) === String(currentUser.id));
  const draftsRequestedByMe = draftRequests.filter(d => String(d.requestedById) === String(currentUser.id));
  const pendingIncomingCount = draftsAssignedToMe.filter(d => d.status === 'Pending').length;

  const handleSaveTask = () => {
    const clerk = clerks.find(c => String(c.id) === String(taskForm.assignedToId));
    if (!taskForm.title || !clerk) return alert("Please fill title and select a clerk");
    if (editingTaskId) {
      updateTask(editingTaskId, { title: taskForm.title, description: taskForm.description, assignedToId: clerk.id, assignedToName: clerk.name });
    } else {
      addTask({ title: taskForm.title, description: taskForm.description, assignedToId: clerk.id, assignedToName: clerk.name, assignedById: currentUser.id, assignedByName: currentUser.name });
    }
    closeModal();
  };

  const openEditModal = (task: any) => {
    setEditingTaskId(task.id);
    setTaskForm({ title: task.title, description: task.description, assignedToId: task.assignedToId });
    setIsTaskModalOpen(true);
  };

  const closeModal = () => {
    setEditingTaskId(null);
    setTaskForm({ title: "", description: "", assignedToId: "" });
    setIsTaskModalOpen(false);
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
      const { error } = await supabase.storage.from('documents').upload(filePath, file);
      if (!error) {
        documentUrl = supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;
        documentName = file.name;
      }
    }

    completeDraftRequest(completingDraftId, completeForm.hoursSpent ? Number(completeForm.hoursSpent) : undefined, documentUrl, documentName);
    setCompletingDraftId(null);
    setCompleteForm({ hoursSpent: "", documentFile: null });
    setUploading(false);
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
      const courtDate = new Date(c.nextCourtDate); courtDate.setHours(0, 0, 0, 0);
      return courtDate.getTime() === now.getTime() || courtDate.getTime() === tomorrow.getTime();
    });

    return {
      cases: assignedCases,
      txs: transactions.filter(t => String(t.lawyerId) === userId && !t.archived),
      ltrs: letters.filter(l => (String(l.lawyerId) === userId || String((l as any).lawyer?.id) === userId) && !l.archived),
      nextHearing: upcoming || null,
      urgentReminders,
    };
  }, [courtCases, transactions, letters, currentUser.id, draftRequests]);

  const filteredCases = myData.cases.filter(c => c.fileName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTxs = myData.txs.filter(t => t.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) || t.type?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredLtrs = myData.ltrs.filter(l => l.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || l.type?.toLowerCase().includes(searchQuery.toLowerCase()) || l.recipient?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAssignedDrafts = draftsAssignedToMe.filter(d => d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.caseFileName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRequestedDrafts = draftsRequestedByMe.filter(d => d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.caseFileName?.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentCount =
    activeTab === "Cases" ? filteredCases.length :
      activeTab === "Transactions" ? filteredTxs.length :
        activeTab === "Letters" ? filteredLtrs.length :
          (filteredAssignedDrafts.length + filteredRequestedDrafts.length);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* HEADER */}
      <div className="bg-[#0B1F3A] pt-16 pb-24 px-6 md:px-12 rounded-b-[60px] shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Lawyer Portal</p>
              <h1 className="text-white text-3xl md:text-5xl font-black tracking-tight">
                Welcome, {currentUser.name.split(' ')[0]}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell currentUser={currentUser} notifications={notifications} markAsRead={() => markNotificationsAsRead(currentUser.id)} />
              <button onClick={() => setIsTaskModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl transition font-black text-[10px] uppercase tracking-widest shadow-lg">
                + Assign Clerk Task
              </button>
              <button onClick={logout} className="bg-white/10 hover:bg-red-500/20 text-white p-4 rounded-2xl transition group">
                <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-red-200">Logout</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-[30px] border border-white/10">
              <p className="text-[9px] font-black text-blue-300 uppercase mb-1">Active Matters</p>
              <p className="text-2xl font-black text-white">{myData.cases.length + myData.txs.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-[30px] border border-white/10">
              <p className="text-[9px] font-black text-blue-300 uppercase mb-1">Letters</p>
              <p className="text-2xl font-black text-white">{myData.ltrs.length}</p>
            </div>
            <div
              className={`p-6 rounded-[30px] border transition-all cursor-pointer ${pendingIncomingCount > 0 ? "bg-orange-500/20 border-orange-400/40" : "bg-white/5 border-white/10"}`}
              onClick={() => setActiveTab("Drafts")}
            >
              <p className="text-[9px] font-black text-blue-300 uppercase mb-1">Incoming Drafts</p>
              <p className="text-2xl font-black text-white">{pendingIncomingCount}</p>
            </div>
            <div
              onClick={() => myData.nextHearing && navigate(`/lawyer/cases/${myData.nextHearing.id}`)}
              className={`p-6 rounded-[30px] border transition-all cursor-pointer ${myData.nextHearing ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40 hover:bg-blue-500 active:scale-95" : "bg-white/5 border-white/10"}`}
            >
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-black text-blue-200 uppercase mb-1">Next Court</p>
                {myData.nextHearing && <span className="text-[8px] bg-white/20 px-2 py-0.5 rounded text-white font-black">LINKED</span>}
              </div>
              <p className="text-sm md:text-lg font-black text-white truncate">
                {myData.nextHearing ? myData.nextHearing.dateStr : "No Hearings"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-12 space-y-10">

        {/* URGENT ALERT */}
        {myData.urgentReminders.length > 0 && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-[32px] shadow-xl shadow-red-900/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-red-500 text-white p-3 rounded-2xl text-xl animate-bounce">⚠️</div>
                <div>
                  <h3 className="text-red-900 font-black text-xs uppercase tracking-widest">Urgent Preparation Required</h3>
                  <p className="text-red-600/80 text-[11px] font-bold">You have hearings scheduled for today or tomorrow.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {myData.urgentReminders.map(c => (
                  <button key={c.id} onClick={() => navigate(`/lawyer/cases/${c.id}`)} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition shadow-sm">
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
                <h3 className="text-orange-900 font-black text-xs uppercase tracking-widest">Drafting Work Pending</h3>
                <p className="text-orange-600/80 text-[11px] font-bold">You have {pendingIncomingCount} draft request{pendingIncomingCount > 1 ? 's' : ''} awaiting your attention. Click to view.</p>
              </div>
            </div>
          </div>
        )}

        {/* TASKS TABLE */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <h2 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-[0.2em] italic">Instructions sent to clerks</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="pb-4">Instruction</th>
                  <th className="pb-4">Assigned Clerk</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Clerk Feedback</th>
                  <th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {myTasks.length > 0 ? myTasks.map(task => (
                  <tr key={task.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="py-4"><p className="font-bold text-slate-800">{task.title}</p><p className="text-[10px] text-slate-400">{task.description}</p></td>
                    <td className="py-4 font-bold text-slate-600">{task.assignedToName}</td>
                    <td className="py-4"><span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${task.status === "Completed" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{task.status}</span></td>
                    <td className="py-4 italic text-slate-400">{task.clerkNote || "Awaiting update..."}</td>
                    <td className="py-4 text-right space-x-2">
                      <button onClick={() => openEditModal(task)} className="text-blue-600 hover:text-blue-800 font-black uppercase text-[9px] tracking-widest">Edit</button>
                      <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-600 font-black uppercase text-[9px] tracking-widest">Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-300 font-bold italic">No instructions currently pending.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABS + SEARCH */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex gap-8 border-b border-slate-200">
              {(["Cases", "Transactions", "Letters", "Drafts"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                  className={`pb-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px flex items-center gap-2 ${activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                >
                  {tab}
                  {tab === "Drafts" && pendingIncomingCount > 0 && (
                    <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{pendingIncomingCount}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all w-72"
              />
              <span className="absolute left-3.5 top-3.5 text-slate-400 text-sm">🔍</span>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 font-black text-lg leading-none">×</button>
              )}
            </div>
          </div>

          {searchQuery && (
            <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
              {currentCount} result{currentCount !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
          )}

          {/* FILE CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === "Cases" && (filteredCases.length > 0 ? filteredCases.map(c => (
              <FileCard key={c.id} title={c.fileName} subtitle="Litigation Matter" status={c.status} date={c.nextCourtDate || "Date TBD"} onView={() => navigate(`/lawyer/cases/${c.id}`)} isLead={String(c.lawyerId) === String(currentUser.id)} />
            )) : <p className="col-span-3 text-center text-slate-300 font-bold italic py-10">No cases found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>)}

            {activeTab === "Transactions" && (filteredTxs.length > 0 ? filteredTxs.map(t => (
              <FileCard key={t.id} title={t.fileName} subtitle={t.type} status={(t as any).status} date={t.date} onView={() => navigate(`/lawyer/transactions/${t.id}`)} />
            )) : <p className="col-span-3 text-center text-slate-300 font-bold italic py-10">No transactions found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>)}

            {activeTab === "Letters" && (filteredLtrs.length > 0 ? filteredLtrs.map(l => (
              <FileCard key={l.id} title={l.subject} subtitle={l.type} status={l.status} date={l.date} onView={() => navigate(`/lawyer/letters/${l.id}`)} />
            )) : <p className="col-span-3 text-center text-slate-300 font-bold italic py-10">No letters found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>)}

            {activeTab === "Drafts" && (
              <div className="col-span-3 space-y-8">
                {/* INCOMING DRAFTS */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Drafts assigned to me ({filteredAssignedDrafts.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssignedDrafts.map(draft => (
                      <div key={draft.id} className={`bg-white p-6 rounded-[32px] border transition-all group ${draft.status === 'Completed' ? 'border-emerald-100' : 'border-orange-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900">{draft.title}</h4>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">⚖️ {draft.caseFileName}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${draft.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                            {draft.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">{draft.description}</p>
                        <div className="flex flex-wrap gap-3 text-[10px] font-black text-slate-400 uppercase mb-4">
                          <span>📅 Due {draft.deadline}</span>
                          <span>👤 From {draft.requestedByName}</span>
                        </div>
                        {draft.status === 'Pending' && (
                          <button onClick={() => setCompletingDraftId(draft.id)} className="w-full bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition">Complete</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* OUTGOING DRAFTS */}
                {filteredRequestedDrafts.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Drafts I've delegated ({filteredRequestedDrafts.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredRequestedDrafts.map(draft => (
                        <div key={draft.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                          <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-700">{draft.title}</h4>
                              <p className="text-[11px] font-bold text-slate-400 uppercase">⚖️ {draft.caseFileName}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${draft.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {draft.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[10px] font-black text-slate-400 uppercase">
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
                    <p className="text-slate-300 font-bold italic">No draft requests found.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 mb-6 italic">{editingTaskId ? "Edit Instruction" : "Assign Clerk"}</h3>
            <div className="space-y-4">
              <input placeholder="What needs to be done?" className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
              <textarea placeholder="Detailed instructions..." className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
              <select className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold text-sm outline-none" value={taskForm.assignedToId} onChange={e => setTaskForm({ ...taskForm, assignedToId: e.target.value })}>
                <option value="">Select a Clerk...</option>
                {clerks.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={closeModal} className="flex-1 font-black text-slate-400 uppercase text-xs">Cancel</button>
              <button onClick={handleSaveTask} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg">
                {editingTaskId ? "Update Task" : "Send Instruction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE DRAFT MODAL */}
      {completingDraftId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-2">Complete Draft</h3>
            <p className="text-slate-400 text-sm mb-8">Attach the completed document. **Hours spent will be calculated automatically** based on the time since assignment.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Upload Document (optional)</label>
                <input type="file" className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold text-sm outline-none" onChange={e => setCompleteForm({ ...completeForm, documentFile: e.target.files?.[0] || null })} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setCompletingDraftId(null); setCompleteForm({ hoursSpent: "", documentFile: null }); }} className="flex-1 font-black text-slate-400 uppercase text-xs">Cancel</button>
              <button onClick={handleCompleteDraft} disabled={uploading} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-emerald-700 transition disabled:opacity-50">
                {uploading ? "Uploading..." : "Mark as Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}