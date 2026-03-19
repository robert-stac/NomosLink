import { useState } from "react";
import { useAppContext } from "../../context/AppContext";

export default function ClerkDashboard() {
  const { currentUser, tasks, completeTask, appendTaskNote, logout } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTaskForUpdate, setSelectedTaskForUpdate] = useState<any>(null);
  const [note, setNote] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const [sortTasksBy, setSortTasksBy] = useState("newest");
  const [activeTab, setActiveTab] = useState<"Pending" | "Completed">("Pending");
  const [searchQuery, setSearchQuery] = useState("");

  if (!currentUser) return null;

  // Filter tasks specifically assigned to the logged-in clerk (exclude soft-deleted)
  const allMyTasks = tasks.filter(t => String(t.assignedToId) === String(currentUser.id) && !t.deleted);
  
  const pendingCount = allMyTasks.filter(t => t.status === "Pending").length;
  const completedCount = allMyTasks.filter(t => t.status === "Completed").length;
  
  const myTasks = allMyTasks
    .filter(t => t.status === activeTab)
    .filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.relatedFileName && t.relatedFileName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.assignedByName && t.assignedByName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortTasksBy) {
        case "newest": return new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime();
        case "oldest": return new Date(a.dateCreated || 0).getTime() - new Date(b.dateCreated || 0).getTime();
        default: return new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime();
      }
    });

  const handleComplete = () => {
    if (!note.trim()) return alert("Please add a note about the task completion.");
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* HEADER */}
      <div className="bg-[#0B1F3A] pt-16 pb-24 px-6 md:px-12 rounded-b-[60px] shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Clerk Portal</p>
            <h1 className="text-white text-3xl md:text-5xl font-black tracking-tight">
              Assignments: {currentUser.name.split(' ')[0]}
            </h1>
          </div>
          <button
            onClick={logout}
            className="bg-white/10 hover:bg-red-500/20 text-white p-4 rounded-2xl transition group"
          >
            <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-red-200">Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12 space-y-6">
        {/* OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
          <div className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Assigned</p>
            <p className="text-2xl font-black text-slate-800">{allMyTasks.length}</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 p-6 rounded-[30px] shadow-sm cursor-pointer hover:shadow-md transition" onClick={() => setActiveTab("Pending")}>
            <p className="text-[9px] font-black text-orange-500 uppercase mb-1">Pending Work</p>
            <p className="text-2xl font-black text-orange-700">{pendingCount}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[30px] shadow-sm cursor-pointer hover:shadow-md transition" onClick={() => setActiveTab("Completed")}>
            <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">Completed</p>
            <p className="text-2xl font-black text-emerald-700">{completedCount}</p>
          </div>
        </div>

        {/* TABS + SEARCH */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex gap-8 border-b border-slate-200">
            {(["Pending", "Completed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                className={`pb-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab} Tasks
                {tab === "Pending" && pendingCount > 0 && (
                  <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white shadow-sm text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all w-48 md:w-64"
              />
              <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 font-black text-sm leading-none">×</button>
              )}
            </div>
            
            <select 
              value={sortTasksBy} 
              onChange={(e) => setSortTasksBy(e.target.value)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {myTasks.length > 0 ? (
          myTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {task.status}
                  </span>
                  {task.priority && (
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      task.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                      task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'Low' ? 'bg-slate-100 text-slate-500' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {task.priority} Priority
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-purple-50 text-purple-700">
                      Due: {task.dueDate}
                    </span>
                  )}
                  <p className="text-[10px] font-black text-slate-300 uppercase">From: Counsel {task.assignedByName}</p>
                </div>
                <h3 className="text-lg font-black text-slate-900">{task.title}</h3>
                <p className="text-sm text-slate-500 font-medium">{task.description}</p>
                {task.relatedFileName && (
                  <p className="text-[10px] text-blue-600 font-black mt-1 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg inline-block">
                    📎 Linked File: {task.relatedFileName}
                  </p>
                )}

                {task.progressNotes && task.progressNotes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Progress Updates:</p>
                    {task.progressNotes.map((pn: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border-l-4 border-blue-400">
                        <p className="text-xs italic text-slate-600">"{pn.note}"</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{pn.date}</p>
                      </div>
                    ))}
                  </div>
                )}

                {task.clerkNote && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border-l-4 border-emerald-500">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Final Report:</p>
                    <p className="text-xs italic text-slate-600 font-bold">"{task.clerkNote}"</p>
                  </div>
                )}
              </div>

              {task.status === "Pending" && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedTaskForUpdate(task)}
                    className="bg-blue-50 text-blue-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition whitespace-nowrap"
                  >
                    Add Update
                  </button>
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition shadow-lg active:scale-95 whitespace-nowrap"
                  >
                    Mark as Done
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white p-20 rounded-[40px] border border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-black text-xs uppercase tracking-widest">
              {searchQuery ? `No ${activeTab.toLowerCase()} tasks match your search.` : `No ${activeTab.toLowerCase()} tasks found.`}
            </p>
          </div>
        )}
      </div>

      {/* COMPLETION MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 mb-2 italic">Task Feedback</h3>
            <p className="text-slate-400 text-xs font-bold uppercase mb-8 tracking-tight">Report the outcome to Counsel {selectedTask.assignedByName}</p>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Final Notes / Results</label>
              <textarea
                placeholder="e.g., Filed at High Court, stamped copy is on your desk."
                className="w-full bg-slate-50 border-none p-5 rounded-3xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => { setSelectedTask(null); setNote(""); }}
                className="flex-1 font-black text-slate-400 uppercase text-xs"
              >
                Go Back
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-200"
              >
                Submit & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE MODAL */}
      {selectedTaskForUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 mb-2 italic">Add Progress Update</h3>
            <p className="text-slate-400 text-xs font-bold uppercase mb-8 tracking-tight">Post an interim update for Counsel {selectedTaskForUpdate.assignedByName}</p>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Progress Note</label>
              <textarea
                placeholder="e.g., At the court registry, the queue is long. Will update soon."
                className="w-full bg-slate-50 border-none p-5 rounded-3xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={updateNote}
                onChange={e => setUpdateNote(e.target.value)}
              />
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => { setSelectedTaskForUpdate(null); setUpdateNote(""); }}
                className="flex-1 font-black text-slate-400 uppercase text-xs hover:text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUpdate}
                className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-700"
              >
                Post Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}