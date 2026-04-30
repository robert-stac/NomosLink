import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { NotificationBell } from "../components/NotificationBell";

export default function ManagerDashboard() {
  const { users, clients, transactions, courtCases, letters, tasks, currentUser, notifications, markNotificationsAsRead, addTask, updateTask, deleteTask, updateCourtCaseDeadline, filingRequests, updateFilingRequest } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(searchParams.get("lawyerId") || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyStagnant, setShowOnlyStagnant] = useState(false);

  useEffect(() => {
    const queryLawyerId = searchParams.get("lawyerId");
    if (queryLawyerId !== selectedLawyerId) {
      setSelectedLawyerId(queryLawyerId);
    }
  }, [searchParams]);

  const selectLawyer = (lawyerId: string | null) => {
    setSelectedLawyerId(lawyerId);
    const nextParams = new URLSearchParams(searchParams);
    if (lawyerId) {
      nextParams.set("lawyerId", lawyerId);
    } else {
      nextParams.delete("lawyerId");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedToId: "", priority: "Medium" as any, dueDate: "", relatedFileId: "", relatedFileType: "" as any, relatedFileName: "" });
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");

  const isStagnant = (item: any) => {
    let lastNoteDate: Date;
    if (!item.progressNotes || item.progressNotes.length === 0) {
      lastNoteDate = new Date(item.date || item.createdAt || new Date());
    } else {
      const lastNote = item.progressNotes[item.progressNotes.length - 1];
      // Robust parsing for legacy DD/MM/YYYY and new ISO formats
      if (lastNote.date.includes('/')) {
        const [d, m, y] = lastNote.date.split('/');
        lastNoteDate = new Date(`${y}-${m}-${d}`);
      } else {
        lastNoteDate = new Date(lastNote.date);
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastNoteDate < thirtyDaysAgo;
  };

  const needsFeedback = (item: any) => {
    if (item.archived || item.status === 'Completed') return false;

    const lastFeedback = item.lastClientFeedbackDate
      ? new Date(item.lastClientFeedbackDate)
      : new Date(item.date || item.createdAt || new Date());

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return lastFeedback < fourteenDaysAgo;
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

  const feedbackOverdueCount =
    activeTransactions.filter(baseFilter).filter(needsFeedback).length +
    activeCases.filter(baseFilter).filter(needsFeedback).length +
    activeLetters.filter(baseFilter).filter(needsFeedback).length;

  const feedbackOverdueFiles = [
    ...activeTransactions.filter(baseFilter).filter(needsFeedback),
    ...activeCases.filter(baseFilter).filter(needsFeedback),
    ...activeLetters.filter(baseFilter).filter(needsFeedback)
  ];

  const totalFiles =
    activeTransactions.filter(baseFilter).length +
    activeCases.filter(baseFilter).length +
    activeLetters.filter(baseFilter).length;

  const selectedLawyerName = users.find(u => u.id === selectedLawyerId)?.name || "All Staff";
  const formatCurrency = (n: number) => "UGX " + (n || 0).toLocaleString();

  // --- FINANCIAL SUMMARY ---
  const allActiveFiles = [
    ...activeTransactions.filter(baseFilter),
    ...activeCases.filter(baseFilter),
    ...activeLetters.filter(baseFilter),
  ];
  const totalBilledAll = allActiveFiles.reduce((s, f: any) => s + Number(f.billed || f.billedAmount || 0), 0);
  const totalPaidAll = allActiveFiles.reduce((s, f: any) => s + Number(f.paid || f.paidAmount || 0), 0);
  const totalOutstanding = totalBilledAll - totalPaidAll;
  const collectionRate = totalBilledAll > 0 ? Math.round((totalPaidAll / totalBilledAll) * 100) : 0;
  const missingCourtDates = activeCases.filter(baseFilter).filter((c: any) => !c.nextCourtDate).length;

  const _today = new Date();

  // --- WORKLOAD PER LAWYER ---
  const legalLawyers = users.filter(u => u.role === 'lawyer' || u.role === 'manager');
  const workloadByLawyer = legalLawyers.map(lawyer => {
    const lCases = activeCases.filter((c: any) => c.lawyerId === lawyer.id);
    const lTx = activeTransactions.filter((t: any) => t.lawyerId === lawyer.id);
    const lLetters = activeLetters.filter((l: any) => l.lawyerId === lawyer.id);
    const all = [...lCases, ...lTx, ...lLetters];
    const lBilled = all.reduce((s: number, f: any) => s + Number(f.billed || f.billedAmount || 0), 0);
    const lPaid = all.reduce((s: number, f: any) => s + Number(f.paid || f.paidAmount || 0), 0);
    const lStagnant = all.filter(isStagnant).length;
    return { lawyer, cases: lCases.length, transactions: lTx.length, letters: lLetters.length, total: all.length, billed: lBilled, paid: lPaid, stagnant: lStagnant };
  }).filter(w => w.total > 0).sort((a, b) => b.total - a.total);

  const [showWorkload, setShowWorkload] = useState(false);

  const downloadGlobalReport = () => {
    // Wraps any value in quotes AND strips newlines/tabs so a multi-line
    // progress note never breaks column alignment in Excel/Sheets.
    const csvCell = (val: string | number | null | undefined): string => {
      const s = String(val ?? "")
        .replace(/[\r\n\t]+/g, " ") // collapse newlines to a space
        .replace(/"/g, '""');        // escape internal quotes
      return `"${s}"`;
    };

    // Parse DD/MM/YYYY legacy format OR any ISO/JS-parseable string → Date | null
    const parseAnyDate = (raw: string | undefined | null): Date | null => {
      if (!raw) return null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw.trim())) {
        const [d, m, y] = raw.trim().split("/");
        const dt = new Date(`${y}-${m}-${d}`);
        return isNaN(dt.getTime()) ? null : dt;
      }
      const dt = new Date(raw);
      return isNaN(dt.getTime()) ? null : dt;
    };

    const fmtDate = (raw: string | undefined | null): string => {
      const dt = parseAnyDate(raw);
      if (!dt) return "N/A";
      return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    const fmtUGX = (n: number): string => "UGX " + n.toLocaleString("en-UG");

    const getLastNote = (item: any): { text: string; rawDate: string } => {
      if (!item.progressNotes || item.progressNotes.length === 0)
        return { text: "No updates recorded", rawDate: "" };
      const last = item.progressNotes[item.progressNotes.length - 1];
      return { text: last.message || "", rawDate: last.date || "" };
    };

    const getDaysSinceUpdate = (item: any): number => {
      const { rawDate } = getLastNote(item);
      const base = parseAnyDate(rawDate) || parseAnyDate(item.date || item.createdAt);
      if (!base) return 0;
      return Math.max(0, Math.floor((_today.getTime() - base.getTime()) / 86400000));
    };

    // ── build data rows ─────────────────────────────────────────────────────
    const allItems = [...filteredCases, ...filteredTransactions, ...filteredLetters];
    let totBilled = 0, totPaid = 0;
    let rowNum = 1;

    const dataRows: string[] = allItems.map(item => {
      const isLetter = !!(item as any).subject;
      const isCase = (item as any).nextCourtDate !== undefined && !isLetter;
      const category = isLetter ? "Letter" : isCase ? "Court Case" : "Transaction";

      const name = (item as any).fileName || (item as any).subject || "";
      const lawyer = users.find(u => u.id === item.lawyerId)?.name || "Unassigned";
      const { text: noteText, rawDate: noteRawDate } = getLastNote(item);
      const lastUpdated = fmtDate(noteRawDate);
      const daysSince = getDaysSinceUpdate(item);
      const stagnantFlag = isStagnant(item) ? "Yes" : "No";

      const billed = Number((item as any).billed || (item as any).billedAmount || 0);
      const paid = Number((item as any).paid || (item as any).paidAmount || 0);
      const balance = billed - paid;

      totBilled += billed;
      totPaid += paid;

      const createdDate = fmtDate((item as any).date || (item as any).createdAt || (item as any).dateCreated);
      const lastFeedback = fmtDate((item as any).lastClientFeedbackDate);
      const nextCourtDate = fmtDate((item as any).nextCourtDate);
      const status = (item as any).status || "Ongoing";

      return [
        csvCell(rowNum++),
        csvCell(category),
        csvCell(name),
        csvCell(status),
        csvCell(lawyer),
        csvCell(noteText),     // newlines stripped by csvCell
        csvCell(lastUpdated),
        csvCell(daysSince),
        csvCell(stagnantFlag),
        csvCell(fmtUGX(billed)),
        csvCell(fmtUGX(paid)),
        csvCell(fmtUGX(balance)),
        csvCell(lastFeedback === "N/A" ? "Never" : lastFeedback),
        csvCell(nextCourtDate),
      ].join(",");
    });

    const totBalance = totBilled - totPaid;
    const collRate = totBilled > 0 ? Math.round((totPaid / totBilled) * 100) + "%" : "N/A";

    // ── column header row ───────────────────────────────────────────────────
    const colHeaders = [
      "#", "Category", "File / Matter Name", "Status", "Assigned Counsel",
      "Latest Progress Note", "Last Updated", "Days Since Update", "Stagnant (30+ days)",
      "Billed (UGX)", "Paid (UGX)", "Balance Owed (UGX)",
      "Last Client Feedback", "Next Court Date",
    ].map(csvCell).join(",");

    // ── totals row ──────────────────────────────────────────────────────────
    const totalsRow = [
      csvCell(""), csvCell("TOTALS"), csvCell(""), csvCell(""), csvCell(""),
      csvCell(""), csvCell(""), csvCell(""), csvCell(""),
      csvCell(fmtUGX(totBilled)),
      csvCell(fmtUGX(totPaid)),
      csvCell(fmtUGX(totBalance)),
      csvCell(""), csvCell(""),
    ].join(",");

    // ── professional report header ──────────────────────────────────────────
    const now = new Date();
    const rptDate = now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const rptTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const filterLbl = showOnlyStagnant ? "Stagnant Files Only" : "All Active Files";
    const counselLbl = selectedLawyerName !== "All Staff" ? `Counsel: ${selectedLawyerName}` : "All Counsel";

    const headerLines = [
      `"BUWEMBO & CO. ADVOCATES — CASE MANAGEMENT REPORT"`,
      `"Generated: ${rptDate} at ${rptTime}"`,
      `"Filter: ${filterLbl} | ${counselLbl}"`,
      `""`,
      `"──────────────────────────────────────────────────"`,
      `"FINANCIAL SUMMARY"`,
      `"Total Billed (UGX)",${csvCell(fmtUGX(totBilled))}`,
      `"Total Collected (UGX)",${csvCell(fmtUGX(totPaid))}`,
      `"Outstanding Balance (UGX)",${csvCell(fmtUGX(totBalance))}`,
      `"Collection Rate",${csvCell(collRate)}`,
      `"Total Records",${csvCell(allItems.length)}`,
      `""`,
      `"──────────────────────────────────────────────────"`,
      `"CASE RECORDS"`,
      `""`,
    ].join("\n");

    // ── assemble & trigger download ─────────────────────────────────────────
    const csvContent = [headerLines, colHeaders, ...dataRows, `""`, totalsRow].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = selectedLawyerName.replace(/\s+/g, "_");
    const dateStamp = now.toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `NomosLink_Report_${showOnlyStagnant ? "Stagnant_" : ""}${safeName}_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const pendingFilings = filingRequests.filter(f =>
    f.status === 'Pending' &&
    (!selectedLawyerId || f.assignedToId === selectedLawyerId || f.requestedById === selectedLawyerId)
  ).sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime());

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

  const [showRegistryBanner, setShowRegistryBanner] = useState(() => !localStorage.getItem("dismissed_registry_banner_manager_v1"));

  const dismissBanner = () => {
    localStorage.setItem("dismissed_registry_banner_manager_v1", "true");
    setShowRegistryBanner(false);
  };

  return (
    <div className="p-4 space-y-6 relative">
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

              <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight">
                Registry Filing <br />
                <span className="text-blue-300">Management</span>
              </h1>

              <p className="text-blue-100/80 text-lg leading-relaxed mb-10 font-medium max-w-lg mx-auto">
                Oversee the new document filing workflow. Track pending lawyer requests, assign registry tasks, and monitor ECCMIS submission performance.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => {
                    const el = document.getElementById('registry-filings-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    dismissBanner();
                  }}
                  className="w-full sm:w-auto bg-white text-blue-900 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.3)]"
                >
                  View Pending Filings 🚀
                </button>
                <button
                  onClick={dismissBanner}
                  className="w-full sm:w-auto bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                >
                  Dismiss Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* REGISTRY FILINGS SECTION */}
      {pendingFilings.length > 0 && (
        <div id="registry-filings-section" className="bg-blue-50 border border-blue-100 p-6 rounded-xl shadow-sm scroll-mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight">Pending Registry Filings</h3>
              <p className="text-xs text-blue-600 font-bold">Action required for court document submissions</p>
            </div>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black">{pendingFilings.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pendingFilings.map(f => (
              <div key={f.id} className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{f.documentName}</h4>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-black uppercase animate-pulse">Pending</span>
                </div>
                <p className="text-xs text-blue-700 font-bold mb-1 uppercase tracking-tighter">⚖️ {f.caseFileName}</p>
                {f.description && <p className="text-[11px] text-slate-500 line-clamp-2 italic mb-3">"{f.description}"</p>}

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-100">
                  <div className="text-[10px] text-slate-400 font-black uppercase">
                    From: {f.requestedByName}
                  </div>
                  <button
                    onClick={() => {
                      const ref = prompt("Enter ECCMIS Reference Number:");
                      if (ref !== null) {
                        const note = prompt("Any notes for the lawyer? (Optional)");
                        updateFilingRequest(f.id, {
                          status: 'Completed',
                          eccmisReference: ref,
                          registryNote: note || undefined,
                          dateCompleted: new Date().toISOString()
                        });
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-colors shadow-sm"
                  >
                    Mark as Filed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div
          onClick={() => {/* could filter by feedback overdue if desired */ }}
          className={`p-4 rounded-lg border shadow-sm cursor-pointer transition-all border-l-4 ${feedbackOverdueCount > 0 ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200' : 'bg-white border-l-orange-500 hover:bg-orange-50'}`}
        >
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-orange-600 uppercase">Feedback Overdue (14+ Days)</p>
            {feedbackOverdueCount > 0 && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full animate-bounce">URGENT</span>}
          </div>
          <p className="text-2xl font-black text-orange-700">{feedbackOverdueCount}</p>
        </div>
      </div>

      {/* FINANCIAL SUMMARY STRIP */}
      <div className="bg-gradient-to-r from-[#0B1F3A] to-[#1a3a6b] rounded-xl p-5 mt-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-black text-sm uppercase tracking-widest">💼 Financial Overview</h3>
          <span className="text-[10px] text-blue-300 bg-blue-900/40 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Live Data</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-[10px] text-blue-300 uppercase font-black tracking-widest mb-1">Total Billed</p>
            <p className="text-lg font-black text-white">{formatCurrency(totalBilledAll)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-[10px] text-green-300 uppercase font-black tracking-widest mb-1">Total Collected</p>
            <p className="text-lg font-black text-green-300">{formatCurrency(totalPaidAll)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-[10px] text-orange-300 uppercase font-black tracking-widest mb-1">Outstanding</p>
            <p className="text-lg font-black text-orange-300">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Collection Rate</p>
            <div className="flex items-end gap-1">
              <p className="text-lg font-black text-slate-800">{collectionRate}%</p>
              <div className="flex-1 mb-1">
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${collectionRate}%`, backgroundColor: collectionRate >= 75 ? '#22c55e' : collectionRate >= 50 ? '#f59e0b' : '#ef4444' }}
                  />
                </div>
              </div>
            </div>
            {missingCourtDates > 0 && (
              <p className="text-[9px] text-red-500 font-black mt-1 uppercase">⚠ {missingCourtDates} cases missing court date</p>
            )}
          </div>
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
              const clientName = clients.find(cl => cl.id === c.clientId)?.name || "Unknown Client";
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/lawyer/cases/${c.id}`)}
                  className="flex flex-col justify-between p-4 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer bg-slate-50"
                  title={`Assigned to: ${assignedLawyer}`}
                >
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{c.fileName}</div>
                    <div className="text-xs text-slate-500 mt-1">Client: {clientName}</div>
                    <div className={`text-xs font-bold mt-2 ${countdown.urgent ? "text-red-500" : "text-blue-600"}`}>
                      {countdown.text} • <span className="font-normal text-gray-500">{assignedLawyer}</span>
                    </div>
                  </div>
                  <span className="mt-4 self-start bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
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

      {/* FEEDBACK OVERDUE SECTION */}
      {feedbackOverdueCount > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border mt-6 border-l-8 border-l-orange-500">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold text-slate-700">📞 Client Feedback Required</h3>
            <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Team Action Needed</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedbackOverdueFiles.slice(0, 9).map((file: any) => {
              const assignedLawyer = users.find(u => u.id === file.lawyerId)?.name || "Unassigned";
              const lastFeedback = file.lastClientFeedbackDate
                ? new Date(file.lastClientFeedbackDate).toLocaleDateString('en-GB')
                : "Never";
              return (
                <div
                  key={file.id}
                  onClick={() => navigate(file.fileName ? (file.categories ? `/cases/${file.id}` : `/transactions/${file.id}`) : `/letters/${file.id}`)}
                  className="p-4 border rounded-lg hover:border-orange-500 transition-colors cursor-pointer bg-orange-50/30"
                >
                  <div className="font-bold text-slate-800 text-sm truncate">{file.fileName || file.subject}</div>
                  <div className="text-[10px] font-bold text-orange-700 mt-1 uppercase tracking-tight">
                    Counsel: {assignedLawyer}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium">
                    Last Contact: <span className="font-bold text-orange-600">{lastFeedback}</span>
                  </div>
                </div>
              );
            })}
            {feedbackOverdueFiles.length > 9 && (
              <div
                onClick={() => setShowOnlyStagnant(true)}
                className="p-4 border border-dashed rounded-lg flex items-center justify-center text-gray-400 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                + {feedbackOverdueFiles.length - 9} more files...
              </div>
            )}
          </div>
        </div>
      )}

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
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 italic py-6">No pending court deadlines.</p>
        )}
      </div>

      {/* PENDING REGISTRY FILINGS */}
      {pendingFilings.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2">
              <span>📂</span> Pending Registry Filings
            </h3>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{pendingFilings.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingFilings.map(f => (
              <div key={f.id} className="p-4 border rounded-lg bg-blue-50/50 hover:border-blue-300 transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{f.documentName}</h4>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-black uppercase animate-pulse">Pending</span>
                </div>
                <p className="text-xs text-blue-700 font-bold mb-1 uppercase tracking-tighter">⚖️ {f.caseFileName}</p>
                {f.description && <p className="text-[11px] text-slate-500 line-clamp-2 italic mb-3">"{f.description}"</p>}

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-100">
                  <div className="text-[10px] text-slate-400 font-black uppercase">
                    From: {f.requestedByName}
                  </div>
                  <button
                    onClick={() => {
                      const ref = prompt("Enter ECCMIS Reference Number:");
                      if (ref !== null) {
                        const note = prompt("Any notes for the lawyer? (Optional)");
                        updateFilingRequest(f.id, {
                          status: 'Completed',
                          eccmisReference: ref,
                          registryNote: note || undefined,
                          dateCompleted: new Date().toISOString()
                        });
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-colors shadow-sm"
                  >
                    Mark as Filed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WORKLOAD AT A GLANCE */}
      {workloadByLawyer.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm mt-4">
          <button
            onClick={() => setShowWorkload(w => !w)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">👩‍⚖️</span>
              <div>
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Workload at a Glance</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Per-lawyer case load, billing & stagnancy summary</p>
              </div>
            </div>
            <span className={`text-slate-400 text-xs font-bold transition-transform duration-200 ${showWorkload ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showWorkload && (
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-5 py-3 text-left">Counsel</th>
                    <th className="px-4 py-3 text-center">Cases</th>
                    <th className="px-4 py-3 text-center">Transactions</th>
                    <th className="px-4 py-3 text-center">Letters</th>
                    <th className="px-4 py-3 text-center">Total Files</th>
                    <th className="px-4 py-3 text-right">Billed</th>
                    <th className="px-4 py-3 text-right">Collected</th>
                    <th className="px-4 py-3 text-right text-orange-600">Outstanding</th>
                    <th className="px-4 py-3 text-center text-red-600">Stagnant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workloadByLawyer.map(w => (
                    <tr
                      key={w.lawyer.id}
                      onClick={() => setSelectedLawyerId(w.lawyer.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0B1F3A] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                            {w.lawyer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{w.lawyer.name}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">{w.lawyer.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-100 text-blue-700 text-xs font-black px-2 py-0.5 rounded-full">{w.cases}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-green-100 text-green-700 text-xs font-black px-2 py-0.5 rounded-full">{w.transactions}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-full">{w.letters}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-slate-700 text-sm">{w.total}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-700">{formatCurrency(w.billed)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600">{formatCurrency(w.paid)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-orange-600">{formatCurrency(w.billed - w.paid)}</td>
                      <td className="px-4 py-3 text-center">
                        {w.stagnant > 0
                          ? <span className="bg-red-100 text-red-600 text-xs font-black px-2 py-0.5 rounded-full animate-pulse">{w.stagnant}</span>
                          : <span className="text-emerald-500 font-black text-xs">✓</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr className="text-xs font-black text-slate-600">
                    <td className="px-5 py-3 uppercase tracking-wider">Firm Total</td>
                    <td className="px-4 py-3 text-center">{workloadByLawyer.reduce((s, w) => s + w.cases, 0)}</td>
                    <td className="px-4 py-3 text-center">{workloadByLawyer.reduce((s, w) => s + w.transactions, 0)}</td>
                    <td className="px-4 py-3 text-center">{workloadByLawyer.reduce((s, w) => s + w.letters, 0)}</td>
                    <td className="px-4 py-3 text-center">{workloadByLawyer.reduce((s, w) => s + w.total, 0)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(workloadByLawyer.reduce((s, w) => s + w.billed, 0))}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(workloadByLawyer.reduce((s, w) => s + w.paid, 0))}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(workloadByLawyer.reduce((s, w) => s + w.billed - w.paid, 0))}</td>
                    <td className="px-4 py-3 text-center text-red-600">{workloadByLawyer.reduce((s, w) => s + w.stagnant, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STAFF FILTER PILLS */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          key="all-lawyers"
          onClick={() => selectLawyer(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-all ${!selectedLawyerId
            ? "bg-blue-600 text-white border-blue-600 shadow-md"
            : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
            }`}
        >
          All Staff
        </button>
        {legalStaff.map(staff => (
          <button
            key={staff.id}
            onClick={() => selectLawyer(staff.id)}
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
                  <div key={tx.id} onClick={() => navigate(`/lawyer/transactions/${tx.id}`, { state: { from: location.pathname + location.search } })} className="p-3 border rounded-md hover:border-blue-500 cursor-pointer bg-slate-50 relative">
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
                  <div key={c.id} onClick={() => navigate(`/lawyer/cases/${c.id}`, { state: { from: location.pathname + location.search } })} className="p-3 border rounded-md hover:border-red-500 cursor-pointer bg-slate-50 relative">
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
                  <div key={l.id} onClick={() => navigate(`/lawyer/letters/${l.id}`, { state: { from: location.pathname + location.search } })} className="p-3 border rounded-md hover:border-amber-500 cursor-pointer bg-slate-50 relative">
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