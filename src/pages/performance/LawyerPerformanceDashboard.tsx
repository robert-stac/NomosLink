import { useState, useMemo, useEffect } from "react"; // Added useEffect
import { useLocation } from "react-router-dom"; // Added useLocation
import { useAppContext } from "../../context/AppContext";

export default function LawyerPerformanceDashboard() {
  const { 
    users, transactions, courtCases, letters, 
    addTransactionProgress, addCourtCaseProgress, addLetterProgress 
  } = useAppContext();

  const location = useLocation(); // Hook to read URL parameters

  const lawyers = users.filter((u) => u.role === "lawyer" || u.role === "clerk");
  const [selectedLawyerId, setSelectedLawyerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [newNote, setNewNote] = useState("");

  // --- AUTO-TRIGGER LOGIC FOR CRM NAVIGATION ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fileToFind = params.get("file");
    const triggerOpen = params.get("openDetails");

    if (fileToFind && triggerOpen) {
      // Search across all data sources for the file
      const foundCase = courtCases.find(c => c.fileName === fileToFind);
      const foundTrans = transactions.find(t => t.fileName === fileToFind);
      const foundLetter = letters.find(l => (l.subject || l.title || l.fileName) === fileToFind);

      const targetFile = foundCase || foundTrans || foundLetter;

      if (targetFile) {
        // Set the lawyer ID so the dashboard stats load
        const lawyerId = targetFile.lawyerId || targetFile.lawyer?.id;
        if (lawyerId) setSelectedLawyerId(lawyerId.toString());

        // Set the category so the modal knows which update function to use
        const category = foundCase ? "Court Case" : foundTrans ? "Transaction" : "Letter";
        
        // Open the modal automatically
        setActiveFile({ ...targetFile, category, title: fileToFind });
      }
    }
  }, [location, courtCases, transactions, letters]);

  const stats = useMemo(() => {
    if (!selectedLawyerId) return null;
    const now = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const sid = selectedLawyerId.toString();

    const myCases = courtCases.filter(c => c.lawyerId?.toString() === sid);
    const myTransactions = transactions.filter(t => t.lawyerId?.toString() === sid);
    
    const myLetters = letters.filter(l => {
        return (
          l.lawyer?.id?.toString() === sid || 
          l.lawyerId?.toString() === sid || 
          l.userId?.toString() === sid
        );
    });

    const allFiles = [
      ...myCases.map(i => ({ ...i, category: "Court Case", title: i.fileName })),
      ...myTransactions.map(i => ({ ...i, category: "Transaction", title: i.fileName })),
      ...myLetters.map(i => ({ 
        ...i, 
        category: "Letter", 
        title: i.subject || i.title || i.fileName || "Untitled Letter" 
      }))
    ];

    // --- UPDATED FINANCIAL LOGIC ---
    const financials = { billed: 0, collected: 0 };

    // 1. Sum Transactions (Supporting both 'billedAmount' and 'billed' keys)
    myTransactions.forEach(t => {
      financials.billed += Number(t.billedAmount || t.billed || 0);
      financials.collected += Number(t.paidAmount || t.paid || 0);
    });

    // 2. Sum Letters (Supporting both 'billed' and 'billedAmount' keys)
    myLetters.forEach(l => {
      financials.billed += Number(l.billed || l.billedAmount || 0);
      financials.collected += Number(l.paid || l.paidAmount || 0);
    });

    const stagnant = allFiles.filter(file => {
      if (file.status === "Completed") return false;
      const notes = file.progressNotes || [];
      let lastDate = notes.length === 0 
        ? new Date(file.date || file.createdAt || now) 
        : new Date([...notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date);
      
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      file.daysStagnant = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return !isNaN(lastDate.getTime()) && lastDate < tenDaysAgo;
    });

    return {
      financials,
      cases: myCases,
      transactions: myTransactions,
      letters: myLetters,
      stagnant: stagnant.sort((a, b) => b.daysStagnant - a.daysStagnant),
      totalFiles: allFiles.length,
      realizationRate: financials.billed ? Math.round((financials.collected / financials.billed) * 100) : 0
    };
  }, [selectedLawyerId, courtCases, transactions, letters]);

  const filteredData = useMemo(() => {
    if (!stats) return null;
    const s = searchTerm.toLowerCase();
    return {
      cases: stats.cases.filter(c => c.fileName?.toLowerCase().includes(s)),
      transactions: stats.transactions.filter(t => t.fileName?.toLowerCase().includes(s)),
      letters: stats.letters.filter(l => (l.subject || l.title || l.fileName || "").toLowerCase().includes(s))
    };
  }, [stats, searchTerm]);

  const handlePostNote = () => {
    if (!newNote.trim() || !activeFile) return;
    if (activeFile.category === "Court Case") addCourtCaseProgress(activeFile.id, newNote);
    else if (activeFile.category === "Transaction") addTransactionProgress(activeFile.id, newNote);
    else if (activeFile.category === "Letter") addLetterProgress(activeFile.id, newNote);
    setNewNote("");
    setActiveFile(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Partner Review</h1>
            <p className="text-slate-500 text-sm">Monitoring & Enforcement</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <input 
                type="text" placeholder="Search files..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 rounded-2xl border border-slate-200 w-full md:w-64 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all focus:border-blue-400"
              />
              <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            </div>
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <span className="px-4 text-[10px] font-bold text-slate-400 uppercase">Staff:</span>
              <select
                value={selectedLawyerId}
                onChange={(e) => setSelectedLawyerId(e.target.value)}
                className="bg-transparent font-bold p-2 min-w-[180px] outline-none text-sm cursor-pointer"
              >
                <option value="">Select Staff...</option>
                {lawyers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {!stats ? (
          <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <div className="text-4xl mb-4">👤</div>
            <p className="text-slate-400 font-medium">Select a staff member to begin the review process.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <KPI label="Collections" value={`UGX ${stats.financials.collected.toLocaleString()}`} sub="Total Revenue" color="bg-slate-900 text-white" />
              <KPI label="Assignments" value={stats.totalFiles} sub="Files Handled" color="bg-white text-slate-900 border" />
              <KPI label="Realization" value={`${stats.realizationRate}%`} sub="Billed vs Paid" color={stats.realizationRate > 80 ? "bg-emerald-600 text-white" : "bg-orange-500 text-white"} />
              <KPI label="Stagnant" value={stats.stagnant.length} sub="Needs Attention" color={stats.stagnant.length > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600"} />
            </div>

            {/* STAGNANT ALERTS */}
            {stats.stagnant.length > 0 && (
              <div className="bg-red-50 rounded-[32px] border border-red-200 overflow-hidden shadow-sm">
                <div className="p-6 bg-red-100/50 flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  <h3 className="font-black text-red-800 uppercase tracking-tight">Critical: Files Inactive for 10+ Days</h3>
                </div>
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-red-200">
                    {stats.stagnant.map((file, idx) => (
                      <tr key={idx} className="hover:bg-red-100/30 transition-colors">
                        <td className="p-4 pl-8 font-bold text-red-900">{file.title}</td>
                        <td className="p-4"><span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">{file.daysStagnant} DAYS STAGNANT</span></td>
                        <td className="p-4 text-right pr-8">
                          <button onClick={() => setActiveFile(file)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all">Add Urgent Note</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <FileTable title="Court Cases" items={filteredData?.cases || []} onRowClick={(item) => setActiveFile({ ...item, category: "Court Case", title: item.fileName })} />
            <FileTable title="Transactions" items={filteredData?.transactions || []} onRowClick={(item) => setActiveFile({ ...item, category: "Transaction", title: item.fileName })} />
            <FileTable title="Letters" items={filteredData?.letters || []} onRowClick={(item) => setActiveFile({ ...item, category: "Letter", title: item.subject || item.title || item.fileName })} />
          </div>
        )}
      </div>

      {/* MODAL */}
      {activeFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50 rounded-t-[32px]">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 px-2 py-1 bg-blue-50 rounded mb-1 inline-block">{activeFile.category}</span>
                <h3 className="font-black text-2xl text-slate-800">{activeFile.title}</h3>
              </div>
              <button onClick={() => setActiveFile(null)} className="text-3xl text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-4">
              {activeFile.progressNotes?.length > 0 ? (
                activeFile.progressNotes.map((n: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-bold text-blue-700">{n.authorName}</span>
                      <span className="text-[10px] text-slate-400">{n.date}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{n.message}</p>
                  </div>
                ))
              ) : <p className="text-slate-400 italic text-sm text-center py-10">No progress history found for this file.</p>}
            </div>
            <div className="p-8 border-t bg-slate-50 rounded-b-[32px]">
              <div className="flex gap-3">
                <input 
                  placeholder="Post instruction to staff..." 
                  className="flex-1 bg-white border p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newNote} onChange={(e) => setNewNote(e.target.value)}
                />
                <button onClick={handlePostNote} className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold transition-all">Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---
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
          <tr><th className="p-6 pl-8">Matter</th><th className="p-6">Status</th><th className="p-6 text-center">Notes</th><th className="p-6 text-right pr-8">Action</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 group transition-colors">
              <td className="p-6 pl-8 font-bold text-slate-700">{item.subject || item.title || item.fileName || "Untitled"}</td>
              <td className="p-6">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                  {item.status || 'Active'}
                </span>
              </td>
              <td className="p-6 text-center">
                <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg text-xs">{item.progressNotes?.length || 0}</span>
              </td>
              <td className="p-6 text-right pr-8">
                <button onClick={() => onRowClick(item)} className="text-blue-600 hover:text-blue-800 font-bold text-xs">Review Details</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">No matches found.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);