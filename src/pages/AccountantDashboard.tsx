import { useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import { useAppContext } from "../context/AppContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AccountantDashboard() {
  const { transactions, courtCases, letters, expenses, invoices, users, clients } = useAppContext();

  const [timeFilter, setTimeFilter] = useState("All Time");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<any>(null);
  const [viewScanUrl, setViewScanUrl] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientLookupQuery, setClientLookupQuery] = useState("");
  const [selectedCaseForProgress, setSelectedCaseForProgress] = useState<any>(null);

  const formatUGX = (val: number) => "UGX " + val.toLocaleString();

  const getHandlerName = (item: any) => {
    const lawyer = users.find(u => String(u.id) === String(item.lawyerId));
    return lawyer ? lawyer.name : "Unassigned";
  };

  const clientLookupResults = useMemo(() => {
    const q = clientLookupQuery.trim().toLowerCase();
    if (!q) return [];
    const matches = clients.filter(c => c.name.toLowerCase().includes(q));
    const allFiles = [
      ...transactions,
      ...courtCases,
      ...letters,
    ];

    const fileMatches = allFiles.filter(item => {
      const name = String(("fileName" in item ? item.fileName : "") || ("subject" in item ? item.subject : "") || "").toLowerCase();
      return name.includes(q);
    });

    if (matches.length > 0) {
      const files = matches.flatMap(client => {
        return allFiles
          .filter(item => item.clientId === client.id)
          .map(item => ({ item, client }));
      });
      return matches.map(client => ({ client, files: files.filter(f => f.client.id === client.id) }));
    }

    if (fileMatches.length > 0) {
      return [{
        client: null,
        files: fileMatches.map(item => ({ item, client: null }))
      }];
    }

    return [];
  }, [clientLookupQuery, clients, transactions, courtCases, letters]);

  const isClientNew = clientLookupQuery.trim() !== "" && clientLookupResults.length === 0;

  // ── UPCOMING COURT DATES (next 14 days) ──────────────────────────────────
  const upcomingHearings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksOut = new Date(today);
    twoWeeksOut.setDate(today.getDate() + 14);

    return (courtCases || [])
      .filter(c => {
        if (!c.nextCourtDate || c.archived) return false;
        const d = new Date(c.nextCourtDate);
        return d >= today && d <= twoWeeksOut;
      })
      .sort((a, b) => new Date(a.nextCourtDate!).getTime() - new Date(b.nextCourtDate!).getTime());
  }, [courtCases]);

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const urgencyStyle = (days: number) => {
    if (days === 0) return { bg: "#fee2e2", text: "#b91c1c", label: "TODAY" };
    if (days === 1) return { bg: "#fff7ed", text: "#c2410c", label: "TOMORROW" };
    if (days <= 3) return { bg: "#fef3c7", text: "#b45309", label: days + "d" };
    return { bg: "#f0fdf4", text: "#166534", label: days + "d" };
  };
  // ─────────────────────────────────────────────────────────────────────────

  const financeTotals = useMemo(() => {
    let allRevenueItems = [
      ...(transactions || []),
      ...(courtCases || []),
      ...(letters || [])
    ];
    let allExpenses = expenses || [];

    if (timeFilter !== "All Time") {
      const now = new Date();
      allRevenueItems = allRevenueItems.filter(item => {
        const itemDateStr = (("date" in item ? (item as any).date : "") || ("dateAdded" in item ? (item as any).dateAdded : "") || ("dateCreated" in item ? (item as any).dateCreated : "")) as string;
        if (!itemDateStr) return true;
        const itemDate = new Date(itemDateStr);
        if (timeFilter === "This Month") return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        if (timeFilter === "This Year") return itemDate.getFullYear() === now.getFullYear();
        return true;
      });
      allExpenses = allExpenses.filter(exp => {
        if (!exp.date) return true;
        const expDate = new Date(exp.date);
        if (timeFilter === "This Month") return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
        if (timeFilter === "This Year") return expDate.getFullYear() === now.getFullYear();
        return true;
      });
    }

    const revenue = allRevenueItems.reduce((acc, item) => {
      const billed = Number(("billed" in item ? item.billed : 0) || ("billedAmount" in item ? item.billedAmount : 0) || 0);
      const paid = Number(("paid" in item ? item.paid : 0) || ("paidAmount" in item ? item.paidAmount : 0) || 0);
      acc.totalBilled += billed;
      acc.totalPaid += paid;
      if (billed > paid) acc.outstanding += (billed - paid);
      return acc;
    }, { totalBilled: 0, totalPaid: 0, outstanding: 0 });

    const totalActualExpenses = allExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    return { ...revenue, totalExpenses: totalActualExpenses, allExpensesList: allExpenses };
  }, [transactions, courtCases, letters, expenses, timeFilter]);

  const netProfit = financeTotals.totalPaid - financeTotals.totalExpenses;
  const collectionRate = financeTotals.totalBilled > 0 ? ((financeTotals.totalPaid / financeTotals.totalBilled) * 100).toFixed(1) : 0;

  // --- AGING ANALYSIS ---
  const agingData = useMemo(() => {
    const today = new Date();
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const amounts = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    const allRevenueItems = [
      ...(transactions || []),
      ...(courtCases || []),
      ...(letters || [])
    ];

    allRevenueItems.forEach(item => {
      // Don't filter by timeFilter for aging since aging is about ALL outstanding debt
      const billed = Number(("billed" in item ? item.billed : 0) || ("billedAmount" in item ? item.billedAmount : 0) || 0);
      const paid = Number(("paid" in item ? item.paid : 0) || ("paidAmount" in item ? item.paidAmount : 0) || 0);
      const balance = billed - paid;
      
      if (balance <= 0) return;
      
      const dStr = ("date" in item ? (item as any).date : "") || ("createdAt" in item ? (item as any).createdAt : "") || ("dateCreated" in item ? (item as any).dateCreated : "");
      const d = new Date(dStr || new Date());
      const days = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      
      if (days <= 30)      { buckets['0-30']++;  amounts['0-30']  += balance; }
      else if (days <= 60) { buckets['31-60']++; amounts['31-60'] += balance; }
      else if (days <= 90) { buckets['61-90']++; amounts['61-90'] += balance; }
      else                 { buckets['90+']++;   amounts['90+']   += balance; }
    });

    return { buckets, amounts };
  }, [transactions, courtCases, letters]);

  const sourceData = {
    labels: ["Transactions", "Court Cases", "Letters"],
    datasets: [{
      data: [transactions?.length || 0, courtCases?.length || 0, letters?.length || 0],
      backgroundColor: ["#3b82f6", "#f59e0b", "#8b5cf6"],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const handleSendInvoice = (item: any) => {
    setInvoiceTarget(item);
    setShowInvoiceModal(true);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 font-sans">

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Command Center</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Real-time overview of the firm's financial health.</p>
        </div>
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          {["All Time", "This Year", "This Month"].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeFilter === filter ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-[#0B1F3A] to-blue-900 rounded-[24px] p-6 shadow-xl shadow-blue-900/10 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-200/80 mb-2">Total Billed</p>
          <h2 className="text-3xl font-black tracking-tight">{formatUGX(financeTotals.totalBilled)}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-300">
            <span>📄 {collectionRate}% Collected</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[24px] p-6 shadow-xl shadow-emerald-900/10 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/80 mb-2">Total Revenue (Paid)</p>
          <h2 className="text-3xl font-black tracking-tight">{formatUGX(financeTotals.totalPaid)}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-300">
            <span>💰 Actual Cash In</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-700 rounded-[24px] p-6 shadow-xl shadow-red-900/10 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-black/10 rounded-full blur-xl group-hover:bg-black/20 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-200/80 mb-2">Total Expenses</p>
          <h2 className="text-3xl font-black tracking-tight">{formatUGX(financeTotals.totalExpenses)}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-rose-300">
            <span>📉 Outflows</span>
          </div>
        </div>
        <div className={`bg-gradient-to-br rounded-[24px] p-6 shadow-xl text-white relative overflow-hidden group ${netProfit >= 0 ? "from-[#0f172a] to-slate-800 shadow-slate-900/20" : "from-orange-500 to-red-600 shadow-red-900/20"}`}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">Net Profit</p>
          <h2 className="text-3xl font-black tracking-tight">{formatUGX(netProfit)}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-300">
            <span>{netProfit >= 0 ? "📈 Profitable" : "⚠️ Deficit"}</span>
          </div>
        </div>
      </div>

      {/* CLIENT LOOKUP */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 mb-8">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Client Lookup</h3>
            <p className="text-xs text-slate-500 mt-1">Type the client name to see if they are returning and which lawyer is handling their active files.</p>
          </div>
          <input
            type="text"
            value={clientLookupQuery}
            onChange={(e) => setClientLookupQuery(e.target.value)}
            placeholder="Enter client name"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          {clientLookupQuery.trim() ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {isClientNew ? (
                <p className="font-black text-slate-900">No existing client found.</p>
              ) : (
                <>
                  <p className="font-black text-slate-900">Returning client detected.</p>
                  {clientLookupResults.some(result => result.client) && (
                    <p className="mt-2 text-slate-600">Matched client name{clientLookupResults.length > 1 ? "s" : ""}: {clientLookupResults.map(result => result.client?.name).filter(Boolean).join(", ")}</p>
                  )}
                  {clientLookupResults.flatMap(result => result.files).length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {clientLookupResults.flatMap(result => result.files).map((match, index) => (
                        <div key={`${match.client?.id ?? "file"}-${index}`} className="rounded-2xl bg-white border border-slate-200 p-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <div>
                              <p className="text-sm font-black text-slate-900">{String((match.item as any).fileName || (match.item as any).subject || "Untitled record")}</p>
                              <p className="text-xs text-slate-500">{match.client ? `Client: ${match.client.name}` : "Client record not found, but file matches query."}</p>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              <p>{(match.item as any).type || (match.item as any).fileType || "File"}</p>
                              <p className="font-black text-slate-800">Handler: {getHandlerName(match.item)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-slate-500">No active files are currently linked to this client.</p>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* AGING ANALYSIS */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 mb-8">
        <h3 className="text-lg font-black text-slate-900 mb-6">📅 Outstanding Balance Aging</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: '0 – 30 Days', key: '0-30',  color: 'emerald', urgent: false },
            { label: '31 – 60 Days', key: '31-60', color: 'yellow',  urgent: false },
            { label: '61 – 90 Days', key: '61-90', color: 'orange',  urgent: true  },
            { label: '90+ Days',     key: '90+',   color: 'red',     urgent: true  },
          ] as const).map(bucket => (
            <div key={bucket.key} className={`rounded-xl p-5 border-l-4 shadow-sm ${
              bucket.color === 'emerald' ? 'bg-emerald-50/50 border-emerald-500' :
              bucket.color === 'yellow'  ? 'bg-yellow-50/50  border-yellow-500'  :
              bucket.color === 'orange'  ? 'bg-orange-50/50  border-orange-500'  :
                                           'bg-red-50/50     border-red-600'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                bucket.color === 'emerald' ? 'text-emerald-700' :
                bucket.color === 'yellow'  ? 'text-yellow-700'  :
                bucket.color === 'orange'  ? 'text-orange-700'  : 'text-red-700'
              }`}>{bucket.label}</p>
              <p className="text-2xl font-black text-slate-800">{agingData.buckets[bucket.key]}<span className="text-xs font-medium text-slate-500 ml-1">files</span></p>
              <p className={`text-sm font-black mt-1 ${
                bucket.color === 'emerald' ? 'text-emerald-600' :
                bucket.color === 'yellow'  ? 'text-yellow-600'  :
                bucket.color === 'orange'  ? 'text-orange-600'  : 'text-red-600'
              }`}>{formatUGX(agingData.amounts[bucket.key])}</p>
              {bucket.urgent && agingData.buckets[bucket.key] > 0 && (
                <span className="text-[9px] bg-red-100 text-red-600 font-black px-2 py-1 rounded mt-2 inline-block uppercase">Action Needed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── UPCOMING COURT DATES ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Upcoming Court Hearings</h3>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Next 14 days across all active cases</p>
          </div>
          <div className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2 rounded-xl text-xs font-black">
            {upcomingHearings.length} Hearing{upcomingHearings.length !== 1 ? "s" : ""} Scheduled
          </div>
        </div>

        {upcomingHearings.length === 0 ? (
          <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-2xl mb-2">⚖️</p>
            <p className="text-slate-400 text-sm font-bold">No court hearings in the next 14 days.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingHearings.map(c => {
              const days = getDaysUntil(c.nextCourtDate!);
              const style = urgencyStyle(days);
              const lawyer = users.find(u => u.id === c.lawyerId);
              const clientName = clients.find(cl => cl.id === c.clientId)?.name || "Unknown Client";
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseForProgress(c)}
                  className="p-5 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer relative group"
                  style={{ backgroundColor: style.bg + "40" }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-sm font-black text-slate-900 leading-tight flex-1 mr-2 truncate">
                      {c.fileName}
                    </p>
                    <span
                      className="text-[10px] font-black px-2.5 py-1 rounded-full shrink-0"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mb-2">
                    {new Date(c.nextCourtDate!).toLocaleDateString("en-GB", {
                      weekday: "short", day: "numeric", month: "short", year: "numeric"
                    })}
                  </p>
                  <p className="text-xs text-slate-500 mb-3">Client: {clientName}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.sittingType && (
                      <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                        {c.sittingType}
                      </span>
                    )}
                    {c.categories?.slice(0, 1).map(cat => (
                      <span key={cat} className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                        {cat}
                      </span>
                    ))}
                    {lawyer && (
                      <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-md">
                        {lawyer.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <span>📄</span> View Case Progress
                    </span>
                    <span className="text-[10px] font-bold bg-white/50 px-2 py-0.5 rounded text-slate-600 border border-slate-200/50">
                      {c.progressNotes?.length || 0} updates
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-8">

          {/* Accounts Receivable */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Accounts Receivable (Pending)</h3>
                <p className="text-xs text-slate-500 mt-1">Quickly see which lawyer manages each unpaid file, so you can route consultation fee questions and invoices correctly.</p>
              </div>
              <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm border border-orange-100">
                Total Uncollected: {formatUGX(financeTotals.outstanding)}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Search receivables</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by file name or handler"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th
                      onClick={() => setSortConfig(p => p?.key === "name" ? { key: "name", direction: p.direction === "asc" ? "desc" : "asc" } : { key: "name", direction: "asc" })}
                      className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      File Name {sortConfig?.key === "name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => setSortConfig(p => p?.key === "billed" ? { key: "billed", direction: p.direction === "asc" ? "desc" : "asc" } : { key: "billed", direction: "desc" })}
                      className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      Total Billed {sortConfig?.key === "billed" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-left">
                      Handler
                    </th>
                    <th
                      onClick={() => setSortConfig(p => p?.key === "unpaid" ? { key: "unpaid", direction: p.direction === "asc" ? "desc" : "asc" } : { key: "unpaid", direction: "desc" })}
                      className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-right cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      Unpaid Balance {sortConfig?.key === "unpaid" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...(transactions || []), ...(courtCases || []), ...(letters || [])]
                    .filter(item => {
                      const billed = ("billed" in item ? item.billed : 0) || ("billedAmount" in item ? item.billedAmount : 0) || 0;
                      const paid = ("paid" in item ? item.paid : 0) || ("paidAmount" in item ? item.paidAmount : 0) || 0;
                      if (billed <= paid) return false;
                      if (!searchQuery.trim()) return true;
                      const query = searchQuery.toLowerCase();
                      const name = String(("fileName" in item ? item.fileName : "") || ("subject" in item ? item.subject : "") || "").toLowerCase();
                      const handler = getHandlerName(item).toLowerCase();
                      return name.includes(query) || handler.includes(query);
                    })
                    .sort((a, b) => {
                      if (!sortConfig) return 0;
                      const getVal = (item: any, key: string) => {
                        if (key === "name") return String(("fileName" in item ? item.fileName : "") || ("subject" in item ? item.subject : "") || "").toLowerCase();
                        if (key === "billed") return Number(("billed" in item ? item.billed : 0) || ("billedAmount" in item ? item.billedAmount : 0) || 0);
                        if (key === "unpaid") {
                          const b = Number(("billed" in item ? item.billed : 0) || ("billedAmount" in item ? item.billedAmount : 0) || 0);
                          const p = Number(("paid" in item ? item.paid : 0) || ("paidAmount" in item ? item.paidAmount : 0) || 0);
                          return b - p;
                        }
                        return 0;
                      };
                      const vA = getVal(a, sortConfig.key);
                      const vB = getVal(b, sortConfig.key);
                      if (vA < vB) return sortConfig.direction === "asc" ? -1 : 1;
                      if (vA > vB) return sortConfig.direction === "asc" ? 1 : -1;
                      return 0;
                    })
                    .map((item, idx) => {
                      const billed = ("billed" in item ? item.billed : 0) || ("billedAmount" in item ? item.billedAmount : 0) || 0;
                      const paid = ("paid" in item ? item.paid : 0) || ("paidAmount" in item ? item.paidAmount : 0) || 0;
                      const unpaid = billed - paid;
                      const name = String(("fileName" in item ? item.fileName : "") || ("subject" in item ? item.subject : "") || "Unknown");
                      const linkedInvoice = invoices.find(inv => inv.relatedFile === name);
                      const scanUrl = item.scannedInvoiceUrl || linkedInvoice?.scannedInvoiceUrl;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td 
                            className="py-4 px-2 text-sm font-bold text-slate-800 cursor-pointer hover:text-blue-600 underline decoration-slate-300 underline-offset-4" 
                            onClick={() => setSelectedCaseForProgress(item)}
                            title="Click to view file progress notes"
                          >
                            {name}
                          </td>
                          <td className="py-4 px-2 text-xs font-bold text-slate-500">{formatUGX(billed)}</td>
                          <td className="py-4 px-2 text-xs font-semibold text-slate-600">{getHandlerName(item)}</td>
                          <td className="py-4 px-2 text-sm font-black text-rose-500 text-right">{formatUGX(unpaid)}</td>
                          <td className="py-4 px-2 text-center">
                            <button
                              onClick={() => { if (scanUrl) { setViewScanUrl(scanUrl); } else { handleSendInvoice(item); } }}
                              className={`border px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm group-hover:shadow-md active:scale-95 flex items-center gap-1 mx-auto ${scanUrl
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                                }`}
                            >
                              <span>👁️</span> View Invoice
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {financeTotals.outstanding === 0 && (
                <div className="py-12 text-center">
                  <p className="text-slate-400 font-bold text-sm">All billed accounts are fully collected! 🎉</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-slate-900 mb-6">Recent Expense Outflows</h3>
            {financeTotals.allExpensesList.length > 0 ? (
              <div className="space-y-4">
                {financeTotals.allExpensesList.slice(0, 5).map((exp, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{exp.description || exp.category || "Unknown Expense"}</p>
                      <p className="text-xs font-bold text-slate-400 mt-1">{exp.date ? new Date(exp.date).toLocaleDateString() : "Recent"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-rose-600">{formatUGX(Number(exp.amount))}</p>
                      {exp.approved && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded inline-block mt-1">Approved</span>}
                    </div>
                  </div>
                ))}
                <button className="w-full mt-4 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                  View All Expenses
                </button>
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs font-bold">No recent expenses logged for this period.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-slate-900 mb-6">Case Volume Breakdown</h3>
            <div className="relative h-64 w-full flex items-center justify-center">
              <Doughnut
                data={sourceData}
                options={{
                  maintainAspectRatio: false,
                  cutout: "75%",
                  plugins: { legend: { position: "bottom", labels: { font: { family: "inherit", weight: "bold", size: 11 }, padding: 20, usePointStyle: true } } }
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cases</span>
                <span className="text-3xl font-black text-slate-800">
                  {(transactions?.length || 0) + (courtCases?.length || 0) + (letters?.length || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 overflow-hidden relative">
            <h3 className="text-lg font-black text-slate-900 mb-2">Collection Efficiency</h3>
            <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">Percentage of billed invoices that have been successfully collected from clients.</p>
            <div className="w-full h-12 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200 shadow-inner block">
              <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out relative" style={{ width: `${collectionRate}%` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 opacity-50 mix-blend-overlay"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                <span className="text-xs font-black uppercase tracking-widest text-[#0f172a] mix-blend-difference drop-shadow-sm">Collected</span>
                <span className="text-sm font-black text-white drop-shadow-md">{collectionRate}%</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>0%</span>
              <span>100% Target</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && invoiceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-8 transform transition-all animate-in zoom-in-95">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-6 mx-auto">📄</div>
            <h3 className="text-2xl font-black text-center text-slate-900 mb-2 tracking-tight">Invoice Preview</h3>
            <p className="text-center text-xs font-medium text-slate-500 mb-6 leading-relaxed">
              Digital preview for <br /><strong className="text-slate-800">{String(invoiceTarget.fileName || invoiceTarget.subject || "Unknown File")}</strong>.
              <br /><span className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-1 block">Scan not yet uploaded</span>
            </p>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-8 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Billed Amount:</span>
                <span>{formatUGX(("billed" in invoiceTarget ? invoiceTarget.billed : 0) || ("billedAmount" in invoiceTarget ? invoiceTarget.billedAmount : 0) || 0)}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-rose-600">
                <span>Unpaid Balance:</span>
                <span>{formatUGX((("billed" in invoiceTarget ? invoiceTarget.billed : 0) || ("billedAmount" in invoiceTarget ? invoiceTarget.billedAmount : 0) || 0) - (("paid" in invoiceTarget ? invoiceTarget.paid : 0) || ("paidAmount" in invoiceTarget ? invoiceTarget.paidAmount : 0) || 0))}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowInvoiceModal(false)} className="flex-[1] py-4 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50 transition-all border border-slate-200">Cancel</button>
              <button
                onClick={() => { alert("Invoice Sent via Email to client!"); setShowInvoiceModal(false); }}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all"
              >
                Dispatch Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan Viewer Modal */}
      {viewScanUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setViewScanUrl(null)}></div>
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-4 transform transition-all animate-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Scanned Invoice Preview</h3>
              <button onClick={() => setViewScanUrl(null)} className="w-10 h-10 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full flex items-center justify-center transition-all text-xl">x</button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100/50 rounded-2xl m-2 flex items-center justify-center p-8">
              {viewScanUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe src={viewScanUrl} className="w-full h-full border-none rounded-xl bg-white shadow-lg" title="PDF Invoice" />
              ) : (
                <img src={viewScanUrl} alt="Scanned Invoice" className="max-w-full h-auto rounded-xl shadow-2xl border border-white/20" />
              )}
            </div>
            <div className="p-4 flex gap-4 justify-end">
              <button onClick={() => window.open(viewScanUrl, "_blank")} className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Open in New Tab</button>
              <button onClick={() => setViewScanUrl(null)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">Close Viewer</button>
            </div>
          </div>
        </div>
      )}

      {/* Case Progress Modal */}
      {selectedCaseForProgress && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedCaseForProgress(null)}></div>
          <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center rounded-t-[32px]">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 px-2 py-1 bg-blue-50 rounded mb-1 inline-block">File Progress History</span>
                <h3 className="font-black text-2xl text-slate-800 break-words pr-4">{selectedCaseForProgress.fileName || selectedCaseForProgress.subject}</h3>
              </div>
              <button onClick={() => setSelectedCaseForProgress(null)} className="w-9 h-9 bg-slate-200 hover:bg-rose-100 hover:text-rose-600 rounded-full flex items-center justify-center font-bold text-slate-500 transition-colors shrink-0">✕</button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-4">
              {selectedCaseForProgress.progressNotes?.length > 0 ? (
                [...selectedCaseForProgress.progressNotes].map((n: any, idx: number) => {
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
                    <p className="text-sm text-slate-700 leading-relaxed break-words">{n.message}</p>
                  </div>
                )})
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <span className="text-2xl mb-2 block">📝</span>
                  <p className="text-slate-500 font-bold text-sm">No progress notes have been filed for this case yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}