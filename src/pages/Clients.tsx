import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const Clients: React.FC = () => {
  const { 
    clients, 
    courtCases, 
    transactions, 
    letters, 
    invoices, 
    addClient, 
    deleteClient, 
    addCommLog, 
    commLogs,
    currentUser 
  } = useAppContext();
  const navigate = useNavigate();

  // --- UI STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [commNote, setCommNote] = useState("");

  // --- FORM STATE ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"Individual" | "Corporate">("Individual");

  const filteredClients = useMemo(() => {
    return (clients || []).filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  // --- PDF/REPORT GENERATION ---
  const handleDownloadReport = (client: any) => {
    const reportDate = new Date().toLocaleString();
    const logEntries = commLogs
      .filter((l: any) => l.clientId === client.id)
      .map(l => `[${l.date}] ${l.authorName || 'Staff'}: ${l.note}`)
      .join('\n');

    const reportContent = `
BUWEMBO & COMPANY ADVOCATES
CLIENT SERVICE REPORT - ${reportDate}
--------------------------------------------------
CLIENT NAME: ${client.name}
TYPE: ${client.type}
EMAIL: ${client.email}
PHONE: ${client.phone || 'N/A'}
TOTAL OUTSTANDING: UGX ${client.totalOwed.toLocaleString()}

LINKED MATTERS:
- Court Cases: ${client.cases.length}
- Transactions: ${client.transactions.length}
- Letters: ${client.letters.length}

INTERNAL COMMUNICATION LOGS:
${logEntries || 'No logs recorded.'}
--------------------------------------------------
CONFIDENTIAL LEGAL DOCUMENT
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${client.name}_Report.txt`;
    link.click();
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient = {
      id: `CLI-${Date.now()}`,
      name, email, phone, type,
      address: "",
      dateAdded: new Date().toISOString().split("T")[0]
    };
    addClient(newClient);
    setShowAddModal(false);
    resetForm();
  };

  const handleSaveLog = () => {
    if (!commNote.trim() || !selectedClient) return;
    const logEntry = {
      id: Date.now().toString(),
      clientId: selectedClient.id,
      note: commNote,
      date: new Date().toLocaleString(),
      authorName: currentUser?.name || "Admin" 
    };
    addCommLog(logEntry);
    setCommNote(""); 
  };

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setType("Individual");
  };

  const formatCurrency = (n: number) => "UGX " + Math.round(n).toLocaleString();

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-8 font-sans relative">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-[#0B1F3A] tracking-tight">Client Portfolio</h1>
          <p className="text-gray-500 font-medium">Buwembo & Company Advocates • Centralized CRM</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#0B1F3A] text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all"
        >
          + REGISTER CLIENT
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center">
        <input 
          type="text" 
          placeholder="Search by name, company, or email..." 
          className="w-full bg-transparent border-none p-4 text-lg focus:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* CLIENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map(client => {
          const clientCases = courtCases.filter(c => c.fileName.toLowerCase().includes(client.name.toLowerCase()));
          const clientTransactions = transactions.filter(t => t.fileName.toLowerCase().includes(client.name.toLowerCase()));
          const clientLetters = letters.filter(l => (l.subject || "").toLowerCase().includes(client.name.toLowerCase()));
          const totalFilesCount = clientCases.length + clientTransactions.length + clientLetters.length;
          const clientInvoices = invoices.filter(i => 
            i.relatedFile.toLowerCase().includes(client.name.toLowerCase()) || 
            i.fileName.toLowerCase().includes(client.name.toLowerCase())
          );
          const totalOwed = clientInvoices.reduce((sum, inv) => sum + inv.balance, 0);

          return (
            <div 
              key={client.id} 
              onClick={() => setSelectedClient({ 
                ...client, 
                cases: clientCases, 
                transactions: clientTransactions,
                letters: clientLetters,
                invoices: clientInvoices, 
                totalOwed,
                totalFilesCount
              })}
              className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${client.type === 'Corporate' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                  {client.type}
                </span>
                <span className="text-[10px] font-bold text-gray-300">#{client.id.split('-')[1]}</span>
              </div>
              <h3 className="text-2xl font-black text-[#0B1F3A] mb-1 group-hover:text-blue-600 transition-colors">{client.name}</h3>
              <p className="text-sm text-gray-400 font-medium mb-6">{client.email}</p>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-6">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Active Files</p>
                  <p className="text-xl font-bold text-[#0B1F3A]">{totalFilesCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Balance Due</p>
                  <p className={`text-xl font-bold ${totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(totalOwed)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CLIENT DETAIL SIDEBAR (DRAWER) */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#0B1F3A] bg-opacity-40 backdrop-blur-sm" onClick={() => setSelectedClient(null)}></div>
          <div className="relative w-full max-w-2xl bg-white h-screen shadow-2xl overflow-y-auto p-10">
            <button onClick={() => setSelectedClient(null)} className="absolute top-8 right-8 text-gray-400 hover:text-black text-2xl">✕</button>
            
            <div className="mb-10">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-blue-600 font-black text-xs uppercase tracking-widest">{selectedClient.type} CLIENT</span>
                  <h2 className="text-4xl font-black text-[#0B1F3A] mt-2">{selectedClient.name}</h2>
                </div>
                <button 
                  onClick={() => handleDownloadReport(selectedClient)}
                  className="mt-4 p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors title='Download Summary Report'"
                >
                  📥 <span className="text-[10px] font-black uppercase ml-1">Export Report</span>
                </button>
              </div>
              <div className="flex gap-4 mt-4 text-sm font-medium text-gray-500">
                <span>📞 {selectedClient.phone || 'No phone'}</span>
                <span>✉️ {selectedClient.email}</span>
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="bg-gray-50 p-4 rounded-2xl text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Total Files</p>
                    <p className="text-xl font-bold text-[#0B1F3A]">{selectedClient.totalFilesCount}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl text-center">
                    <p className="text-[9px] font-black text-red-400 uppercase">Outstanding</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(selectedClient.totalOwed)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl text-center">
                    <p className="text-[9px] font-black text-green-400 uppercase">Status</p>
                    <p className="text-xl font-bold text-green-700">Active</p>
                </div>
            </div>

            {/* COMMUNICATION LOG SECTION */}
            <div className="mb-10 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                <h4 className="font-black text-[#0B1F3A] uppercase text-xs tracking-widest mb-4">Add Internal Note / Comm Log</h4>
                <textarea 
                    className="w-full bg-white border-none rounded-xl p-4 text-sm mb-3 focus:ring-2 focus:ring-blue-500" 
                    placeholder="E.g. Called client regarding overdue payment..."
                    rows={3}
                    value={commNote}
                    onChange={(e) => setCommNote(e.target.value)}
                />
                <button 
                  onClick={handleSaveLog}
                  className="bg-[#0B1F3A] text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-blue-800"
                >
                    SAVE LOG ENTRY
                </button>

                {/* LOG HISTORY LIST */}
                <div className="mt-6 space-y-3 max-h-48 overflow-y-auto">
                  {commLogs?.filter((l: any) => l.clientId === selectedClient.id).map((log: any) => (
                    <div key={log.id} className="bg-white/60 p-3 rounded-lg border border-blue-100 text-xs">
                      <div className="flex justify-between font-black text-gray-400 mb-1 uppercase text-[8px]">
                        <span>{log.authorName || log.author}</span>
                        <span>{log.date}</span>
                      </div>
                      <p className="text-gray-700">{log.note}</p>
                    </div>
                  ))}
                </div>
            </div>

            {/* LINKED MATTERS SECTION */}
            <h4 className="font-black text-[#0B1F3A] uppercase text-xs tracking-widest mb-4">Linked Matter History</h4>
            <div className="space-y-3 mb-10">
              {selectedClient.cases.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-[#0B1F3A]">{c.fileName}</p>
                    <p className="text-[10px] text-blue-500 uppercase font-black">Court Case • {c.status}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/performance?file=${encodeURIComponent(c.fileName)}&openDetails=true`)}
                    className="text-xs font-black text-blue-600 hover:underline"
                  >
                    VIEW PERFORMANCE →
                  </button>
                </div>
              ))}

              {selectedClient.transactions.map((t: any) => (
                <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-[#0B1F3A]">{t.fileName}</p>
                    <p className="text-[10px] text-purple-500 uppercase font-black">Transaction • {t.status}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/performance?file=${encodeURIComponent(t.fileName)}&openDetails=true`)}
                    className="text-xs font-black text-blue-600 hover:underline"
                  >
                    VIEW PERFORMANCE →
                  </button>
                </div>
              ))}

              {selectedClient.letters.map((l: any) => (
                <div key={l.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-[#0B1F3A]">{l.subject}</p>
                    <p className="text-[10px] text-orange-500 uppercase font-black">Letter • {l.status}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/performance?file=${encodeURIComponent(l.subject)}&openDetails=true`)}
                    className="text-xs font-black text-blue-600 hover:underline"
                  >
                    VIEW PERFORMANCE →
                  </button>
                </div>
              ))}

              {selectedClient.totalFilesCount === 0 && (
                <p className="text-gray-400 text-sm italic py-4">No matters linked to this client name.</p>
              )}
            </div>

            <button 
                onClick={() => { if(window.confirm("Delete this client?")) { deleteClient(selectedClient.id); setSelectedClient(null); }}}
                className="mt-10 text-red-300 hover:text-red-600 text-xs font-bold uppercase tracking-widest"
            >
                Permanently Delete Client Record
            </button>
          </div>
        </div>
      )}

      {/* ADD CLIENT MODAL (Unchanged) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0B1F3A] bg-opacity-90 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
          <form onSubmit={handleAddClient} className="relative bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl space-y-6">
            <h2 className="text-2xl font-black text-[#0B1F3A]">New Client Onboarding</h2>
            <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Entity Name</label>
                <input required className="w-full bg-gray-50 border-none p-4 rounded-xl" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name or Company Ltd" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Client Type</label>
                    <select className="w-full bg-gray-50 border-none p-4 rounded-xl font-bold" value={type} onChange={e => setType(e.target.value as any)}>
                        <option value="Individual">Individual</option>
                        <option value="Corporate">Corporate</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Phone #</label>
                    <input className="w-full bg-gray-50 border-none p-4 rounded-xl" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+256..." />
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Email Address</label>
                <input required type="email" className="w-full bg-gray-50 border-none p-4 rounded-xl" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" />
            </div>
            <button type="submit" className="w-full bg-[#0B1F3A] text-white font-black py-5 rounded-2xl shadow-lg hover:bg-blue-900 transition-all">
              FINISH REGISTRATION
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Clients;