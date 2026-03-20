import { useState } from "react";
import { useAppContext } from "../context/AppContext";

export default function Archive() {
  const {
    courtCases, editCourtCase, deleteCourtCase,
    tasks, updateTask, deleteTask,
    transactions, editTransaction, deleteTransaction,
    landTitles, updateLandTitle,
    lawyers
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState("");

  // 1. Filtering Logic
  const archivedCases = courtCases.filter((c) => c.archived);
  const archivedTransactions = transactions?.filter((tr) => tr.archived && tr.type !== "Court Case") || [];
  const archivedTasks = tasks.filter((t) => t.status === "Completed");
  const archivedLandTitles = landTitles.filter(t => t.status === 'Released' || t.status === 'Archived');

  // 2. Search Logic
  const filteredCases = archivedCases.filter(c =>
    c.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = archivedTransactions.filter(tr =>
    tr.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tr.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = archivedTasks.filter(t =>
    t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArchivedLandTitles = archivedLandTitles.filter(t =>
    t.title_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (num: number | string | null | undefined) => {
    const n = Number(num);
    return !isNaN(n) ? "UGX " + n.toLocaleString() : "UGX 0";
  };

  const getLawyerName = (id: string | undefined) => id ? (lawyers.find(l => l.id === id)?.name || "Unassigned") : "Unassigned";

  return (
    <div className="bg-gray-50 min-h-screen p-8 space-y-12" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Firm Archives</h2>
          <p className="text-slate-500 text-sm font-medium">Manage closed cases, completed tasks, and historical transactions.</p>
        </div>

        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search all archives..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
        </div>
      </div>

      {/* SECTION 1: COURT CASES */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Archived Court Cases</h3>
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">{filteredCases.length}</span>
        </div>
        {filteredCases.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 italic font-medium">No archived cases found.</div>
        ) : (
          <div className="bg-white shadow-sm border border-slate-100 rounded-[30px] overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#0B1F3A] text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="p-5 text-left">File Name</th>
                  <th className="p-5 text-left">Status</th>
                  <th className="p-5 text-left">Lawyer</th>
                  <th className="p-5 text-right">Balance</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition text-sm">
                    <td className="p-5 font-semibold text-slate-800">{c.fileName}</td>
                    <td className="p-5"><span className="bg-green-100 px-2 py-1 rounded text-xs font-semibold text-green-700 uppercase">{c.status}</span></td>
                    <td className="p-5 text-slate-600 font-medium">{getLawyerName(c.lawyerId)}</td>
                    <td className="p-5 text-right font-medium text-red-500">{formatCurrency(c.balance)}</td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => editCourtCase(c.id, { archived: false, status: 'Ongoing' })} className="text-blue-600 font-semibold uppercase text-xs hover:underline">Restore</button>
                        <button onClick={() => { if (confirm("Delete permanently?")) deleteCourtCase(c.id); }} className="text-red-400 font-semibold uppercase text-xs hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 3: COMPLETED TASKS */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Completed Clerk Tasks</h3>
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">{filteredTasks.length}</span>
        </div>
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 italic font-medium">No completed tasks found.</div>
        ) : (
          <div className="bg-white shadow-sm border border-slate-100 rounded-[30px] overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-700 text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="p-5 text-left">Task Title</th>
                  <th className="p-5 text-left">Assigned To</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition text-sm">
                    <td className="p-5 font-semibold text-slate-800">{t.title}</td>
                    <td className="p-5 text-slate-600 font-medium">{t.assignedToName}</td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => updateTask(t.id, { status: 'Pending' })} className="text-blue-600 font-semibold uppercase text-xs hover:underline">Restore</button>
                        <button onClick={() => { if (confirm("Delete permanently?")) deleteTask(t.id); }} className="text-red-400 font-semibold uppercase text-xs hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 2: ARCHIVED TRANSACTIONS */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Archived Transactions</h3>
          <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs font-semibold">{filteredTransactions.length}</span>
        </div>
        {filteredTransactions.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 italic font-medium">No archived transactions found.</div>
        ) : (
          <div className="bg-white shadow-sm border border-purple-100 rounded-[30px] overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-purple-900 text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="p-5 text-left">File / Client</th>
                  <th className="p-5 text-left">Matter Type</th>
                  <th className="p-5 text-left">Lawyer</th>
                  <th className="p-5 text-right">Billed Amount</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {filteredTransactions.map((tr) => (
                  <tr key={tr.id} className="hover:bg-purple-50/50 transition text-sm">
                    <td className="p-5 font-semibold text-slate-800">{tr.fileName}</td>
                    <td className="p-5 text-blue-600 font-semibold text-xs uppercase">{tr.type}</td>
                    <td className="p-5 text-slate-600 font-medium">{getLawyerName(tr.lawyerId)}</td>
                    <td className="p-5 text-right font-semibold text-slate-700">{formatCurrency(tr.billedAmount)}</td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => editTransaction(tr.id, { archived: false })} className="text-purple-600 font-semibold uppercase text-xs hover:underline">Restore</button>
                        <button onClick={() => { if (confirm("Delete permanently?")) deleteTransaction(tr.id); }} className="text-red-400 font-semibold uppercase text-xs hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 4: ARCHIVED LAND TITLES */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-green-500 uppercase tracking-wider">Archived Land Titles</h3>
          <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-semibold">{filteredArchivedLandTitles.length}</span>
        </div>
        {filteredArchivedLandTitles.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 italic font-medium">No archived land titles found.</div>
        ) : (
          <div className="bg-white shadow-sm border border-slate-100 rounded-[30px] overflow-hidden text-sm">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-green-900 text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="p-5 text-left">Plot / Block</th>
                  <th className="p-5 text-left">Owner</th>
                  <th className="p-5 text-left">Status</th>
                  <th className="p-5 text-left">Date</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredArchivedLandTitles.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="p-5 font-semibold text-slate-800">Plot {t.title_number}{t.block && `, Block ${t.block}`}</td>
                    <td className="p-5 text-slate-600 font-medium">{t.owner_name}</td>
                    <td className="p-5"><span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${t.status === 'Released' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{t.status}</span></td>
                    <td className="p-5 text-slate-600 font-medium">{t.date_released ? new Date(t.date_released).toLocaleDateString() : (t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "---")}</td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => updateLandTitle(t.id, { status: 'In Custody', date_released: undefined })} className="text-blue-600 font-semibold uppercase text-xs hover:underline">Restore</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}