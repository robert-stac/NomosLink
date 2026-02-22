import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

export default function ManagerDashboard() {
  const { users, transactions, courtCases, letters, currentUser } = useAppContext();
  const navigate = useNavigate();
  
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyStagnant, setShowOnlyStagnant] = useState(false);

  // Helper to check if a file is stagnant (No updates in 30 days)
  const isStagnant = (item: any) => {
    if (!item.progressNotes || item.progressNotes.length === 0) return true;
    const lastNoteDate = new Date(item.progressNotes[item.progressNotes.length - 1].date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastNoteDate < thirtyDaysAgo;
  };

  // 1. Filter staff
  const legalStaff = users.filter(u => u.role === "lawyer" || u.role === "manager");

  // 2. Comprehensive Filter Logic (Lawyer + Search + Stagnancy Toggle)
  const filterItem = (item: any) => {
    const matchesLawyer = !selectedLawyerId || item.lawyerId === selectedLawyerId;
    const matchesSearch = (item.fileName || item.subject || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStagnant = !showOnlyStagnant || isStagnant(item);
    return matchesLawyer && matchesSearch && matchesStagnant;
  };

  const filteredTransactions = transactions.filter(filterItem);
  const filteredCases = courtCases.filter(filterItem);
  const filteredLetters = letters.filter(filterItem);

  // 3. Summary Statistics (Calculated from lawyer/search filter, ignoring the stagnant toggle)
  const baseFilter = (item: any) => {
    const matchesLawyer = !selectedLawyerId || item.lawyerId === selectedLawyerId;
    const matchesSearch = (item.fileName || item.subject || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLawyer && matchesSearch;
  };

  const stagnantCount = 
    transactions.filter(baseFilter).filter(isStagnant).length + 
    courtCases.filter(baseFilter).filter(isStagnant).length + 
    letters.filter(baseFilter).filter(isStagnant).length;

  const totalFiles = transactions.filter(baseFilter).length + courtCases.filter(baseFilter).length + letters.filter(baseFilter).length;

  const selectedLawyerName = users.find(u => u.id === selectedLawyerId)?.name || "All Staff";

  // 4. Updated Global Export Logic
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
                  onClick={() => {
                    setSelectedLawyerId(null);
                    setShowOnlyStagnant(false);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SUMMARY STATS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => setShowOnlyStagnant(false)}
          className={`p-4 rounded-lg border shadow-sm cursor-pointer transition-all ${!showOnlyStagnant ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
        >
          <p className="text-xs font-bold text-gray-400 uppercase">Total Files</p>
          <p className="text-2xl font-black text-slate-800">{totalFiles}</p>
        </div>
        
        <div 
          onClick={() => setShowOnlyStagnant(!showOnlyStagnant)}
          className={`p-4 rounded-lg border shadow-sm cursor-pointer transition-all border-l-4 ${
            showOnlyStagnant 
            ? 'bg-red-50 border-red-500 ring-2 ring-red-200' 
            : 'bg-white border-l-red-500 hover:bg-red-50'
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
          <p className="text-2xl font-black text-blue-800">
            {showOnlyStagnant ? "At Risk" : "Standard"}
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {legalStaff.map(staff => (
          <button 
            key={staff.id}
            onClick={() => setSelectedLawyerId(staff.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
              selectedLawyerId === staff.id 
              ? "bg-blue-600 text-white border-blue-600 shadow-md" 
              : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
            }`}
          >
            {staff.name} {staff.id === currentUser?.id ? "(You)" : ""}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. TRANSACTIONS */}
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
          </div>
        </div>

        {/* 2. COURT CASES */}
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
          </div>
        </div>

        {/* 3. LETTERS */}
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
          </div>
        </div>
      </div>
    </div>
  );
}