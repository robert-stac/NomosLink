import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import NotificationBell from "../NotificationBell";
import CourtCalendar from "../CourtCalendar";

export default function ClerkDashboard() {
  const navigate = useNavigate();
  const {
    currentUser, tasks, completeTask, appendTaskNote, logout,
    notifications, markNotificationsAsRead,
  } = useAppContext();

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTaskForUpdate, setSelectedTaskForUpdate] = useState<any>(null);
  const [note, setNote] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const [sortTasksBy, setSortTasksBy] = useState("newest");
  const [activeTab, setActiveTab] = useState<"Pending" | "Completed" | "Calendar">("Pending");
  const [searchQuery, setSearchQuery] = useState("");

  if (!currentUser) return null;

  const allMyTasks = tasks.filter(t => String(t.assignedToId) === String(currentUser.id) && !t.deleted);
  const pendingCount = allMyTasks.filter(t => t.status === "Pending").length;
  const completedCount = allMyTasks.filter(t => t.status === "Completed").length;

  const myTasks = allMyTasks
    .filter(t => activeTab === "Calendar" ? true : t.status === activeTab)
    .filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.relatedFileName && t.relatedFileName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.assignedByName && t.assignedByName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortTasksBy === "oldest") return new Date(a.dateCreated || 0).getTime() - new Date(b.dateCreated || 0).getTime();
      return new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime();
    });

  const handleComplete = () => {
    if (!note.trim()) return alert("Please add a completion note.");
    completeTask(selectedTask.id, note);
    setSelectedTask(null);
    setNote("");
  };

  const handleAddUpdate = () => {
    if (!updateNote.trim()) return alert("Please type your progress update.");
    appendTaskNote(selectedTaskForUpdate.id, updateNote);
    setSelectedTaskForUpdate(null);
    setUpdateNote("");
  };

  const priorityStyle = (priority: string) => {
    switch (priority) {
      case "Urgent": return "bg-red-100 text-red-700";
      case "High": return "bg-orange-100 text-orange-700";
      case "Low": return "bg-slate-100 text-slate-500";
      default: return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">

      {/* ── HEADER ── */}
      <div className="bg-[#0B1F3A] pt-12 pb-20 px-5 md:px-12 rounded-b-[48px] shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-widest mb-1">Clerk Portal</p>
              <h1 className="text-white text-2xl font-semibold tracking-tight">
                Welcome, {currentUser.name.split(' ')[0]}
              </h1>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <NotificationBell currentUser={currentUser} notifications={notifications} markAsRead={() => markNotificationsAsRead(currentUser.id)} />
                <span className="text-[9px] font-medium text-white/60 uppercase tracking-widest"></span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <button onClick={() => navigate("/requisitions")} className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition" title="Requisitions">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
                <span className="text-[9px] font-medium text-white/60 uppercase tracking-widest">Requisition</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <button onClick={logout} className="bg-white/10 hover:bg-red-500/30 text-white/70 hover:text-white p-2.5 rounded-xl transition" title="Logout">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
                <span className="text-[9px] font-medium text-white/60 uppercase tracking-widest">Logout</span>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl">
              <p className="text-[10px] font-medium text-blue-300 uppercase tracking-wider mb-1">Total Assigned</p>
              <p className="text-2xl font-semibold text-white">{allMyTasks.length}</p>
            </div>
            <div
              onClick={() => setActiveTab("Pending")}
              className={`p-4 rounded-2xl cursor-pointer transition ${pendingCount > 0 ? "bg-amber-500/20" : "bg-white/5"}`}
            >
              <p className="text-[10px] font-medium text-blue-300 uppercase tracking-wider mb-1">Pending Work</p>
              <p className="text-2xl font-semibold text-white">{pendingCount}</p>
            </div>
            <div
              onClick={() => setActiveTab("Completed")}
              className="bg-white/5 backdrop-blur-md p-4 rounded-2xl cursor-pointer transition hover:bg-white/10"
            >
              <p className="text-[10px] font-medium text-blue-300 uppercase tracking-wider mb-1">Completed</p>
              <p className="text-2xl font-semibold text-white">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12 space-y-6">

        {/* ── SEGMENTED TAB CONTROL ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 flex gap-1">
          {(["Pending", "Completed", "Calendar"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? "bg-[#0B1F3A] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab === "Calendar" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              ) : tab === "Pending" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              <span className="hidden sm:inline">{tab === "Calendar" ? "Calendar" : `${tab}`}</span>
              {tab === "Pending" && pendingCount > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  activeTab === tab ? "bg-white/20 text-white" : "bg-orange-500 text-white"
                }`}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search + Sort row */}
        {activeTab !== "Calendar" && (
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search tasks…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3.5 top-3.5 text-slate-400 text-sm">🔍</span>
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>}
            </div>
            <select
              value={sortTasksBy}
              onChange={e => setSortTasksBy(e.target.value)}
              className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm shrink-0"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === "Calendar" && (
          <div className="bg-white p-4 md:p-8 rounded-[40px] shadow-sm overflow-hidden">
            <div className="max-h-[70vh] md:max-h-none overflow-y-auto">
              <CourtCalendar embedded />
            </div>
          </div>
        )}

        {/* TASK CARDS */}
        {activeTab !== "Calendar" && (myTasks.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {myTasks.map(task => (
              <div key={task.id} className="bg-white p-7 rounded-[32px] shadow-sm flex flex-col justify-between gap-6 border border-slate-100 transition-all hover:shadow-md">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                      {task.status}
                    </span>
                    {task.priority && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${priorityStyle(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 uppercase tracking-wider">
                        Due: {task.dueDate}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2">{task.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{task.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Assigned By: {task.assignedByName}</span>
                  </div>

                  {task.relatedFileName && (
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50/80 border border-blue-100 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 uppercase tracking-wider">
                        <span>⚖️</span> {task.relatedFileName}
                      </span>
                    </div>
                  )}

                  {task.progressNotes && task.progressNotes.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Progress Updates</p>
                      <div className="max-h-[120px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {task.progressNotes.map((pn: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                            <p className="text-xs text-slate-600 font-medium leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>{pn.note}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">{pn.date}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.clerkNote && (
                    <div className="mt-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider mb-1.5">Final Report</p>
                      <p className="text-sm font-medium text-emerald-900 leading-relaxed">"{task.clerkNote}"</p>
                    </div>
                  )}
                </div>

                {task.status === "Pending" && (
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
                    <button
                      onClick={() => setSelectedTaskForUpdate(task)}
                      className="flex-1 bg-slate-50 text-slate-700 px-4 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider hover:bg-slate-100 hover:text-slate-900 transition-all border border-slate-200 text-center"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="flex-1 bg-[#0B1F3A] text-white px-4 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider hover:bg-blue-900 transition-all shadow-md text-center"
                    >
                      Mark Done
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-20 rounded-[40px] border border-dashed border-slate-200 text-center">
            <p className="text-sm font-medium text-slate-400">
              {searchQuery ? `No ${activeTab.toLowerCase()} tasks match your search.` : `No ${activeTab.toLowerCase()} tasks found.`}
            </p>
          </div>
        ))}
      </div>

      {/* COMPLETION MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-900 mb-1">Task Feedback</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-8">
              Report to {selectedTask.assignedByName}
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Final Notes / Results</label>
              <textarea
                placeholder="e.g. Filed at High Court, stamped copy is on your desk."
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setSelectedTask(null); setNote(""); }} className="flex-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">Go Back</button>
              <button onClick={handleComplete} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-lg hover:bg-emerald-600 transition">
                Submit &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE MODAL */}
      {selectedTaskForUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-900 mb-1">Progress Update</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-8">
              Post an update for {selectedTaskForUpdate.assignedByName}
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Progress Note</label>
              <textarea
                placeholder="e.g. At the court registry, queue is long. Will update soon."
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={updateNote}
                onChange={e => setUpdateNote(e.target.value)}
              />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setSelectedTaskForUpdate(null); setUpdateNote(""); }} className="flex-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">Cancel</button>
              <button onClick={handleAddUpdate} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-lg hover:bg-blue-700 transition">
                Post Update
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}