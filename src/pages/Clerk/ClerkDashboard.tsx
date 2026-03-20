import { useState } from "react";
import { useAppContext } from "../../context/AppContext";

// Typography: Playfair Display (headings) + DM Sans (body)
// Add to index.html:
// <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />

const body: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const serif: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

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
    <div style={body} className="min-h-screen bg-[#F8FAFC] pb-20">

      {/* HEADER */}
      <div className="bg-[#0B1F3A] pt-14 pb-24 px-6 md:px-12 rounded-b-[60px] shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">Clerk Portal</p>
            <h1 style={serif} className="text-white text-3xl md:text-4xl font-bold tracking-tight">
              {currentUser.name.split(' ')[0]}'s Assignments
            </h1>
          </div>
          <button onClick={logout} className="bg-white/10 hover:bg-red-500/20 text-white px-5 py-3 rounded-2xl transition">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-red-200">Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12 space-y-6">

        {/* OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Assigned</p>
            <p className="text-2xl font-bold text-slate-800">{allMyTasks.length}</p>
          </div>
          <div
            onClick={() => setActiveTab("Pending")}
            className="bg-orange-50 border border-orange-100 p-6 rounded-[28px] shadow-sm cursor-pointer hover:shadow-md transition"
          >
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Pending Work</p>
            <p className="text-2xl font-bold text-orange-700">{pendingCount}</p>
          </div>
          <div
            onClick={() => setActiveTab("Completed")}
            className="bg-emerald-50 border border-emerald-100 p-6 rounded-[28px] shadow-sm cursor-pointer hover:shadow-md transition"
          >
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-bold text-emerald-700">{completedCount}</p>
          </div>
        </div>

        {/* TABS + SEARCH */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-8 border-b border-slate-200">
            {(["Pending", "Completed"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 ${activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
              >
                {tab} Tasks
                {tab === "Pending" && pendingCount > 0 && (
                  <span className="bg-orange-500 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tasks…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-9 py-2 rounded-xl border border-slate-200 bg-white shadow-sm text-sm outline-none focus:ring-2 focus:ring-blue-500 w-52 md:w-64"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 font-bold text-sm">×</button>
              )}
            </div>
            <select
              value={sortTasksBy}
              onChange={e => setSortTasksBy(e.target.value)}
              className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* TASK CARDS */}
        {myTasks.length > 0 ? myTasks.map(task => (
          <div key={task.id} className="bg-white p-7 rounded-[36px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                  {task.status}
                </span>
                {task.priority && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${priorityStyle(task.priority)}`}>
                    {task.priority} Priority
                  </span>
                )}
                {task.dueDate && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700">
                    Due: {task.dueDate}
                  </span>
                )}
                <span className="text-xs text-slate-400">From: {task.assignedByName}</span>
              </div>

              <h3 className="text-base font-semibold text-slate-900">{task.title}</h3>
              <p className="text-sm text-slate-500">{task.description}</p>

              {task.relatedFileName && (
                <p className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg inline-block uppercase tracking-wider">
                  📎 {task.relatedFileName}
                </p>
              )}

              {task.progressNotes && task.progressNotes.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Progress Updates</p>
                  {task.progressNotes.map((pn: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border-l-4 border-blue-400">
                      <p className="text-sm italic text-slate-600">"{pn.note}"</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">{pn.date}</p>
                    </div>
                  ))}
                </div>
              )}

              {task.clerkNote && (
                <div className="mt-3 p-4 bg-slate-50 rounded-2xl border-l-4 border-emerald-500">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Final Report</p>
                  <p className="text-sm italic text-slate-600">"{task.clerkNote}"</p>
                </div>
              )}
            </div>

            {task.status === "Pending" && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setSelectedTaskForUpdate(task)}
                  className="bg-blue-50 text-blue-600 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-blue-100 transition whitespace-nowrap"
                >
                  Add Update
                </button>
                <button
                  onClick={() => setSelectedTask(task)}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-emerald-600 transition shadow-lg whitespace-nowrap"
                >
                  Mark as Done
                </button>
              </div>
            )}
          </div>
        )) : (
          <div className="bg-white p-20 rounded-[40px] border border-dashed border-slate-200 text-center">
            <p className="text-sm italic text-slate-400">
              {searchQuery ? `No ${activeTab.toLowerCase()} tasks match your search.` : `No ${activeTab.toLowerCase()} tasks found.`}
            </p>
          </div>
        )}
      </div>

      {/* COMPLETION MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div style={body} className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 style={serif} className="text-2xl font-bold text-slate-900 mb-1">Task Feedback</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-8">
              Report to {selectedTask.assignedByName}
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Final Notes / Results</label>
              <textarea
                placeholder="e.g. Filed at High Court, stamped copy is on your desk."
                className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setSelectedTask(null); setNote(""); }} className="flex-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">Go Back</button>
              <button onClick={handleComplete} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-lg">
                Submit & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE MODAL */}
      {selectedTaskForUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div style={body} className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 style={serif} className="text-2xl font-bold text-slate-900 mb-1">Progress Update</h3>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-8">
              Post an update for {selectedTaskForUpdate.assignedByName}
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Progress Note</label>
              <textarea
                placeholder="e.g. At the court registry, queue is long. Will update soon."
                className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={updateNote}
                onChange={e => setUpdateNote(e.target.value)}
              />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setSelectedTaskForUpdate(null); setUpdateNote(""); }} className="flex-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">Cancel</button>
              <button onClick={handleAddUpdate} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-lg hover:bg-blue-700">
                Post Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}