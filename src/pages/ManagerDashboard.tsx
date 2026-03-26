import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "../components/NotificationBell";

export default function ManagerDashboard() {
  const { users, transactions, courtCases, letters, tasks, currentUser, notifications, markNotificationsAsRead, addTask, updateTask, deleteTask, updateCourtCaseDeadline } = useAppContext();
  const navigate = useNavigate();

  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyStagnant, setShowOnlyStagnant] = useState(false);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedToId: "", priority: "Medium" as any, dueDate: "", relatedFileId: "", relatedFileType: "" as any, relatedFileName: "" });
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");

  const isStagnant = (item: any) => {
    if (!item.progressNotes || item.progressNotes.length === 0) return true;
    const lastNoteDate = new Date(item.progressNotes[item.progressNotes.length - 1].date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastNoteDate < thirtyDaysAgo;
  };

  const legalStaff = users.filter(u => u.role === "lawyer" || u.role === "manager" || u.role === "clerk");
  const clerks = users.filter(u => u.role === "clerk");

  // ✅ Always exclude archived items from manager view
  const activeTransactions = transactions.filter(t => !t.archived);
  const activeCases = courtCases.filter(c => !c.archived);
  const activeLetters = letters.filter(l => !l.archived);

  const filterItem = (item: any) => {
    const matchesLawyer = !selectedLawyerId || item.lawyerId === selectedLawyerId;
    const matchesSearch = (item.fileName || item.subject || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStagnant = !showOnlyStagnant || isStagnant(item);
    return matchesLawyer && matchesSearch && matchesStagnant;
  };

  const filteredTransactions = activeTransactions.filter(filterItem);
  const filteredCases = activeCases.filter(filterItem);
  const filteredLetters = activeLetters.filter(filterItem);

  const baseFilter = (item: any) => {
    const matchesLawyer = !selectedLawyerId || item.lawyerId === selectedLawyerId;
    const matchesSearch = (item.fileName || item.subject || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLawyer && matchesSearch;
  };

  const stagnantCount =
    activeTransactions.filter(baseFilter).filter(isStagnant).length +
    activeCases.filter(baseFilter).filter(isStagnant).length +
    activeLetters.filter(baseFilter).filter(isStagnant).length;

  const totalFiles =
    activeTransactions.filter(baseFilter).length +
    activeCases.filter(baseFilter).length +
    activeLetters.filter(baseFilter).length;

  const selectedLawyerName = users.find(u => u.id === selectedLawyerId)?.name || "All Staff";

  const downloadGlobalReport = () => {
    const headers = ["Category", "File Name", "Status", "Assigned Counsel", "Latest Progress Note", "Last Updated", "Stagnant"];
    const getLastNote = (item: any) => {
      if (!item.progressNotes || item.progressNotes.length === 0) return ["No updates", "N/A"];
      const last = item.progressNotes[item.progressNotes.length - 1];
      return [last.message.replace(/"/g, '""'), last.date];
    };

    const dataRows: string[][] = [];
    [...filteredCases, ...filteredTransactions, ...filteredLetters].forEach(item => {
      const type = (item as any).subject ? "Letter" : ((item as any).nextCourtDate ? "Court Case" : "Transaction");
      const name = (item as any).fileName || (item as any).subject;
      const lawyer = users.find(u => u.id === item.lawyerId)?.name || "Unassigned";
      const [note, date] = getLastNote(item);
      dataRows.push([type, `"${name}"`, (item as any).status || "Active", `"${lawyer}"`, `"${note}"`, date, isStagnant(item) ? "YES" : "NO"]);
    });

    const csvContent = [headers, ...dataRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = `Report_${showOnlyStagnant ? "STAGNANT_" : ""}${selectedLawyerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDaysRemaining = (dateString: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateString); target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { text: "Today", urgent: true };
    if (diffDays === 1) return { text: "Tomorrow", urgent: true };
    if (diffDays < 0) return { text: "Past Due", urgent: true };
    return { text: `In ${diffDays} days`, urgent: false };
  };

  // Compute Upcoming Courts (Next 14 Days)
  const upcomingCourts = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const twoWeeksFromNow = new Date(); twoWeeksFromNow.setDate(today.getDate() + 14);

    return filteredCases
      .filter(c => {
        if (!c.nextCourtDate) return false;
        const d = new Date(c.nextCourtDate);
        return d >= today && d <= twoWeeksFromNow;
      })
      .sort((a, b) => new Date(a.nextCourtDate || 0).getTime() - new Date(b.nextCourtDate || 0).getTime());
  })();

  const pendingDeadlines = filteredCases.flatMap(c => 
    (c.deadlines || []).filter((d: any) => d.status === 'Pending').map((d: any) => ({
      ...d,
      caseId: c.id,
      caseFileName: c.fileName
    }))
  ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const handleSaveTask = () => {
    const clerk = clerks.find(c => String(c.id) === String(taskForm.assignedToId));
    if (!taskForm.title || !clerk) return alert("Please fill title and select a clerk");
    if (!currentUser) return;

    if (editingTaskId) {
      updateTask(editingTaskId, {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority || "Medium",
        dueDate: taskForm.dueDate || undefined,
        assignedToId: clerk.id,
        assignedToName: clerk.name,
        relatedFileId: taskForm.relatedFileId || undefined,
        relatedFileType: taskForm.relatedFileType || undefined,
        relatedFileName: taskForm.relatedFileName || undefined
      });
    } else {
      addTask({
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority || "Medium",
        dueDate: taskForm.dueDate || undefined,
        assignedToId: clerk.id,
        assignedToName: clerk.name,
        assignedById: currentUser.id,
        assignedByName: currentUser.name,
        relatedFileId: taskForm.relatedFileId || undefined,
        relatedFileType: taskForm.relatedFileType || undefined,
        relatedFileName: taskForm.relatedFileName || undefined
      });
    }
    closeModal();
  };

  const openEditModal = (task: any) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority || "Medium",
      dueDate: task.dueDate || "",
      assignedToId: task.assignedToId,
      relatedFileId: task.relatedFileId || "",
      relatedFileType: task.relatedFileType || "",
      relatedFileName: task.relatedFileName || ""
    });
    setIsTaskModalOpen(true);
  };

  const closeModal = () => {
    setEditingTaskId(null);
    setTaskForm({ title: "", description: "", assignedToId: "", priority: "Medium", dueDate: "", relatedFileId: "", relatedFileType: "" as any, relatedFileName: "" });
    setIsTaskModalOpen(false);
  };

  return (
    <div className="p-4 space-y-6">
      <header className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Legal Oversight</h1>
            <p className="text-sm text-gray-500">Monitoring: {selectedLawyerName} {showOnlyStagnant && "(Showing Stagnant Only)"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadGlobalReport}
              className="bg-[#0B1F3A] hover:bg-blue-900 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <span>📥</span> Export {showOnlyStagnant ? "Stagnant" : "Current"} Report
            </button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search files or subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border p-2 rounded-md w-64 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {(selectedLawyerId || showOnlyStagnant) && (
                <button
                  onClick={() => { setSelectedLawyerId(null); setShowOnlyStagnant(false); }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Clear All Filters
                </button>
              )}

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors shadow-sm ml-2"
              >
                <span>+</span> Assign Clerk Task
              </button>
            </div>

            {/* IN-APP NOTIFICATIONS */}
            <NotificationBell
              currentUser={currentUser}
              notifications={notifications}
              markAsRead={() => currentUser && markNotificationsAsRead(currentUser.id)}
            />

          </div>
        </div>
      </header>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setShowOnlyStagnant(false)}
          className={`p-4 rounded-lg border shadow-sm cursor-pointer transition-all ${!showOnlyStagnant ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
        >
          <p className="text-xs font-bold text-gray-400 uppercase">Active Files</p>
          <p className="text-2xl font-black text-slate-800">{totalFiles}</p>
        </div>
        <div
          onClick={() => setShowOnlyStagnant(!showOnlyStagnant)}
          className={`p-4 rounded-lg border shadow-sm cursor-pointer transition-all border-l-4 ${showOnlyStagnant ? 'bg-red-50 border-red-500 ring-2 ring-red-200' : 'bg-white border-l-red-500 hover:bg-red-50'
            }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-red-500 uppercase">Stagnant Files (30+ Days)</p>
            {showOnlyStagnant && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">FILTER ACTIVE</span>}
          </div>
          <p className="text-2xl font-black text-red-700">{stagnantCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-xs font-bold text-blue-500 uppercase">Current View</p>
          <p className="text-2xl font-black text-blue-800">{showOnlyStagnant ? "At Risk" : "Standard"}</p>
        </div>
      </div>

      {/* UPCOMING COURT DATES (14 Days) */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
        <h3 className="text-lg font-bold text-slate-700 mb-4">Upcoming Court Dates (14 Days)</h3>
        {upcomingCourts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingCourts.map((c: any) => {
              const countdown = getDaysRemaining(c.nextCourtDate);
              const assignedLawyer = users.find(u => u.id === c.lawyerId)?.name || "Unassigned";
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/lawyer/cases/${c.id}`)}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer bg-slate-50"
                  title={`Assigned to: ${assignedLawyer}`}
                >
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{c.fileName}</div>
                    <div className={`text-xs font-bold mt-1 ${countdown.urgent ? "text-red-500" : "text-blue-600"}`}>
                      {countdown.text} • <span className="font-normal text-gray-500">{assignedLawyer}</span>
                    </div>
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                    {new Date(c.nextCourtDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 italic py-6">No upcoming hearings scheduled in the next 14 days.</p>
        )}
      </div>

      {/* PENDING DEADLINES */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mt-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-700">Upcoming Court Deadlines</h3>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{pendingDeadlines.length}</span>
        </div>
        {pendingDeadlines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b">
                  <th className="pb-3 pr-4">Deadline / Required Action</th>
                  <th className="pb-3 pr-4">Related Matter</th>
                  <th className="pb-3 pr-4">Due Date</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingDeadlines.map((deadline: any) => {
                  const countdown = getDaysRemaining(deadline.dueDate);
                  return (
                  <tr key={deadline.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                    <td className="py-3 pr-4">
                      <p className="font-bold text-slate-800">{deadline.title}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <button onClick={() => navigate(`/lawyer/cases/${deadline.caseId}`)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase transition truncate max-w-[200px] block text-left">
                        ⚖️ {deadline.caseFileName}
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-700 whitespace-nowrap">
                        {new Date(deadline.dueDate).toLocaleDateString()}
                      </div>
                      <div className={`text-xs font-bold ${countdown.urgent ? "text-red-500" : "text-gray-500"}`}>
                        {countdown.text}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border uppercase">
                        {deadline.category || "GENERAL"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button 
                        onClick={() => updateCourtCaseDeadline(deadline.caseId, deadline.id, { status: 'Completed' })}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap inline-flex items-center gap-2"
                      >
                        ✓ Mark Done
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 italic py-6">No pending court deadlines.</p>
        )}
      </div>

      {/* STAFF FILTER PILLS */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {legalStaff.map(staff => (
          <button
            key={staff.id}
            onClick={() => setSelectedLawyerId(staff.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-all ${selectedLawyerId === staff.id
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
              }`}
          >
            {staff.name} {staff.id === currentUser?.id ? "(You)" : ""}
          </button>
        ))}
      </div>

      <div className={`grid gap-6 ${selectedLawyerId
          ? users.find(u => u.id === selectedLawyerId)?.role === 'clerk'
            ? 'grid-cols-1 max-w-2xl mx-auto'
            : 'grid-cols-1 lg:grid-cols-3'
          : 'grid-cols-1 lg:grid-cols-4'
        }`}>
        {/* TASKS (Clerk specific) */}
        {(!selectedLawyerId || users.find(u => u.id === selectedLawyerId)?.role === 'clerk') && (
          <div className="bg-white p-4 rounded-lg shadow border">
            <h2 className="font-bold text-slate-700 mb-4 flex justify-between items-center">
              Clerk Tasks
              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full">
                {tasks.filter(t => !t.deleted && (!selectedLawyerId || t.assignedToId === selectedLawyerId)).length}
              </span>
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {tasks.filter(t => !t.deleted && (!selectedLawyerId || t.assignedToId === selectedLawyerId)).map(task => (
                <div key={task.id} className="p-3 border rounded-md bg-slate-50 relative group">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-sm text-emerald-900">{task.title}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2">{task.description}</p>
                  {task.clerkNote && <p className="text-[10px] text-emerald-600 mt-2 italic font-bold">Report: {task.clerkNote}</p>}
                  <p className="text-[9px] text-slate-400 mt-2 font-black uppercase tracking-tighter">Assigned To: {task.assignedToName} | By: {task.assignedByName || "System"}</p>

                  {String(task.assignedById) === String(currentUser?.id) && (
                    <div className="absolute top-2 right-12 hidden group-hover:flex space-x-2 bg-white/80 p-1 rounded">
                      <button onClick={(e) => { e.stopPropagation(); openEditModal(task); }} className="text-[9px] font-black text-blue-600 uppercase">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-[9px] font-black text-red-600 uppercase">Delete</button>
                    </div>
                  )}
                </div>
              ))}
              {tasks.filter(t => !t.deleted && (!selectedLawyerId || t.assignedToId === selectedLawyerId)).length === 0 && <p className="text-slate-400 text-xs italic text-center py-4">No tasks found.</p>}
            </div>
          </div>
        )}

        {/* ONLY SHOW THESE IF NOT A CLERK OR IF NO ONE IS SELECTED */}
        {(!selectedLawyerId || users.find(u => u.id === selectedLawyerId)?.role !== 'clerk') && (
          <>
            {/* TRANSACTIONS */}
            <div className="bg-white p-4 rounded-lg shadow border">
              <h2 className="font-bold text-slate-700 mb-4 flex justify-between items-center">
                Transactions
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{filteredTransactions.length}</span>
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {filteredTransactions.map(tx => (
                  <div key={tx.id} onClick={() => navigate(`/lawyer/transactions/${tx.id}`)} className="p-3 border rounded-md hover:border-blue-500 cursor-pointer bg-slate-50 relative">
                    {isStagnant(tx) && <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Stagnant"></span>}
                    <p className="font-semibold text-sm text-blue-900">{tx.fileName}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-1 italic mt-1">{tx.progressNotes?.slice(-1)[0]?.message || "No updates"}</p>
                  </div>
                ))}
                {filteredTransactions.length === 0 && <p className="text-slate-400 text-xs italic text-center py-4">No active transactions.</p>}
              </div>
            </div>

            {/* COURT CASES */}
            <div className="bg-white p-4 rounded-lg shadow border">
              <h2 className="font-bold text-slate-700 mb-4 flex justify-between items-center">
                Court Cases
                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">{filteredCases.length}</span>
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {filteredCases.map(c => (
                  <div key={c.id} onClick={() => navigate(`/lawyer/cases/${c.id}`)} className="p-3 border rounded-md hover:border-red-500 cursor-pointer bg-slate-50 relative">
                    {isStagnant(c) && <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Stagnant"></span>}
                    <p className="font-semibold text-sm text-red-900">{c.fileName}</p>
                    <div className="flex justify-between mt-1"><span className="text-[10px] bg-white border px-1 rounded text-gray-600">Next: {c.nextCourtDate || "None"}</span></div>
                  </div>
                ))}
                {filteredCases.length === 0 && <p className="text-slate-400 text-xs italic text-center py-4">No active court cases.</p>}
              </div>
            </div>

            {/* LETTERS */}
            <div className="bg-white p-4 rounded-lg shadow border">
              <h2 className="font-bold text-slate-700 mb-4 flex justify-between items-center">
                Letters & Documents
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">{filteredLetters.length}</span>
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {filteredLetters.map(l => (
                  <div key={l.id} onClick={() => navigate(`/lawyer/letters/${l.id}`)} className="p-3 border rounded-md hover:border-amber-500 cursor-pointer bg-slate-50 relative">
                    {isStagnant(l) && <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Stagnant"></span>}
                    <p className="font-semibold text-sm text-amber-900">{l.subject}</p>
                    <p className="text-[11px] text-gray-600 mt-1 uppercase font-bold">{l.type}</p>
                  </div>
                ))}
                {filteredLetters.length === 0 && <p className="text-slate-400 text-xs italic text-center py-4">No active letters.</p>}
              </div>
            </div>
          </>
        )}
      </div>
      {/* TASK MODAL OVERHAUL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ perspective: '1000px' }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row transform transition-all animate-in fade-in zoom-in-95 duration-300">

            {/* LEFT BANNER: CONTEXT */}
            <div className="bg-gradient-to-br from-[#0B1F3A] to-blue-900 md:w-2/5 p-10 text-white flex flex-col justify-between hidden md:flex">
              <div>
                <div className="bg-white/10 w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mb-8 shadow-inner border border-white/5">
                  {editingTaskId ? "✏️" : "✨"}
                </div>
                <h3 className="text-4xl font-black tracking-tighter mb-4 leading-tight">
                  {editingTaskId ? "Update" : "Delegate"}<br />
                  <span className="text-blue-400">{editingTaskId ? "Instruction" : "New Work"}</span>
                </h3>
                <p className="text-blue-200/80 text-sm font-medium leading-relaxed max-w-[250px]">
                  {editingTaskId
                    ? "Carefully modify the details of this assignment to keep your clerk perfectly aligned."
                    : "Assign work efficiently. Clear instructions and priorities ensure your clerks can deliver timely results."}
                </p>
              </div>

              <div className="mt-12 space-y-4">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-400 text-lg">💡</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Pro Tip</p>
                  </div>
                  <p className="text-xs text-blue-100/90 leading-relaxed font-medium">Linking a court case or transaction automatically gives the clerk instant access to related documents.</p>
                </div>
              </div>
            </div>

            {/* RIGHT AREA: FORM */}
            <div className="bg-white md:w-3/5 p-8 md:p-10 flex flex-col justify-between max-h-[90vh] overflow-y-auto w-full">

              <div className="flex justify-between items-center mb-8 md:hidden">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingTaskId ? "Edit Task" : "Assign Clerk"}</h3>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition">✕</button>
              </div>

              <div className="flex-1 space-y-6">

                {/* Title */}
                <div className="group relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Task Title</label>
                  <input
                    placeholder="E.g., File documents at the High Court"
                    className="w-full bg-slate-50/50 border border-slate-200 p-4 rounded-2xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                    value={taskForm.title}
                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div className="group relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Detailed Instructions</label>
                  <textarea
                    placeholder="Provide specific deliverables and context..."
                    className="w-full bg-slate-50/50 border border-slate-200 p-4 rounded-2xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm resize-none"
                    rows={4}
                    value={taskForm.description}
                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Priority */}
                  <div className="group relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Priority Level</label>
                    <div className="relative">
                      <select
                        className="w-full bg-slate-50/50 border border-slate-200 p-4 rounded-2xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
                        value={taskForm.priority}
                        onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                      >
                        <option value="Low">🟢 Low Priority</option>
                        <option value="Medium">🟡 Medium Priority</option>
                        <option value="High">🟠 High Priority</option>
                        <option value="Urgent">🔴 Urgent!</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="group relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Due Date</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50/50 border border-slate-200 p-4 rounded-2xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm cursor-pointer"
                      value={taskForm.dueDate}
                      onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Assign To */}
                  <div className="group relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Assign To Clerk</label>
                    <div className="relative">
                      <select
                        className="w-full bg-slate-50/50 border border-slate-200 p-4 rounded-2xl font-bold text-sm text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
                        value={taskForm.assignedToId}
                        onChange={e => setTaskForm({ ...taskForm, assignedToId: e.target.value })}
                      >
                        <option value="" disabled>Select Assignee...</option>
                        {clerks.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                    </div>
                  </div>

                  {/* Link File */}
                  <div className="group relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Link File (Optional)</label>
                    <div className="relative">
                      <div
                        onClick={() => setIsFileDropdownOpen(!isFileDropdownOpen)}
                        className={`w-full bg-slate-50/50 border ${isFileDropdownOpen ? "border-blue-500 ring-4 ring-blue-500/10" : "border-slate-200"} p-4 pl-10 rounded-2xl font-bold text-sm text-slate-800 transition-all shadow-sm cursor-pointer flex justify-between items-center`}
                      >
                        <span className="truncate">{taskForm.relatedFileName || "No File Linked"}</span>
                        <span className={`text-slate-400 text-xs transition-transform ${isFileDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📎</span>
                      </div>

                      {isFileDropdownOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden max-h-72">
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                              <input
                                autoFocus
                                type="text"
                                placeholder="Search by file name..."
                                className="w-full bg-white border border-slate-200 p-3 pl-9 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                value={fileSearch}
                                onChange={e => setFileSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                            </div>
                          </div>

                          <div className="overflow-y-auto p-2 space-y-1 relative" onClick={e => e.stopPropagation()}>
                            <button
                              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition ${!taskForm.relatedFileId ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                              onClick={() => {
                                setTaskForm({ ...taskForm, relatedFileId: "", relatedFileType: "" as any, relatedFileName: "" });
                                setIsFileDropdownOpen(false);
                                setFileSearch("");
                              }}
                            >
                              ❌ No File Linked
                            </button>

                            {/* Court Cases */}
                            {activeCases.filter(c => c.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                              <div className="pt-2">
                                <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Court Cases</p>
                                {activeCases.filter(c => c.fileName.toLowerCase().includes(fileSearch.toLowerCase())).map(c => (
                                  <button
                                    key={`case-${c.id}`}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center gap-2 ${taskForm.relatedFileId === c.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                    onClick={() => {
                                      setTaskForm({ ...taskForm, relatedFileId: c.id, relatedFileType: "case", relatedFileName: c.fileName });
                                      setIsFileDropdownOpen(false);
                                      setFileSearch("");
                                    }}
                                  >
                                    <span className="text-sm">⚖️</span> {c.fileName}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Transactions */}
                            {activeTransactions.filter(t => t.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                              <div className="pt-2">
                                <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Transactions</p>
                                {activeTransactions.filter(t => t.fileName.toLowerCase().includes(fileSearch.toLowerCase())).map(t => (
                                  <button
                                    key={`tx-${t.id}`}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center gap-2 ${taskForm.relatedFileId === t.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                    onClick={() => {
                                      setTaskForm({ ...taskForm, relatedFileId: t.id, relatedFileType: "transaction", relatedFileName: t.fileName });
                                      setIsFileDropdownOpen(false);
                                      setFileSearch("");
                                    }}
                                  >
                                    <span className="text-sm">💼</span> {t.fileName}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Letters */}
                            {activeLetters.filter(l => ((l as any).subject || (l as any).title || (l as any).fileName || "").toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                              <div className="pt-2 pb-2">
                                <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Letters</p>
                                {activeLetters.filter(l => ((l as any).subject || (l as any).title || (l as any).fileName || "").toLowerCase().includes(fileSearch.toLowerCase())).map((l: any) => {
                                  let lName = l.subject || l.title || l.fileName || "Letter";
                                  return (
                                    <button
                                      key={`ltr-${l.id}`}
                                      className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center gap-2 ${taskForm.relatedFileId === l.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                      onClick={() => {
                                        setTaskForm({ ...taskForm, relatedFileId: l.id, relatedFileType: "letter", relatedFileName: lName });
                                        setIsFileDropdownOpen(false);
                                        setFileSearch("");
                                      }}
                                    >
                                      <span className="text-sm">✉️</span> {lName}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Empty State */}
                            {activeCases.filter(c => c.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length === 0 &&
                              activeTransactions.filter(t => t.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length === 0 &&
                              activeLetters.filter(l => ((l as any).subject || (l as any).title || (l as any).fileName || "").toLowerCase().includes(fileSearch.toLowerCase())).length === 0 && (
                                <div className="py-8 text-center px-4">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching files found.</p>
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* We keep a hidden overlay that triggers dropdown close if clicking outside */}
                      {isFileDropdownOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setIsFileDropdownOpen(false)} />
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION AREA */}
              <div className="flex gap-4 mt-10 pt-6 border-t border-slate-100">
                <button
                  onClick={closeModal}
                  className="flex-1 bg-white border border-slate-200 text-slate-500 py-4 lg:py-5 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-50 hover:text-slate-800 transition-all tracking-widest hover:shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 lg:py-5 rounded-2xl font-black uppercase text-[10px] shadow-[0_8px_30px_rgb(37,99,235,0.2)] active:scale-95 transition-all tracking-widest flex items-center justify-center gap-2"
                >
                  <span>{editingTaskId ? "Update Instruction" : "Dispatch Instruction"}</span>
                  <span className="text-sm">🚀</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}