import { useState } from "react";
import { useAppContext } from "../context/AppContext";

export default function Archive() {
  const { 
    courtCases, editCourtCase, deleteCourtCase, 
    tasks, deleteTask, updateTask,
    transactions, editTransaction, deleteTransaction,
    lawyers // Added lawyers to resolve names
  } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Filtering Logic
  const archivedCases = courtCases.filter((c) => c.archived);
  const archivedTasks = tasks.filter((t) => t.archived || t.status === "Completed");
  const archivedTransactions = transactions?.filter((tr) => tr.archived && tr.type !== "Court Case") || [];

  // 2. Search Logic
  const filteredCases = archivedCases.filter(c => 
    c.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = archivedTasks.filter(t => 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = archivedTransactions.filter(tr => 
    tr.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tr.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (num: number | string | null | undefined) => {
    const n = Number(num);
    return !isNaN(n) ? "UGX " + n.toLocaleString() : "UGX 0";
  };

  const getLawyerName = (id: string) => lawyers.find(l => l.id === id)?.name || "Unassigned";

  return (
    <div className="bg-gray-50 min-h-screen p-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Firm Archives</h2>
        
        <div className="relative w-full md:w-96">
          <input 
            type="text"
            placeholder="Search all archives..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 font-medium text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
        </div>
      </div>

      {/* SECTION 1: COURT CASES */}
      <div>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Archived Court Cases</h3>
        {filteredCases.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 italic font-medium">No archived cases found.</div>
        ) : (
          <div className="bg-white shadow-sm border border-slate-100 rounded-[30px] overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#0B1F3A] text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5 text-left">File Name</th>
                  <th className="p-5 text-left">Status</th>
                  <th className="p-5 text-left">Lawyer</th>
                  <th className="p-5 text-left text-right">Balance</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition text-sm">
                    <td className="p-5 font-bold text-slate-800">{c.fileName}</td>
                    <td className="p-5"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-500 uppercase">{c.status}</span></td>
                    <td className="p-5 text-slate-600 font-medium">{getLawyerName(c.lawyerId)}</td>
                    <td className="p-5 text-right font-medium text-red-500">{formatCurrency(c.balance)}</td>
                    <td className="p-5 text-center space-x-4">
                      <button onClick={() => editCourtCase(c.id, { archived: false })} className="text-blue-600 font-black uppercase text-[10px] hover:underline">Unarchive</button>
                      <button onClick={() => { if(confirm("Delete permanently?")) deleteCourtCase(c.id); }} className="text-red-400 font-black uppercase text-[10px] hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: ARCHIVED TRANSACTIONS (FIXED) */}
      <div>
        <h3 className="text-sm font-black text-purple-400 uppercase tracking-[0.2em] mb-4">Archived Financial Transactions</h3>
        {filteredTransactions.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 italic font-medium">No archived transactions found.</div>
        ) : (
          <div className="bg-white shadow-sm border border-purple-100 rounded-[30px] overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-purple-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5 text-left">File / Client</th>
                  <th className="p-5 text-left">Matter Type</th>
                  <th className="p-5 text-left">Lawyer</th>
                  <th className="p-5 text-left text-right">Billed Amount</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tr) => (
                  <tr key={tr.id} className="border-b last:border-0 hover:bg-purple-50 transition text-sm">
                    <td className="p-5 font-bold text-slate-800">{tr.fileName}</td>
                    <td className="p-5 text-blue-600 font-bold text-[10px] uppercase">{tr.type}</td>
                    <td className="p-5 text-slate-600 font-medium">{getLawyerName(tr.lawyerId)}</td>
                    <td className="p-5 text-right font-black text-slate-700">{formatCurrency(tr.billedAmount)}</td>
                    <td className="p-5 text-center space-x-4">
                      <button onClick={() => editTransaction(tr.id, { archived: false })} className="text-purple-600 font-black uppercase text-[10px] hover:underline">Restore</button>
                      <button onClick={() => { if(confirm("Delete permanently?")) deleteTransaction(tr.id); }} className="text-red-400 font-black uppercase text-[10px] hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: COMPLETED TASKS */}
      <div>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Completed Clerk Tasks</h3>
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 italic font-medium">No completed tasks found.</div>
        ) : (
          <div className="bg-white shadow-sm border border-slate-100 rounded-[30px] overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5 text-left">Task Title</th>
                  <th className="p-5 text-left">Assigned To</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50 transition text-sm">
                    <td className="p-5 font-bold text-slate-800">{t.title}</td>
                    <td className="p-5 text-slate-600 font-medium">{t.assignedToName}</td>
                    <td className="p-5 text-center space-x-4">
                      <button onClick={() => updateTask(t.id, { archived: false, status: 'Pending' })} className="text-blue-600 font-black uppercase text-[10px] hover:underline">Restore</button>
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