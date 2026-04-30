import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

// Typography system:
// Display / headings : "Playfair Display"
// Body / UI          : "DM Sans"
// Add to index.html <head>:
// <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />

const Clients: React.FC = () => {
  const {
    clients, courtCases, transactions, letters, invoices, landTitles,
    addClient, updateClient, deleteClient, addCommLog, commLogs, currentUser, expenses
  } = useAppContext();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortType, setSortType] = useState("newest");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [commNote, setCommNote] = useState("");
  const [activeDrawerTab, setActiveDrawerTab] = useState<"Overview" | "Expenses">("Overview");
  const [activeHistoryTab, setActiveHistoryTab] = useState<"Matters" | "Letters">("Matters");

  // Add-client form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"Individual" | "Corporate">("Individual");

  // Edit-client modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const openEditModal = (client: any) => {
    setEditName(client.name);
    setEditEmail(client.email || "");
    setEditPhone(client.phone || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !selectedClient) return;
    const updated = { ...selectedClient, name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() };
    updateClient(updated);
    setSelectedClient(updated);
    setShowEditModal(false);
  };

  const selectedClientLetters = useMemo(() => {
    if (!selectedClient) return [];
    return letters.filter(l =>
      l.clientId === selectedClient.id ||
      (l as any).client_id === selectedClient.id ||
      ((!l.clientId && !(l as any).client_id) && 
        ((l.subject || "").toLowerCase().includes(selectedClient.name.toLowerCase()) ||
         (l.recipient || "").toLowerCase().includes(selectedClient.name.toLowerCase())))
    );
  }, [selectedClient, letters]);

  const filteredClients = useMemo(() => {
    const result = (clients || [])
      .filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(client => {
        const clientCases = courtCases.filter(c => c.clientId === client.id || (!c.clientId && c.fileName.toLowerCase().includes(client.name.toLowerCase())));
        const clientTransactions = transactions.filter(t => t.clientId === client.id || (!t.clientId && t.fileName.toLowerCase().includes(client.name.toLowerCase())));
        const clientLetters = letters.filter(l =>
          l.clientId === client.id ||
          (l as any).client_id === client.id ||
          ((!l.clientId && !(l as any).client_id) && (l.subject || "").toLowerCase().includes(client.name.toLowerCase()))
        );

        // A title belongs to this client if:
        // 1. It is directly linked via client_id
        // 2. Its linked file (transaction_id) points to a transaction/case/letter
        //    that already belongs to this client — handles the case where the title
        //    owner name differs but the title was linked to one of the client's files
        // 3. Fallback name match — only when the title has no explicit links at all
        const clientTitles = (landTitles || []).filter((t: any) => {
          if (t.client_id === client.id) return true;
          if (t.transaction_id) {
            const linkedTx = transactions.find(tx => tx.id === t.transaction_id && tx.clientId === client.id);
            const linkedCase = courtCases.find(c => c.id === t.transaction_id && c.clientId === client.id);
            const linkedLtr = letters.find(l => l.id === t.transaction_id && l.clientId === client.id);
            if (linkedTx || linkedCase || linkedLtr) return true;
          }
          // Name fallback only when the title has no explicit client or file link
          if (!t.client_id && !t.transaction_id) {
            return t.owner_name?.toLowerCase().includes(client.name.toLowerCase());
          }
          return false;
        });

        const totalFilesCount = clientCases.length + clientTransactions.length + clientTitles.length;
        const totalOwed =
          clientCases.reduce((sum, c) => sum + (c.balance || 0), 0) +
          clientTransactions.reduce((sum, t) => sum + (t.balance || 0), 0) +
          clientLetters.reduce((sum, l) => sum + ((l.billed || 0) - (l.paid || 0)), 0) +
          clientTitles.reduce((sum: number, t: any) => sum + ((t.total_billed || 0) - (t.total_paid || 0)), 0);

        const clientExpenses = (expenses || []).filter((e: any) => 
          clientCases.some(c => c.id === e.relatedFileId) ||
          clientTransactions.some(t => t.id === e.relatedFileId) ||
          clientLetters.some(l => l.id === e.relatedFileId) ||
          clientTitles.some((t: any) => t.id === e.relatedFileId)
        );

        return { ...client, cases: clientCases, transactions: clientTransactions, letters: clientLetters, titles: clientTitles, expenses: clientExpenses, totalOwed, totalFilesCount };
      });

    return result.sort((a, b) => {
      switch (sortType) {
        case "newest": return new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime();
        case "oldest": return new Date(a.dateAdded || 0).getTime() - new Date(b.dateAdded || 0).getTime();
        case "az": return a.name.localeCompare(b.name);
        case "za": return b.name.localeCompare(a.name);
        case "owed-desc": return b.totalOwed - a.totalOwed;
        case "files-desc": return b.totalFilesCount - a.totalFilesCount;
        default: return 0;
      }
    });
  }, [clients, searchTerm, sortType, courtCases, transactions, letters, invoices, landTitles, expenses]);

  const handleDownloadReport = (client: any) => {
    const logEntries = commLogs
      .filter((l: any) => l.clientId === client.id)
      .map(l => `[${l.date}] ${l.authorName || "Staff"}: ${l.note}`)
      .join("\n");

    const content = [
      "BUWEMBO & COMPANY ADVOCATES",
      `CLIENT SERVICE REPORT -- ${new Date().toLocaleString()}`,
      "-".repeat(50),
      `CLIENT NAME : ${client.name}`,
      `TYPE        : ${client.type}`,
      `EMAIL       : ${client.email || "N/A"}`,
      `PHONE       : ${client.phone || "N/A"}`,
      `OUTSTANDING : UGX ${client.totalOwed.toLocaleString()}`,
      "",
      "LINKED MATTERS",
      `  Court Cases  : ${client.cases.length}`,
      `  Transactions : ${client.transactions.length}`,
      `  Letters      : ${client.letters.length}`,
      `  Land Titles  : ${client.titles?.length || 0}`,
      "",
      "COMMUNICATION LOG",
      logEntries || "No logs recorded.",
      "-".repeat(50),
      "CONFIDENTIAL LEGAL DOCUMENT",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name.replace(/\s+/g, "_")}_Report.txt`;
    a.click();
  };

  const handleDownloadExpensesCSV = (client: any) => {
    if (!client.expenses || client.expenses.length === 0) return alert("No expenses to export");
    const headers = ["Date", "Type", "File Name", "Purpose", "Amount (UGX)"];
    const rows = client.expenses.map((exp: any) => [
      exp.date,
      exp.type === "in" ? "Money In" : "Money Out",
      (exp.relatedFileName || "").replace(/,/g, ""),
      (exp.purpose || exp.description || "").replace(/,/g, ""),
      exp.amount
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${client.name.replace(/\s+/g, "_")}_Expenses.csv`);
    link.click();
  };

  const handleSubmit = () => {
    const newClient = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      type,
      dateAdded: new Date().toISOString(),
    };
    addClient(newClient);
    setShowAddModal(false);
    setName("");
    setEmail("");
    setPhone("");
    setType("Individual");
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  const handleSaveLog = () => {
    if (!commNote.trim() || !selectedClient) return;
    addCommLog({
      id: Date.now().toString(),
      clientId: selectedClient.id,
      note: commNote,
      date: new Date().toLocaleString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      authorName: currentUser?.name || "Support Staff",
    });
    setCommNote("");
  };

  const fmt = (n: number) => "UGX " + Math.round(n).toLocaleString();
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5";
  const inp = "w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 transition";
  const body = { fontFamily: "'DM Sans', sans-serif" } as React.CSSProperties;
  const serif = { fontFamily: "'Playfair Display', serif" } as React.CSSProperties;

  return (
    <div style={body} className="min-h-screen bg-[#F4F7F9] p-8">

      {/* HEADER */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
            Buwembo & Company Advocates
          </p>
          <h1 style={serif} className="text-4xl font-bold text-[#0B1F3A] leading-tight">
            Client Portfolio
          </h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#0B1F3A] text-white px-7 py-3.5 rounded-2xl text-sm font-semibold shadow-lg hover:bg-blue-900 active:scale-95 transition-all"
        >
          + Register Client
        </button>
      </div>

      {/* SEARCH & SORT */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-8 flex items-center gap-3 px-5">
        <span className="text-slate-300 text-base select-none">🔍</span>
        <input
          type="text"
          placeholder="Search by name, company, or email..."
          className="flex-1 bg-transparent py-4 text-sm text-slate-700 placeholder-slate-300 outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="text-slate-300 hover:text-slate-500 text-lg font-bold leading-none transition">x</button>
        )}
        <div className="w-px h-6 bg-slate-100" />
        <select
          className="bg-transparent text-slate-500 text-sm font-medium py-4 outline-none cursor-pointer"
          value={sortType}
          onChange={e => setSortType(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="az">Name A-Z</option>
          <option value="za">Name Z-A</option>
          <option value="owed-desc">Highest Balance</option>
          <option value="files-desc">Most Active Files</option>
        </select>
      </div>

      {/* CLIENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredClients.map(client => (
          <div
            key={client.id}
            onClick={() => { setSelectedClient(client); setActiveDrawerTab("Overview"); setActiveHistoryTab("Matters"); }}
            className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-5">
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${client.type === "Corporate" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                {client.type}
              </span>
              <span className="text-xs text-slate-300">#{client.id.split("-")[1]}</span>
            </div>
            <h3 style={serif} className="text-xl font-semibold text-[#0B1F3A] mb-1 group-hover:text-blue-700 transition-colors leading-snug">
              {client.name}
            </h3>
            <p className="text-sm text-slate-400 mb-6 truncate">{client.email || "No email on record"}</p>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-5">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Active Files</p>
                <p className="text-2xl font-bold text-[#0B1F3A]">{client.totalFilesCount || 0}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Balance Due</p>
                <p className={`text-lg font-bold ${client.totalOwed > 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {fmt(client.totalOwed || 0)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className="col-span-3 py-24 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-sm text-slate-300 font-medium">No clients match your search.</p>
          </div>
        )}
      </div>

      {/* CLIENT DETAIL DRAWER */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#0B1F3A]/40 backdrop-blur-sm" onClick={() => setSelectedClient(null)} />

          <div
            style={body}
            className="relative w-full max-w-2xl bg-white h-screen shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#0B1F3A] px-10 pt-10 pb-10 text-white">
              <div className="flex items-start justify-between mb-4">
                <button
                  onClick={() => setSelectedClient(null)}
                  className="flex items-center gap-1.5 text-blue-300 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => openEditModal(selectedClient)}
                  className="text-xs font-semibold text-blue-300 hover:text-white border border-blue-600 hover:border-white px-3 py-1 rounded-lg transition-colors"
                >
                  ✏️ Edit
                </button>
              </div>
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-2 mt-1">
                {selectedClient.type} Client
              </p>
              <h2 style={serif} className="text-3xl font-bold leading-tight mb-3">
                {selectedClient.name}
              </h2>
              <div className="flex flex-wrap gap-5 text-sm text-blue-200 font-medium">
                <span>📞 {selectedClient.phone || "No phone"}</span>
                <span>✉️ {selectedClient.email || "No email"}</span>
              </div>
            </div>

            <div className="px-10 py-8">

              <div className="flex gap-2 p-1 bg-slate-200/60 rounded-xl w-fit mb-8">
                <button 
                  onClick={() => setActiveDrawerTab("Overview")}
                  className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeDrawerTab === "Overview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Client Overview
                </button>
                {(currentUser?.role === 'accountant' || currentUser?.role === 'admin') && (
                  <button 
                    onClick={() => setActiveDrawerTab("Expenses")}
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeDrawerTab === "Expenses" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Expense Record
                  </button>
                )}
              </div>

              {activeDrawerTab === "Overview" || !(currentUser?.role === 'accountant' || currentUser?.role === 'admin') ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Files</p>
                      <p className="text-xl font-bold text-[#0B1F3A]">{selectedClient.totalFilesCount}</p>
                    </div>
                    <div className="bg-red-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Outstanding</p>
                      <p className={`text-lg font-bold ${selectedClient.totalOwed > 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {fmt(selectedClient.totalOwed)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">Status</p>
                      <p className="text-lg font-bold text-emerald-600">Active</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadReport(selectedClient)}
                    className="w-full mb-8 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    📥 Export Client Report
                  </button>

                  <div className="mb-8 bg-blue-50 rounded-2xl border border-blue-100 p-6">
                    <h4 className="text-xs font-semibold text-[#0B1F3A] uppercase tracking-widest mb-4">
                      Internal Notes & Communication Log
                    </h4>
                    <textarea
                      className="w-full bg-white border border-blue-100 rounded-xl p-4 text-sm text-slate-700 placeholder-slate-300 outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-3"
                      placeholder="e.g. Called client regarding overdue payment..."
                      rows={3}
                      value={commNote}
                      onChange={e => setCommNote(e.target.value)}
                    />
                    <button
                      onClick={handleSaveLog}
                      className="bg-[#0B1F3A] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-900 transition-colors"
                    >
                      Save Log Entry
                    </button>
                    <div className="mt-5 space-y-3 max-h-48 overflow-y-auto pr-1">
                      {commLogs
                        ?.filter((l: any) => l.clientId === selectedClient.id)
                        .map((log: any) => (
                          <div key={log.id} className="bg-white p-4 rounded-xl border border-blue-100">
                            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
                              <span>{log.authorName || log.author}</span>
                              <span>{log.date}</span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{log.note}</p>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h4 className="text-xs font-semibold text-[#0B1F3A] uppercase tracking-widest">
                      Linked Matter History
                    </h4>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-full">
                      <button
                        onClick={() => setActiveHistoryTab("Matters")}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition ${activeHistoryTab === "Matters" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Matter History
                      </button>
                      <button
                        onClick={() => setActiveHistoryTab("Letters")}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition ${activeHistoryTab === "Letters" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Letters
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2.5 mb-10">
                    {activeHistoryTab === "Matters" ? (
                      <>
                        {selectedClient.cases.map((c: any) => (
                          <MatterRow key={c.id} title={c.fileName} badge="Court Case"
                            badgeColor="text-blue-600 bg-blue-50" sub={c.status}
                            onOpen={() => navigate(`/lawyer/cases/${c.id}`)} />
                        ))}
                        {selectedClient.transactions.map((t: any) => (
                          <MatterRow key={t.id} title={t.fileName} badge="Transaction"
                            badgeColor="text-purple-600 bg-purple-50" sub={t.status}
                            onOpen={() => navigate(`/performance?file=${encodeURIComponent(t.fileName)}&openDetails=true`)} />
                        ))}
                        {selectedClient.titles?.map((t: any) => (
                          <MatterRow
                            key={t.id}
                            title={`Plot ${t.title_number}${t.block ? `, Block ${t.block}` : ""}`}
                            badge="Land Title"
                            badgeColor="text-emerald-600 bg-emerald-50"
                            sub={
                              t.owner_name?.toLowerCase() !== selectedClient.name.toLowerCase()
                                ? `${t.status} · Owner: ${t.owner_name}`
                                : t.status
                            }
                            onOpen={() => navigate(`/land-titles/${t.id}`)}
                          />
                        ))}
                        {selectedClient.totalFilesCount === 0 && (
                          <p className="text-slate-300 text-sm italic py-6 text-center">No matters linked to this client.</p>
                        )}
                      </>
                    ) : (
                      <>
                        {selectedClientLetters.length > 0 ? (
                          selectedClientLetters.map((l: any) => (
                            <MatterRow key={l.id} title={l.subject || 'Untitled Letter'} badge="Letter"
                              badgeColor="text-orange-600 bg-orange-50" sub={l.status}
                              onOpen={() => navigate(`/lawyer/letters/${l.id}`)} />
                          ))
                        ) : (
                          <p className="text-slate-400 text-sm italic py-6 text-center">No letters linked to this client.</p>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm("Permanently delete this client record?")) {
                        deleteClient(selectedClient.id);
                        setSelectedClient(null);
                      }
                    }}
                    className="text-red-300 hover:text-red-500 text-xs font-semibold uppercase tracking-widest transition-colors"
                  >
                    Permanently Delete Client Record
                  </button>
                </>
              ) : (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-semibold text-[#0B1F3A] uppercase tracking-widest">
                      Expense Record
                    </h4>
                    <button
                      onClick={() => handleDownloadExpensesCSV(selectedClient)}
                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-bold text-xs transition-colors border border-emerald-200"
                    >
                      📥 Export Expenses CSV
                    </button>
                  </div>

                  {/* Account Balance Summary - Always visible */}
                  {(() => {
                    // Calculate total account balance
                    const allFilesForBalance = [
                      ...selectedClient.cases.map((c: any) => ({ paid: c.paid || 0 })),
                      ...selectedClient.transactions.map((t: any) => ({ paid: t.paidAmount || 0 })),
                      ...selectedClient.letters.map((l: any) => ({ paid: l.paid || 0 })),
                      ...selectedClient.titles.map((t: any) => ({ paid: t.total_paid || 0 }))
                    ];

                    const expenseTotal = selectedClient.expenses?.reduce((sum: number, exp: any) => {
                      return exp.type === 'out' ? sum + (exp.amount || 0) : sum;
                    }, 0) || 0;

                    const moneyReceived = allFilesForBalance.reduce((sum, f) => sum + (f.paid || 0), 0);
                    const moneySpent = expenseTotal;
                    const accountBalance = moneyReceived - moneySpent;

                    return (
                      <div className="mb-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
                        <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">Client Account Balance</h5>
                        <div className="grid grid-cols-3 gap-6">
                          <div>
                            <p className="text-xs text-slate-400 mb-2">Money Received</p>
                            <p className="text-2xl font-bold">{fmt(moneyReceived)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-2">Money Spent</p>
                            <p className="text-2xl font-bold text-orange-300">{fmt(moneySpent)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-2">Balance on Account</p>
                            <p className={`text-2xl font-bold ${accountBalance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {fmt(accountBalance)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-4 italic">
                          {accountBalance > 0 
                            ? `Account has surplus of ${fmt(accountBalance)}` 
                            : `Account has deficit of ${fmt(Math.abs(accountBalance))}`}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Calculate file totals */}
                  {(() => {
                    // Aggregate all files with their financial data
                    const allFiles = [
                      ...selectedClient.cases.map((c: any) => ({ id: c.id, name: c.fileName, type: 'case', billed: c.billed || 0, paid: c.paid || 0 })),
                      ...selectedClient.transactions.map((t: any) => ({ id: t.id, name: t.fileName, type: 'transaction', billed: t.billedAmount || 0, paid: t.paidAmount || 0 })),
                      ...selectedClient.letters.map((l: any) => ({ id: l.id, name: l.subject, type: 'letter', billed: l.billed || 0, paid: l.paid || 0 })),
                      ...selectedClient.titles.map((t: any) => ({ id: t.id, name: `Plot ${t.title_number}${t.block ? `, Block ${t.block}` : ''}`, type: 'title', billed: t.total_billed || 0, paid: t.total_paid || 0 }))
                    ];

                    // Build expense map by file name
                    const expensesByFile = new Map<string, number>();
                    selectedClient.expenses?.forEach((exp: any) => {
                      if (exp.relatedFileName) {
                        const current = expensesByFile.get(exp.relatedFileName) || 0;
                        // Only add "OUT" expenses to the spent amount
                        if (exp.type === 'out') {
                          expensesByFile.set(exp.relatedFileName, current + (exp.amount || 0));
                        }
                      }
                    });

                    // Group by file name (to handle duplicates from different sources)
                    const fileMap = new Map<string, any>();
                    allFiles.forEach(file => {
                      if (fileMap.has(file.name)) {
                        const existing = fileMap.get(file.name);
                        existing.billed += file.billed;
                        existing.paid += file.paid;
                        existing.balance = existing.billed - existing.paid;
                      } else {
                        fileMap.set(file.name, { ...file, balance: (file.billed || 0) - (file.paid || 0) });
                      }
                    });

                    // Add expenses to the paid/spent amount
                    expensesByFile.forEach((expenseAmount, fileName) => {
                      if (fileMap.has(fileName)) {
                        const file = fileMap.get(fileName);
                        file.paid += expenseAmount;
                        file.balance = file.billed - file.paid;
                      }
                    });

                    const uniqueFiles = Array.from(fileMap.values());
                    const totalBilled = uniqueFiles.reduce((sum, f) => sum + (f.billed || 0), 0);
                    const totalPaid = uniqueFiles.reduce((sum, f) => sum + (f.paid || 0), 0);
                    const totalBalance = totalBilled - totalPaid;

                    return (
                      <>
                        {/* Show total summary ONLY if client has more than one file */}
                        {uniqueFiles.length > 1 && (
                          <div className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                            <h5 className="text-xs font-semibold text-[#0B1F3A] uppercase tracking-widest mb-3">Total Across All Files</h5>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Total Billed</p>
                                <p className="text-lg font-bold text-[#0B1F3A]">{fmt(totalBilled)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Total Spent</p>
                                <p className="text-lg font-bold text-orange-600">{fmt(totalPaid)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Total Balance</p>
                                <p className={`text-lg font-bold ${totalBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                  {fmt(totalBalance)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Per-file breakdown */}
                        {uniqueFiles.length > 0 ? (
                          <div className="space-y-4">
                            <h5 className="text-xs font-semibold text-[#0B1F3A] uppercase tracking-widest">
                              {uniqueFiles.length > 1 ? 'Breakdown by File' : 'File Details'}
                            </h5>
                            {uniqueFiles.map((file: any) => (
                              <div key={file.name} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-sm font-semibold text-[#0B1F3A] mb-3 truncate">{file.name}</p>
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs text-slate-400 mb-1">Billed</p>
                                    <p className="text-base font-bold text-[#0B1F3A]">{fmt(file.billed)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400 mb-1">Spent</p>
                                    <p className="text-base font-bold text-orange-600">{fmt(file.paid)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400 mb-1">Balance</p>
                                    <p className={`text-base font-bold ${(file.billed - file.paid) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                      {fmt(file.billed - file.paid)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm italic mb-4">No files or financial records for this client.</p>
                        )}

                        {/* Expense detail table if expenses exist */}
                        {selectedClient.expenses?.length > 0 && (
                          <>
                            <h5 className="text-xs font-semibold text-[#0B1F3A] uppercase tracking-widest mt-8 mb-3">Expense Transactions</h5>
                            <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                                      <th className="p-3">Date</th>
                                      <th className="p-3">Type</th>
                                      <th className="p-3">File</th>
                                      <th className="p-3">Purpose</th>
                                      <th className="p-3 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedClient.expenses.map((exp: any) => (
                                      <tr key={exp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                        <td className="p-3 whitespace-nowrap text-slate-600">{exp.date}</td>
                                        <td className="p-3">
                                          {exp.type === 'in' 
                                            ? <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-1 rounded">IN (+)</span>
                                            : <span className="text-red-500 font-bold text-[10px] bg-red-50 px-2 py-1 rounded">OUT (-)</span>
                                          }
                                        </td>
                                        <td className="p-3 text-slate-700 max-w-[150px] truncate" title={exp.relatedFileName}>{exp.relatedFileName || '-'}</td>
                                        <td className="p-3 text-slate-700">{exp.purpose || exp.description}</td>
                                        <td className={`p-3 text-right font-bold whitespace-nowrap ${exp.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                                          {exp.type === 'in' ? '+' : '-'} UGX {Number(exp.amount).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0B1F3A]/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div
            style={body}
            className="relative bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-400 font-bold transition-colors"
            >
              x
            </button>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Edit Client</p>
              <h2 style={serif} className="text-2xl font-bold text-[#0B1F3A]">Update Client Details</h2>
            </div>
            <div>
              <label className={lbl}>Full Name / Company</label>
              <input
                required
                className={inp}
                placeholder="e.g. Nakato Sarah"
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Phone Number</label>
                <input
                  className={inp}
                  placeholder="+256 700 000000"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Email Address</label>
                <input
                  type="email"
                  className={inp}
                  placeholder="client@example.com"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleSaveEdit}
              disabled={!editName.trim()}
              className="w-full bg-[#0B1F3A] text-white text-sm font-semibold py-4 rounded-2xl shadow-lg hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* ADD CLIENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0B1F3A]/80 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <form
            onSubmit={handleAddClient}
            style={body}
            className="relative bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-400 font-bold transition-colors"
            >
              x
            </button>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Client Intake</p>
              <h2 style={serif} className="text-2xl font-bold text-[#0B1F3A]">New Client Registration</h2>
            </div>
            <div>
              <label className={lbl}>Full Name / Company</label>
              <input required className={inp} placeholder="e.g. Nakato Sarah or Kampala Holdings Ltd"
                value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Client Type</label>
                <select className={inp} value={type} onChange={e => setType(e.target.value as any)}>
                  <option value="Individual">Individual</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Phone Number</label>
                <input className={inp} placeholder="+256 700 000000"
                  value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={lbl}>Email Address <span className="normal-case font-normal text-slate-300">(optional)</span></label>
              <input type="email" className={inp} placeholder="client@example.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button
              type="submit"
              className="w-full bg-[#0B1F3A] text-white text-sm font-semibold py-4 rounded-2xl shadow-lg hover:bg-blue-900 active:scale-95 transition-all mt-2"
            >
              Complete Registration
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

/* Reusable matter row */
const MatterRow = ({ title, badge, badgeColor, sub, onOpen }: {
  title: string; badge: string; badgeColor: string; sub: string; onOpen: () => void;
}) => (
  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
    <div className="flex-1 min-w-0 mr-4">
      <p className="text-sm font-semibold text-[#0B1F3A] truncate">{title}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${badgeColor}`}>{badge}</span>
        <span className="text-xs text-slate-400">{sub}</span>
      </div>
    </div>
    <button
      onClick={e => { e.stopPropagation(); onOpen(); }}
      className="text-xs font-semibold text-blue-500 hover:text-blue-700 whitespace-nowrap transition-colors"
    >
      Open →
    </button>
  </div>
);

export default Clients;