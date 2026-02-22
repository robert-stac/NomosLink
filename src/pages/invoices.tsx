import React, { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";

const Invoices: React.FC = () => {
  const { 
    transactions, 
    courtCases, 
    letters, 
    invoices, 
    addInvoice, 
    updateInvoice, 
    deleteInvoice 
  } = useAppContext();

  /* =======================
      FORM STATE
  ======================= */
  const [fileName, setFileName] = useState("");
  const [relatedFile, setRelatedFile] = useState("");
  const [amountBilled, setAmountBilled] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [includeVAT, setIncludeVAT] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* =======================
      SEARCH & FILTER STATE
  ======================= */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [minBalance, setMinBalance] = useState(0);

  /* =======================
      BUSINESS LOGIC
  ======================= */
  const VAT_RATE = 0.18;

  const allFiles = useMemo(() => {
    const cases = (courtCases || []).map((c) => ({ label: `⚖️ Case: ${c.fileName}`, value: c.fileName }));
    const trans = (transactions || []).map((t) => ({ label: `💳 Trans: ${t.fileName}`, value: t.fileName }));
    const lets = (letters || []).map((l) => ({ label: `✉️ Letter: ${l.subject}`, value: l.subject }));
    return [...cases, ...trans, ...lets].filter(item => item.value);
  }, [courtCases, transactions, letters]);

  const calculateFinancials = (billed: number) => {
    const net = includeVAT ? billed / (1 + VAT_RATE) : billed;
    const vat = billed - net;
    return { net, vat, gross: billed };
  };

  const getInvoiceAge = (dateStr: string) => {
    const start = new Date(dateStr);
    const today = new Date();
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // --- SEARCH & FILTER LOGIC ---
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch = 
        inv.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.relatedFile.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === "All" ? true : 
        filterStatus === "Paid" ? inv.isPaid : !inv.isPaid;

      const matchesBalance = inv.balance >= minBalance;

      return matchesSearch && matchesStatus && matchesBalance;
    });
  }, [invoices, searchTerm, filterStatus, minBalance]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fileName.trim()) return alert("Please enter an Invoice Reference number.");
    if (!relatedFile) return alert("Please select a related Case or Letter.");
    if (amountBilled <= 0) return alert("Amount Billed must be greater than 0.");

    const billed = Number(amountBilled);
    const paid = Number(amountPaid) || 0;

    const payload = {
      id: isEditing && editingId ? editingId : `INV-${Date.now()}`,
      fileName: fileName.trim(),
      relatedFile,
      amountBilled: billed,
      amountPaid: paid,
      balance: billed - paid,
      isPaid: paid >= billed,
      dateCreated: isEditing 
        ? (invoices.find(i => i.id === editingId)?.dateCreated || new Date().toISOString().split("T")[0]) 
        : new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 12096e5).toISOString().split("T")[0], 
    };

    try {
      if (isEditing) {
        updateInvoice(payload);
      } else {
        addInvoice(payload);
      }
      resetForm();
    } catch (error) {
      console.error("Save Error:", error);
      alert("Error saving to ledger. Please check system context.");
    }
  };

  const resetForm = () => {
    setFileName(""); 
    setRelatedFile(""); 
    setAmountBilled(0); 
    setAmountPaid(0);
    setIsEditing(false); 
    setEditingId(null);
  };

  const formatCurrency = (n: number) => "UGX " + Math.round(n).toLocaleString();

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-8 font-sans">
      {/* EXECUTIVE HEADER */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black text-[#0B1F3A] tracking-tight">Accounts & Ledger</h1>
          <p className="text-gray-500 font-medium">Buwembo & Company Advocates • Internal Revenue Tracking</p>
        </div>
        <div className="flex gap-6">
            <div className="text-right border-r pr-6">
                <p className="text-[10px] uppercase text-gray-400 font-bold">Total Receivables</p>
                <p className="text-2xl font-bold text-[#0B1F3A]">{formatCurrency(invoices.reduce((s, i) => s + i.balance, 0))}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] uppercase text-gray-400 font-bold">Collection Rate</p>
                <p className="text-2xl font-bold text-green-600">
                    {invoices.length > 0 
                      ? Math.round((invoices.reduce((s,i) => s + i.amountPaid, 0) / invoices.reduce((s,i) => s + i.amountBilled, 0)) * 100) 
                      : 0}%
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* BILLING CONSOLE */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sticky top-8">
            <h2 className="text-lg font-bold text-[#0B1F3A] mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-[#0B1F3A] rounded-full"></span> 
                {isEditing ? "Modify Entry" : "New Billing Entry"}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Invoice Ref #</label>
                <input className="w-full bg-gray-50 border-none p-3 rounded-xl focus:ring-2 focus:ring-[#0B1F3A]" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="e.g. BCA/2026/042" required />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Link to Matter</label>
                <select className="w-full bg-gray-50 border-none p-3 rounded-xl focus:ring-2 focus:ring-[#0B1F3A]" value={relatedFile} onChange={e => setRelatedFile(e.target.value)} required>
                  <option value="">Select Case/Letter...</option>
                  {allFiles.map((f, i) => <option key={i} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              <div className="bg-[#0B1F3A] bg-opacity-5 p-4 rounded-xl border border-[#0B1F3A] border-opacity-10">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-black text-[#0B1F3A] uppercase">Financial Breakdown</label>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500">VAT (18%)</span>
                        <input type="checkbox" checked={includeVAT} onChange={e => setIncludeVAT(e.target.checked)} />
                    </div>
                </div>
                <input type="number" className="w-full bg-white border-none p-3 rounded-lg text-lg font-bold mb-3" value={amountBilled || ""} onChange={e => setAmountBilled(Number(e.target.value))} placeholder="Total Gross Amount" />
                <div className="text-[11px] text-gray-500 space-y-1">
                    <div className="flex justify-between"><span>Professional Fees:</span> <span>{formatCurrency(calculateFinancials(amountBilled).net)}</span></div>
                    <div className="flex justify-between font-bold text-[#0B1F3A]"><span>VAT Component:</span> <span>{formatCurrency(calculateFinancials(amountBilled).vat)}</span></div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Payment Received</label>
                <input type="number" className="w-full bg-gray-50 border-none p-3 rounded-xl focus:ring-2 focus:ring-green-500" value={amountPaid || ""} onChange={e => setAmountPaid(Number(e.target.value))} placeholder="Amount already paid" />
              </div>

              <button type="submit" className="w-full bg-[#0B1F3A] text-white font-black py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1">
                {isEditing ? "UPDATE LEDGER" : "POST INVOICE"}
              </button>
              {isEditing && <button type="button" onClick={resetForm} className="w-full text-gray-400 text-xs font-bold py-2 hover:text-red-500">Discard Changes</button>}
            </form>
          </div>
        </div>

        {/* AGING LEDGER & SEARCH */}
        <div className="col-span-12 lg:col-span-8">
            {/* SEARCH & FILTER BAR */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <input 
                        type="text" 
                        placeholder="Search Reference or Matter..." 
                        className="w-full bg-gray-50 border-none p-3 rounded-lg text-sm focus:ring-2 focus:ring-[#0B1F3A]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    className="bg-gray-50 border-none p-3 rounded-lg text-sm font-bold text-[#0B1F3A]"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Paid Only</option>
                    <option value="Pending">Unpaid/Pending</option>
                </select>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Min Balance:</span>
                    <input 
                        type="number" 
                        className="w-24 bg-gray-50 border-none p-2 rounded-lg text-sm"
                        placeholder="0"
                        onChange={(e) => setMinBalance(Number(e.target.value))}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b bg-white flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#0B1F3A]">Accounts Receivable Aging</h3>
                    <span className="text-xs font-bold text-gray-400">Showing {filteredInvoices.length} entries</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="p-5">Matter & Ref</th>
                                <th className="p-5 text-right">Age</th>
                                <th className="p-5 text-right">Total Billed</th>
                                <th className="p-5 text-right">Outstanding</th>
                                <th className="p-5 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredInvoices.map((inv) => {
                                const age = getInvoiceAge(inv.dateCreated);
                                return (
                                    <tr key={inv.id} className="hover:bg-blue-50 transition group">
                                        <td className="p-5">
                                            <div className="font-bold text-[#0B1F3A]">{inv.fileName}</div>
                                            <div className="text-[11px] text-gray-400">{inv.relatedFile}</div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <span className={`text-xs font-bold ${age > 30 && !inv.isPaid ? 'text-red-600' : 'text-gray-400'}`}>
                                                {inv.isPaid ? '-' : `${age} Days`}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right text-sm font-medium">{formatCurrency(inv.amountBilled)}</td>
                                        <td className="p-5 text-right">
                                            <span className={`text-sm font-black ${inv.balance > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                                                {formatCurrency(inv.balance)}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex justify-center items-center gap-3">
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-lg ${inv.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                                    {inv.isPaid ? 'PAID' : 'PENDING'}
                                                </span>
                                                <div className="hidden group-hover:flex gap-2">
                                                    <button onClick={() => { 
                                                        setIsEditing(true); 
                                                        setEditingId(inv.id); 
                                                        setFileName(inv.fileName); 
                                                        setAmountBilled(inv.amountBilled); 
                                                        setAmountPaid(inv.amountPaid); 
                                                        setRelatedFile(inv.relatedFile); 
                                                    }} className="text-blue-600 hover:text-blue-800 text-xs font-bold underline">Edit</button>
                                                    <button onClick={() => deleteInvoice(inv.id)} className="text-red-300 hover:text-red-600 text-xs font-bold">×</button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredInvoices.length === 0 && (
                  <div className="p-20 text-center text-gray-300 italic font-medium">
                    No ledger entries match your criteria.
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Invoices;