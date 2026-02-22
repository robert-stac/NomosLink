import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
// Assuming you have the NotificationBell component we created earlier
import NotificationBell from "../NotificationBell"; 

/* =======================
   SUB-COMPONENT: FILE CARD
======================= */
const FileCard = ({ title, subtitle, status, date, onView }: any) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-1">
        <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition">{title}</h4>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{subtitle}</p>
      </div>
      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
        status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
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

/* =======================
   MAIN DASHBOARD
======================= */
export default function LawyerDashboard() {
  const navigate = useNavigate();
  // RESTORED: Added notifications and markNotificationsAsRead from context
  const { 
    currentUser, courtCases, transactions, letters, logout, 
    users, tasks, addTask, deleteTask, updateTask,
    notifications, markNotificationsAsRead 
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<"Cases" | "Transactions" | "Letters">("Cases");

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedToId: "" });

  if (!currentUser) return null;

  const clerks = users.filter(u => u.role === "clerk");
  const myTasks = tasks.filter(t => t.assignedById === currentUser.id);

  const handleSaveTask = () => {
    const clerk = clerks.find(c => c.id === taskForm.assignedToId);
    if (!taskForm.title || !clerk) return alert("Please fill title and select a clerk");
    
    if (editingTaskId) {
      updateTask(editingTaskId, {
        title: taskForm.title,
        description: taskForm.description,
        assignedToId: clerk.id,
        assignedToName: clerk.name
      });
    } else {
      addTask({
        title: taskForm.title,
        description: taskForm.description,
        assignedToId: clerk.id,
        assignedToName: clerk.name,
        assignedById: currentUser.id,
        assignedByName: currentUser.name
      });
    }

    closeModal();
  };

  const openEditModal = (task: any) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description,
      assignedToId: task.assignedToId
    });
    setIsTaskModalOpen(true);
  };

  const closeModal = () => {
    setEditingTaskId(null);
    setTaskForm({ title: "", description: "", assignedToId: "" });
    setIsTaskModalOpen(false);
  };

  const myData = useMemo(() => {
    const userId = String(currentUser.id);
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0,0,0,0);

    const assignedCases = courtCases.filter(c => String(c.lawyerId) === userId);
    
    const upcoming = assignedCases
      .filter(c => c.nextCourtDate && !isNaN(new Date(c.nextCourtDate).getTime()))
      .map(c => ({
        id: c.id,
        dateStr: c.nextCourtDate,
        timestamp: new Date(c.nextCourtDate).getTime()
      }))
      .filter(c => c.timestamp >= now.getTime())
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    const urgentReminders = assignedCases.filter(c => {
        if (!c.nextCourtDate) return false;
        const courtDate = new Date(c.nextCourtDate);
        courtDate.setHours(0,0,0,0);
        return courtDate.getTime() === now.getTime() || courtDate.getTime() === tomorrow.getTime();
    });

    return {
      cases: assignedCases,
      txs: transactions.filter(t => String(t.lawyerId) === userId),
      ltrs: letters.filter(l => {
        const lid = l.lawyerId || (l as any).lawyer?.id;
        return String(lid) === userId;
      }),
      nextHearing: upcoming || null,
      urgentReminders 
    };
  }, [courtCases, transactions, letters, currentUser.id]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
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
              {/* NOTIFICATION BELL ADDED HERE */}
              <NotificationBell 
                currentUser={currentUser} 
                notifications={notifications} 
                markAsRead={() => markNotificationsAsRead(currentUser.id)} 
              />

              <button 
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl transition font-black text-[10px] uppercase tracking-widest shadow-lg"
              >
                + Assign Clerk Task
              </button>
              <button 
                onClick={logout}
                className="bg-white/10 hover:bg-red-500/20 text-white p-4 rounded-2xl transition group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-red-200">Logout</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-[30px] border border-white/10">
              <p className="text-[9px] font-black text-blue-300 uppercase mb-1">Active Matters</p>
              <p className="text-2xl font-black text-white">{myData.cases.length + myData.txs.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-[30px] border border-white/10">
              <p className="text-[9px] font-black text-blue-300 uppercase mb-1">Letters</p>
              <p className="text-2xl font-black text-white">{myData.ltrs.length}</p>
            </div>
            <div 
              onClick={() => myData.nextHearing && navigate(`/lawyer/cases/${myData.nextHearing.id}`)}
              className={`p-6 rounded-[30px] border transition-all cursor-pointer ${
                myData.nextHearing ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40 hover:bg-blue-500 active:scale-95" : "bg-white/5 border-white/10"
              }`}
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
        
        {/* URGENT PREPARATION ALERT SECTION */}
        {myData.urgentReminders.length > 0 && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-[32px] shadow-xl shadow-red-900/5 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-red-500 text-white p-3 rounded-2xl text-xl animate-bounce">⚠️</div>
                <div>
                  <h3 className="text-red-900 font-black text-xs uppercase tracking-widest">Urgent Preparation Required</h3>
                  <p className="text-red-600/80 text-[11px] font-bold">You have hearings scheduled for today or tomorrow. Please review your files.</p>
                </div>
              </div>
              <div className="flex gap-2">
                {myData.urgentReminders.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => navigate(`/lawyer/cases/${c.id}`)}
                    className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition shadow-sm"
                  >
                    {c.fileName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
                    <td className="py-4">
                      <p className="font-bold text-slate-800">{task.title}</p>
                      <p className="text-[10px] text-slate-400">{task.description}</p>
                    </td>
                    <td className="py-4 font-bold text-slate-600">{task.assignedToName}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                        task.status === "Completed" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-4 italic text-slate-400">
                      {task.clerkNote || "Awaiting update..."}
                    </td>
                    <td className="py-4 text-right space-x-2">
                      <button 
                        onClick={() => openEditModal(task)} 
                        className="text-blue-600 hover:text-blue-800 font-black uppercase text-[9px] tracking-widest"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteTask(task.id)} 
                        className="text-red-400 hover:text-red-600 font-black uppercase text-[9px] tracking-widest"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-300 font-bold italic">No instructions currently pending.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="bg-white p-2 rounded-[32px] shadow-xl flex gap-2 mb-10 border border-slate-100 max-w-md">
            {["Cases", "Transactions", "Letters"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === "Cases" && myData.cases.map(c => (
              <FileCard key={c.id} title={c.fileName} subtitle="Litigation Matter" status={c.status} date={c.nextCourtDate || "Date TBD"} onView={() => navigate(`/lawyer/cases/${c.id}`)} />
            ))}
            {activeTab === "Transactions" && myData.txs.map(t => (
              <FileCard key={t.id} title={t.fileName} subtitle={t.type} status={t.status} date={t.date} onView={() => navigate(`/lawyer/transactions/${t.id}`)} />
            ))}
            {activeTab === "Letters" && myData.ltrs.map(l => (
              <FileCard key={l.id} title={l.subject} subtitle={l.type} status={l.status} date={l.date} onView={() => navigate(`/lawyer/letters/${l.id}`)} />
            ))}
          </div>
        </div>
      </div>

      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 mb-6 italic">{editingTaskId ? "Edit Instruction" : "Assign Clerk"}</h3>
            <div className="space-y-4">
              <input 
                placeholder="What needs to be done?" 
                className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                value={taskForm.title}
                onChange={e => setTaskForm({...taskForm, title: e.target.value})} 
              />
              <textarea 
                placeholder="Detailed instructions..." 
                className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                rows={3} 
                value={taskForm.description}
                onChange={e => setTaskForm({...taskForm, description: e.target.value})} 
              />
              <select 
                className="w-full bg-slate-50 border-none p-5 rounded-2xl font-bold text-sm outline-none" 
                value={taskForm.assignedToId}
                onChange={e => setTaskForm({...taskForm, assignedToId: e.target.value})}
              >
                <option value="">Select a Clerk...</option>
                {clerks.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={closeModal} className="flex-1 font-black text-slate-400 uppercase text-xs">Cancel</button>
              <button 
                onClick={handleSaveTask} 
                className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg"
              >
                {editingTaskId ? "Update Task" : "Send Instruction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}