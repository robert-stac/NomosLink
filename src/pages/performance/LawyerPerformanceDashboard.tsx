import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

export default function LawyerPerformanceDashboard() {
  const {
    users, transactions, courtCases, letters, draftRequests, tasks, currentUser,
    addTransactionProgress, addCourtCaseProgress, addLetterProgress
  } = useAppContext();

  const location = useLocation();
  const navigate = useNavigate();
  const lawyers = users.filter((u) => u.role === "lawyer" || u.role === "clerk" || u.role === "manager");
  const [selectedLawyerId, setSelectedLawyerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [newNote, setNewNote] = useState("");

  // ── FIX: prevent the URL-param auto-open from firing more than once ──
  const hasAutoOpened = useRef(false);

  const activeTransactions = transactions.filter(t => !t.archived);
  const activeCases = courtCases.filter(c => !c.archived);
  const activeLetters = letters.filter(l => !l.archived);

  useEffect(() => {
    if (hasAutoOpened.current) return; // already fired once — never fire again
    const params = new URLSearchParams(location.search);
    const fileToFind = params.get("file");
    const triggerOpen = params.get("openDetails");
    if (fileToFind && triggerOpen) {
      const foundCase = activeCases.find(c => c.fileName === fileToFind);
      const foundTrans = activeTransactions.find(t => t.fileName === fileToFind);
      const foundLetter = activeLetters.find(l => (l.subject || (l as any).title || (l as any).fileName) === fileToFind);
      const targetFile = foundCase || foundTrans || foundLetter;
      if (targetFile) {
        hasAutoOpened.current = true; // mark as done before any state updates
        const lawyerId = targetFile.lawyerId || (targetFile as any).lawyer?.id;
        if (lawyerId) setSelectedLawyerId(lawyerId.toString());
        const category = foundCase ? "Court Case" : foundTrans ? "Transaction" : "Letter";
        setActiveFile({ ...targetFile, category, title: fileToFind });
      }
    }
  }, [location, activeCases, activeTransactions, activeLetters]);

  const stats = useMemo(() => {
    if (!selectedLawyerId) return null;
    const now = new Date();
    const tenDaysAgo = new Date(); tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const sid = String(selectedLawyerId);

    const myCases = sid === "ALL" ? activeCases : activeCases.filter(c => String(c.lawyerId) === sid);
    const myTransactions = sid === "ALL" ? activeTransactions : activeTransactions.filter(t => String(t.lawyerId) === sid);
    const myLetters = sid === "ALL" ? activeLetters : activeLetters.filter(l => String(l.lawyerId) === sid || String((l as any).lawyer?.id) === sid);
    const myDrafts = sid === "ALL" ? draftRequests : draftRequests.filter(d => String(d.assignedToId) === sid);
    const completedDrafts = myDrafts.filter(d => d.status === 'Completed');
    const pendingDrafts = myDrafts.filter(d => d.status === 'Pending');
    const totalDraftHours = completedDrafts.reduce((sum, d) => sum + (d.hoursSpent || 0), 0);
    const myTasks = sid === "ALL" ? tasks : tasks.filter(t => String(t.assignedToId) === sid);
    const completedTasks = myTasks.filter(t => t.status === 'Completed');
    const pendingTasks = myTasks.filter(t => t.status === 'Pending');

    const allFiles = [
      ...myCases.map(i => ({ ...i, category: "Court Case", title: i.fileName })),
      ...myTransactions.map(i => ({ ...i, category: "Transaction", title: i.fileName })),
      ...myLetters.map(i => ({ ...i, category: "Letter", title: i.subject || (i as any).title || (i as any).fileName || "Untitled Letter" }))
    ];

    const financials = { billed: 0, collected: 0 };
    myTransactions.forEach(t => {
      financials.billed += Number(t.billedAmount || (t as any).billed || 0);
      financials.collected += Number(t.paidAmount || (t as any).paid || 0);
    });
    myCases.forEach(c => {
      financials.billed += Number(c.billed || 0);
      financials.collected += Number(c.paid || 0);
    });
    myLetters.forEach(l => {
      financials.billed += Number(l.billed || (l as any).billedAmount || 0);
      financials.collected += Number(l.paid || (l as any).paidAmount || 0);
    });

    const stagnant = allFiles.filter(file => {
      if ((file as any).status === "Completed") return false;
      const notes = (file as any).progressNotes || [];
      let lastDate = notes.length === 0
        ? new Date((file as any).date || (file as any).createdAt || now)
        : new Date([...notes].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date);
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      (file as any).daysStagnant = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return !isNaN(lastDate.getTime()) && lastDate < tenDaysAgo;
    });

    return {
      financials,
      cases: myCases,
      transactions: myTransactions,
      letters: myLetters,
      stagnant: stagnant.sort((a: any, b: any) => b.daysStagnant - a.daysStagnant),
      totalFiles: allFiles.length,
      realizationRate: financials.billed ? Math.round((financials.collected / financials.billed) * 100) : 0,
      drafts: { all: myDrafts, completed: completedDrafts, pending: pendingDrafts, totalHours: totalDraftHours },
      tasks: {
        all: myTasks, completed: completedTasks, pending: pendingTasks,
        completionRate: myTasks.length ? Math.round((completedTasks.length / myTasks.length) * 100) : 0
      }
    };
  }, [selectedLawyerId, activeCases, activeTransactions, activeLetters, draftRequests, tasks]);

  const filteredData = useMemo(() => {
    if (!stats) return null;
    const s = searchTerm.toLowerCase();
    return {
      cases: stats.cases.filter(c => c.fileName?.toLowerCase().includes(s)),
      transactions: stats.transactions.filter(t => t.fileName?.toLowerCase().includes(s)),
      letters: stats.letters.filter(l => (l.subject || (l as any).title || (l as any).fileName || "").toLowerCase().includes(s))
    };
  }, [stats, searchTerm]);

  const downloadWorkReport = () => {
    if (!stats) return;
    const staffName = selectedLawyerId === "ALL" ? "Firm_Overview" : (users.find(u => String(u.id) === String(selectedLawyerId))?.name || "Staff");
    const headers = ["Type", "Title", "Description", "Deadline/Date", "Status", "Report/Note", "Hours", "Linked File"];

    const draftRows = stats.drafts.all.map(d => [
      "Draft Request",
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.description.replace(/"/g, '""')}"`,
      `"${d.deadline || d.dateCreated}"`,
      `"${d.status}"`,
      `"Case: ${d.caseFileName}"`,
      `"${d.hoursSpent || ''}"`,
      '""'
    ]);

    const taskRows = stats.tasks.all.map(t => [
      "Clerical Task",
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.dateCreated}"`,
      `"${t.status}"`,
      `"${(t.clerkNote || '').replace(/"/g, '""')}"`,
      '""',
      `"${t.relatedFileName || ''}"`
    ]);

    const caseRows = stats.cases.map(c => [
      "Court Case",
      `"${c.fileName.replace(/"/g, '""')}"`,
      `"${(c.details || '').replace(/"/g, '""')}"`,
      '""', `"${c.status}"`, '""', '""', '""'
    ]);

    const txRows = stats.transactions.map(t => [
      "Transaction",
      `"${t.fileName.replace(/"/g, '""')}"`,
      `"${t.type}"`,
      `"${t.date || ''}"`,
      `"${t.archived ? 'Archived' : 'Active'}"`,
      `"Billed: ${t.billedAmount || 0} / Paid: ${t.paidAmount || 0}"`,
      '""', '""'
    ]);

    const letterRows = stats.letters.map(l => [
      "Letter",
      `"${((l as any).subject || (l as any).title || (l as any).fileName || '').replace(/"/g, '""')}"`,
      '""',
      `"${(l as any).date || ''}"`,
      `"${(l as any).status || 'Active'}"`,
      '""', '""', '""'
    ]);

    const csvContent = [headers, ...draftRows, ...taskRows, ...caseRows, ...txRows, ...letterRows]
      .map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${staffName}_Work_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeModal = () => {
    setActiveFile(null);
    setNewNote("");
    if (new URLSearchParams(location.search).get("openDetails")) {
      navigate("/performance", { replace: true });
    }
  };

  const handlePostNote = () => {
    if (!newNote.trim() || !activeFile) return;
    if (activeFile.category === "Court Case") addCourtCaseProgress(activeFile.id, newNote);
    else if (activeFile.category === "Transaction") addTransactionProgress(activeFile.id, newNote);
    else if (activeFile.category === "Letter") addLetterProgress(activeFile.id, newNote);
    setNewNote("");
    closeModal();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Partner Review</h1>
            <p className="text-slate-500 text-sm">Monitoring & Enforcement — Active Files Only</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 rounded-2xl border border-slate-200 w-full md:w-64 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all focus:border-blue-400"
              />
              <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            </div>
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <span className="px-4 text-[10px] font-bold text-slate-400 uppercase">Staff:</span>
              <select
                value={selectedLawyerId}
                onChange={e => setSelectedLawyerId(e.target.value)}
                className="bg-transparent font-bold p-2 min-w-[180px] outline-none text-sm cursor-pointer"
              >
                <option value="">Select Staff...</option>
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                  <option value="ALL">All Staff (Firm Overview)</option>
                )}
                {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            {stats && (
              <button
                onClick={downloadWorkReport}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
              >
                <span>📥</span> Export Work Report
              </button>
            )}
          </div>
        </div>

        {/* ── EMPTY STATE ── */}
        {!stats ? (
          <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <div className="text-4xl mb-4">👤</div>
            <p className="text-slate-400 font-medium">Select a staff member to begin the review process.</p>
          </div>
        ) : (
          <div className="space-y-10">

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <KPI label="Collections" value={`UGX ${stats.financials.collected.toLocaleString()}`} sub="Total Revenue" color="bg-slate-900 text-white" />
              <KPI label="Active Files" value={stats.totalFiles} sub="Assignments" color="bg-white text-slate-900 border" />
              <KPI label="Realization" value={`${stats.realizationRate}%`} sub="Billed vs Paid" color={stats.realizationRate > 80 ? "bg-emerald-600 text-white" : "bg-orange-500 text-white"} />
              <KPI label="Stagnant" value={stats.stagnant.length} sub="Needs Attention" color={stats.stagnant.length > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600"} />
            </div>

            {/* DRAFTS & TASKS */}
            {(stats.drafts.all.length > 0 || stats.tasks.all.length > 0) && (
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                  <span className="text-xl">📋</span>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight">Staff Assignments (Drafts & Tasks)</h3>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Drafts</p>
                      <p className="text-2xl font-black text-slate-900">{stats.drafts.all.length}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Tasks</p>
                      <p className="text-2xl font-black text-slate-900">{stats.tasks.all.length}</p>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Completions</p>
                      <p className="text-2xl font-black text-emerald-700">{stats.tasks.completed.length + stats.drafts.completed.length}</p>
                    </div>
                    <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Efficiency</p>
                      <p className="text-2xl font-black text-blue-700">{stats.tasks.completionRate}%</p>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-xl shadow-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Draft Hours</p>
                      <p className="text-2xl font-black">{stats.drafts.totalHours}h</p>
                    </div>
                  </div>

                  {stats.drafts.all.length > 0 && (
                    <div className="mb-10">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Legal Drafting</h4>
                      <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="pb-3">Draft Title</th>
                            <th className="pb-3">Case</th>
                            <th className="pb-3">Deadline</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {stats.drafts.all.map((d: any) => (
                            <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 font-bold text-slate-800">{d.title}</td>
                              <td className="py-4 text-slate-500 text-xs font-medium">{d.caseFileName}</td>
                              <td className="py-4 text-slate-500 text-xs font-medium">{d.deadline}</td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${d.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                  {d.status}
                                </span>
                              </td>
                              <td className="py-4 text-slate-500 text-xs font-bold text-right">{d.hoursSpent || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {stats.tasks.all.length > 0 && (
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Clerical Tasks</h4>
                      <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="pb-3">Task Description</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Report / Note</th>
                            <th className="pb-3 text-right">Linked File</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {stats.tasks.all.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4">
                                <p className="font-bold text-slate-800 text-sm">{t.title}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{t.description}</p>
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-4">
                                {t.clerkNote
                                  ? <p className="text-[11px] text-emerald-600 italic font-bold leading-tight max-w-xs">"{t.clerkNote}"</p>
                                  : <span className="text-slate-300 text-[10px] italic">No report filed</span>
                                }
                              </td>
                              <td className="py-4 text-slate-500 text-[10px] font-black uppercase text-right">{t.relatedFileName || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STAGNANT FILES */}
            {stats.stagnant.length > 0 && (
              <div className="bg-red-50 rounded-[32px] border border-red-200 overflow-hidden shadow-sm">
                <div className="p-6 bg-red-100/50 flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  <h3 className="font-black text-red-800 uppercase tracking-tight">Critical: Files Inactive for 10+ Days</h3>
                </div>
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-red-200">
                    {stats.stagnant.map((file: any, idx: number) => (
                      <tr key={idx} className="hover:bg-red-100/30 transition-colors">
                        <td className="p-4 pl-8 font-bold text-red-900">{file.title}</td>
                        <td className="p-4">
                          <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">{file.daysStagnant} DAYS STAGNANT</span>
                        </td>
                        <td className="p-4 text-right pr-8">
                          <button
                            onClick={e => { e.stopPropagation(); setActiveFile(file); }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
                          >
                            Add Urgent Note
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <FileTable
              title="Court Cases"
              items={filteredData?.cases || []}
              onRowClick={(item: any) => setActiveFile({ ...item, category: "Court Case", title: item.fileName })}
            />
            <FileTable
              title="Transactions"
              items={filteredData?.transactions || []}
              onRowClick={(item: any) => setActiveFile({ ...item, category: "Transaction", title: item.fileName })}
            />
            <FileTable
              title="Letters"
              items={filteredData?.letters || []}
              onRowClick={(item: any) => setActiveFile({ ...item, category: "Letter", title: item.subject || item.title || item.fileName })}
            />
          </div>
        )}
      </div>

      {/* ── PROGRESS NOTE MODAL ── */}
      {activeFile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="p-8 border-b flex justify-between items-center bg-slate-50 rounded-t-[32px]">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 px-2 py-1 bg-blue-50 rounded mb-1 inline-block">
                  {activeFile.category}
                </span>
                <h3 className="font-black text-2xl text-slate-800">{activeFile.title}</h3>
              </div>
              <button
                onClick={closeModal}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-400 text-lg font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Progress notes */}
            <div className="p-8 overflow-y-auto flex-1 space-y-4">
              {activeFile.progressNotes?.length > 0 ? (
                [...activeFile.progressNotes].map((n: any, idx: number) => {
                  const renderDate = (dStr: string) => {
                    const d = new Date(dStr);
                    if (isNaN(d.getTime())) return dStr;
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                  };
                  return (
                  <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-bold text-blue-700">{n.authorName}</span>
                      <span className="text-[10px] text-slate-400">{renderDate(n.date)}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{n.message}</p>
                  </div>
                )})
              ) : (
                <p className="text-slate-400 italic text-sm text-center py-10">No progress history found for this file.</p>
              )}
            </div>

            {/* Post note */}
            <div className="p-8 border-t bg-slate-50 rounded-b-[32px]">
              <div className="flex gap-3">
                <input
                  placeholder="Post instruction to staff..."
                  className="flex-1 bg-white border border-slate-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostNote(); } }}
                />
                <button
                  onClick={handlePostNote}
                  className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold transition-all text-sm"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

const KPI = ({ label, value, sub, color }: any) => (
  <div className={`p-6 rounded-[28px] shadow-sm flex flex-col justify-between h-full transition-transform hover:scale-[1.02] ${color}`}>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2">{label}</p>
      <p className="text-3xl font-black tracking-tight">{value}</p>
    </div>
    <p className="text-xs font-bold mt-4 opacity-80">{sub}</p>
  </div>
);

const FileTable = ({ title, items, onRowClick }: any) => (
  <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
    <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
      <h3 className="font-black text-lg text-slate-800">{title}</h3>
      <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black">{items.length}</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b">
          <tr>
            <th className="p-6 pl-8">Matter</th>
            <th className="p-6">Status</th>
            <th className="p-6 text-center">Notes</th>
            <th className="p-6 text-right pr-8">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 group transition-colors">
              <td className="p-6 pl-8 font-bold text-slate-700">
                {item.subject || item.title || item.fileName || "Untitled"}
              </td>
              <td className="p-6">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                  {item.status || 'Active'}
                </span>
              </td>
              <td className="p-6 text-center">
                <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg text-xs">
                  {item.progressNotes?.length || 0}
                </span>
              </td>
              <td className="p-6 text-right pr-8">
                <button
                  onClick={e => { e.stopPropagation(); onRowClick(item); }}
                  className="text-blue-600 hover:text-blue-800 font-bold text-xs transition-colors"
                >
                  Review Details
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="p-10 text-center text-slate-400 italic">No active files found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);