import { useState } from "react";
import { useAppContext } from "../context/AppContext";

export default function Archive() {
  const { transactions, editTransaction, deleteTransaction, tasks, deleteTask, updateTask } = useAppContext();
  
  // NEW: Search State
  const [searchQuery, setSearchQuery] = useState("");

  const archivedCases = transactions.filter((c) => c.archived);
  const archivedTasks = tasks.filter((t) => t.archived || t.status === "Completed");

  // NEW: Search Filtering Logic
  const filteredCases = archivedCases.filter(c => 
    c.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = archivedTasks.filter(t => 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.assignedToName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.clerkNote?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (num: number | null | undefined) => num != null ? "UGX " + num.toLocaleString() : "UGX 0";

  const handleUnarchive = (id: string) => {
    if (confirm("Are you sure you want to unarchive this court case?")) {
      const caseToUnarchive = archivedCases.find(c => c.id === id);
      if (caseToUnarchive) {
        editTransaction(id, { 
          ...caseToUnarchive, 
          archived: false, 
          status: "Ongoing", 
          completedDate: null 
        });
      }
    }
  };

  const handleUnarchiveTask = (id: string) => {
    if (confirm("Restore this task to active status?")) {
      updateTask(id, { archived: false, status: "Pending" });
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Firm Archives</h2>
        
        {/* NEW: Search Input */}
        <div className="relative w-full md:w-96">
          <input 
            type="text"
            placeholder="Search files, clerks, or notes..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 font-medium text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
        </div>
      </div>

      {searchQuery && (
        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
          Showing results for: "{searchQuery}" ({filteredCases.length + filteredTasks.length} found)
        </p>
      )}

      {/* SECTION 1: COURT CASES */}
      <div>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Archived Court Cases</h3>

        {filteredCases.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-medium italic">
            {searchQuery ? "No cases match your search." : "No archived court cases found."}
          </div>
        ) : (
          <div className="bg-white shadow-sm border border-slate-100 rounded-[30px] overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#0B1F3A] text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5 text-left">File Name</th>
                  <th className="p-5 text-left">Status</th>
                  <th className="p-5 text-left">Bill</th>
                  <th className="p-5 text-left">Paid</th>
                  <th className="p-5 text-left">Balance</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition text-sm">
                    <td className="p-5 font-bold text-slate-800">{c.fileName}</td>
                    <td className="p-5">
                       <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-500 uppercase">{c.status}</span>
                    </td>
                    <td className="p-5 font-medium">{formatCurrency(c.billed)}</td>
                    <td className="p-5 font-medium text-emerald-600">{formatCurrency(c.paid)}</td>
                    <td className="p-5 font-medium text-red-500">{formatCurrency(c.balance)}</td>
                    <td className="p-5 text-center space-x-2">
                      <button onClick={() => handleUnarchive(c.id)} className="text-blue-600 font-black uppercase text-[10px] hover:underline">Unarchive</button>
                      <button onClick={() => { if(confirm("Delete permanently?")) deleteTransaction(c.id); }} className="text-red-400 font-black uppercase text-[10px] hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: ARCHIVED CLERK TASKS */}
      <div>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Completed Clerk Tasks</h3>

        {filteredTasks.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-medium italic">
             {searchQuery ? "No tasks match your search." : "No completed tasks found."}
          </div>
        ) : (
          <div className="bg-white shadow-sm border border-slate-100 rounded-[30px] overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5 text-left">Task Title</th>
                  <th className="p-5 text-left">Assigned To</th>
                  <th className="p-5 text-left">Clerk Note</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50 transition text-sm">
                    <td className="p-5 font-bold text-slate-800">{t.title}</td>
                    <td className="p-5 font-medium text-slate-600">{t.assignedToName}</td>
                    <td className="p-5 italic text-slate-400 max-w-xs truncate">"{t.clerkNote || "No report provided"}"</td>
                    <td className="p-5 text-center space-x-2">
                      <button onClick={() => handleUnarchiveTask(t.id)} className="text-blue-600 font-black uppercase text-[10px] hover:underline">Restore</button>
                      <button onClick={() => { if(confirm("Delete permanently?")) deleteTask(t.id); }} className="text-red-400 font-black uppercase text-[10px] hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}