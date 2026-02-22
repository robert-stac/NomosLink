import { useState } from "react";
import { useAppContext } from "../../context/AppContext";

export default function ClerkDashboard() {
  const { currentUser, tasks, completeTask, logout } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [note, setNote] = useState("");

  if (!currentUser) return null;

  // Filter tasks specifically assigned to the logged-in clerk
  const myTasks = tasks.filter(t => String(t.assignedToId) === String(currentUser.id));

  const handleComplete = () => {
    if (!note.trim()) return alert("Please add a note about the task completion.");
    completeTask(selectedTask.id, note);
    setSelectedTask(null);
    setNote("");
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
        {/* TASK LIST */}
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-4">Current Workload</h2>
        
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
                  <p className="text-[10px] font-black text-slate-300 uppercase">From: Counsel {task.assignedByName}</p>
                </div>
                <h3 className="text-lg font-black text-slate-900">{task.title}</h3>
                <p className="text-sm text-slate-500 font-medium">{task.description}</p>
                
                {task.clerkNote && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border-l-4 border-emerald-500">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Your Report:</p>
                    <p className="text-xs italic text-slate-600 font-bold">"{task.clerkNote}"</p>
                  </div>
                )}
              </div>

              {task.status === "Pending" && (
                <button 
                  onClick={() => setSelectedTask(task)}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-lg active:scale-95 whitespace-nowrap"
                >
                  Mark as Done
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white p-20 rounded-[40px] border border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No tasks assigned to you yet</p>
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
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Notes / Results</label>
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
    </div>
  );
}