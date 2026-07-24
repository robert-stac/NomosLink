import React, { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabaseClient";
import { buildExpenseForDb } from "../utils/expenseUtils";

const Invoices: React.FC = () => {
  const {
    transactions, courtCases, letters, invoices, addInvoice, updateInvoice, deleteInvoice,
    uploadInvoiceScan, setExpenses, expenses, currentUser
  } = useAppContext();

  /* ===== FORM STATE ===== */
  const [showForm, setShowForm] = useState(false);
  const [fileName, setFileName] = useState("");
  const [relatedFile, setRelatedFile] = useState("");
  const [relatedFileId, setRelatedFileId] = useState("");
  const [amountBilled, setAmountBilled] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [includeVAT, setIncludeVAT] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [matterSearchTerm, setMatterSearchTerm] = useState("");
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);

  /* ===== FILTER STATE ===== */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  /* ===== PARTIAL PAYMENT MODAL ===== */
  const [partialInvoice, setPartialInvoice] = useState<any>(null);
  const [partialAmount, setPartialAmount] = useState<number>(0);

  const VAT_RATE = 0.18;

  const allFiles = useMemo(() => {
    const cases = (courtCases || []).map((c) => ({ label: `⚖️ ${c.fileName}`, value: c.fileName, id: c.id }));
    const trans = (transactions || []).map((t) => ({ label: `💳 ${t.fileName}`, value: t.fileName, id: t.id }));
    const lets = (letters || []).map((l) => ({ label: `✉️ ${l.subject}`, value: l.subject, id: l.id }));
    return [...cases, ...trans, ...lets].filter(item => item.value);
  }, [courtCases, transactions, letters]);

  const filteredMatters = useMemo(() => {
    if (!matterSearchTerm.trim()) return allFiles;
    const term = matterSearchTerm.toLowerCase();
    return allFiles.filter(f => f.label.toLowerCase().includes(term) || f.value.toLowerCase().includes(term));
  }, [allFiles, matterSearchTerm]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.relatedFile.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === "All" ? true :
          filterStatus === "Paid" ? inv.isPaid : !inv.isPaid;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, filterStatus]);

  const formatCurrency = (n: number) => "UGX " + Math.round(n).toLocaleString();

  const getInvoiceAge = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const resetForm = () => {
    setFileName(""); setRelatedFile(""); setRelatedFileId(""); setAmountBilled(0); setAmountPaid(0);
    setIsEditing(false); setEditingId(null); setScannedFile(null); setMatterSearchTerm(""); setShowMatterDropdown(false);
    setShowForm(false);
  };

  /* Post a "Money In" expense entry to the expenses ledger */
  const postToExpenses = async (inv: any, amount: number, note: string) => {
    const exp: any = {
      id: crypto.randomUUID(),
      type: "in",
      date: new Date().toISOString().split("T")[0],
      amount: Math.round(amount),
      purpose: `${note} — Invoice ${inv.fileName}`,
      description: `${note} — Invoice ${inv.fileName}`,
      category: "Legal fees",
      relatedFileId: inv.relatedFileId || "",
      relatedFileName: inv.relatedFile || "",
      staffId: currentUser?.id || "",
      staffName: currentUser?.name || "",
      createdBy: currentUser?.id || "",
    };
    setExpenses((prev: any[]) => [...(prev || []), exp]);
    if (navigator.onLine) {
      const dbExp = buildExpenseForDb(exp);
      const { error } = await supabase.from("expenses").upsert([dbExp], { onConflict: "id" });
      if (error) console.error("Failed to post income to expenses:", error.message);
    }
  };

  /* Mark fully paid */
  const handleMarkPaid = async (inv: any) => {
    if (!window.confirm(`Mark invoice ${inv.fileName} as fully paid (${formatCurrency(inv.balance)} remaining)?`)) return;
    const updated = { ...inv, amountPaid: inv.amountBilled, balance: 0, isPaid: true };
    updateInvoice(updated);
    await postToExpenses(inv, inv.balance, "Full payment received");
  };

  /* Record partial payment */
  const handlePartialSubmit = async () => {
    if (!partialInvoice || partialAmount <= 0) return;
    const remaining = partialInvoice.balance;
    const payment = Math.min(partialAmount, remaining);
    const newPaid = (partialInvoice.amountPaid || 0) + payment;
    const newBalance = partialInvoice.amountBilled - newPaid;
    const updated = { ...partialInvoice, amountPaid: newPaid, balance: newBalance, isPaid: newBalance <= 0 };
    updateInvoice(updated);
    await postToExpenses(partialInvoice, payment, "Partial payment received");
    setPartialInvoice(null);
    setPartialAmount(0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return alert("Please enter an Invoice Reference number.");
    if (!relatedFile) return alert("Please select a related matter.");
    if (amountBilled <= 0) return alert("Amount Billed must be greater than 0.");

    const billed = Number(amountBilled);
    const paid = Number(amountPaid) || 0;
    const finalId = isEditing && editingId ? editingId : `INV-${Date.now()}`;

    const payload: any = {
      id: finalId, fileName: fileName.trim(), relatedFile, relatedFileId,
      amountBilled: billed, amountPaid: paid, balance: billed - paid, isPaid: paid >= billed,
      dateCreated: isEditing
        ? (invoices.find(i => i.id === editingId)?.dateCreated || new Date().toISOString().split("T")[0])
        : new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 12096e5).toISOString().split("T")[0],
    };

    if (isEditing) updateInvoice(payload); else addInvoice(payload);

    if (scannedFile) {
      setIsUploading(true);
      try { await uploadInvoiceScan(finalId, scannedFile); } catch { alert("Saved, but scan upload failed."); } finally { setIsUploading(false); }
    }
    resetForm();
  };

  const handleEdit = (inv: any) => {
    setIsEditing(true); setEditingId(inv.id); setFileName(inv.fileName);
    setAmountBilled(inv.amountBilled); setAmountPaid(inv.amountPaid);
    setRelatedFile(inv.relatedFile); setRelatedFileId(inv.relatedFileId || "");
    setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalReceivables = invoices.reduce((s, i) => s + i.balance, 0);
  const collectionRate = invoices.length > 0
    ? Math.round((invoices.reduce((s, i) => s + i.amountPaid, 0) / invoices.reduce((s, i) => s + i.amountBilled, 0)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-8 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black text-[#0B1F3A] tracking-tight">Invoices</h1>
          <p className="text-gray-500 font-medium">Buwembo & Company Advocates • Invoice Management</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right border-r pr-6">
            <p className="text-[10px] uppercase text-gray-400 font-bold">Total Receivables</p>
            <p className="text-2xl font-bold text-[#0B1F3A]">{formatCurrency(totalReceivables)}</p>
          </div>
          <div className="text-right border-r pr-6">
            <p className="text-[10px] uppercase text-gray-400 font-bold">Collection Rate</p>
            <p className="text-2xl font-bold text-green-600">{collectionRate}%</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-[#0B1F3A] text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg hover:bg-blue-900 transition-all"
          >
            + New Invoice
          </button>
        </div>
      </div>

      {/* CREATE/EDIT FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative">
            <button onClick={resetForm} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold">×</button>
            <h2 className="text-xl font-black text-[#0B1F3A] mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#0B1F3A] rounded-full"></span>
              {isEditing ? "Edit Invoice" : "New Invoice"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Invoice Ref #</label>
                <input className="w-full bg-gray-50 border-none p-3 rounded-xl focus:ring-2 focus:ring-[#0B1F3A] outline-none" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="e.g. BCA/2026/042" required />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Link to Matter</label>
                <div className="relative" data-matter-search>
                  <input
                    type="text"
                    placeholder="Search case / transaction / letter..."
                    className="w-full bg-gray-50 border-none p-3 rounded-xl focus:ring-2 focus:ring-[#0B1F3A] outline-none"
                    value={relatedFile || matterSearchTerm}
                    onChange={e => { setMatterSearchTerm(e.target.value); setRelatedFile(""); setShowMatterDropdown(true); }}
                    onFocus={() => setShowMatterDropdown(true)}
                    required
                  />
                  {showMatterDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
                      {filteredMatters.length > 0 ? filteredMatters.map((f, i) => (
                        <button key={i} type="button"
                          onClick={() => { setRelatedFile(f.value); setRelatedFileId(f.id); setMatterSearchTerm(""); setShowMatterDropdown(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 text-sm font-semibold text-[#0B1F3A]"
                        >{f.label}</button>
                      )) : <div className="px-4 py-3 text-sm text-gray-400 italic">No matters found</div>}
                    </div>
                  )}
                  {relatedFile && (
                    <button type="button" onClick={() => { setRelatedFile(""); setRelatedFileId(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold">✕</button>
                  )}
                </div>
              </div>

              <div className="bg-[#0B1F3A]/5 p-4 rounded-xl border border-[#0B1F3A]/10">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-[#0B1F3A] uppercase">Amount</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500">Include VAT (18%)</span>
                    <input type="checkbox" checked={includeVAT} onChange={e => setIncludeVAT(e.target.checked)} />
                  </div>
                </div>
                <input type="number" className="w-full bg-white border-none p-3 rounded-lg text-lg font-bold" value={amountBilled || ""} onChange={e => setAmountBilled(Number(e.target.value))} placeholder="Total Gross Amount" />
                {includeVAT && amountBilled > 0 && (
                  <div className="text-[11px] text-gray-500 mt-2 space-y-1">
                    <div className="flex justify-between"><span>Professional Fees:</span><span>{formatCurrency(amountBilled / 1.18)}</span></div>
                    <div className="flex justify-between font-bold text-[#0B1F3A]"><span>VAT (18%):</span><span>{formatCurrency(amountBilled - amountBilled / 1.18)}</span></div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Payment Received (if any)</label>
                <input type="number" className="w-full bg-gray-50 border-none p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={amountPaid || ""} onChange={e => setAmountPaid(Number(e.target.value))} placeholder="0" />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-1">Attach Scanned Invoice</label>
                <label className={`flex items-center justify-between w-full p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${scannedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}`}>
                  <span className={`text-[11px] font-bold ${scannedFile ? 'text-blue-700' : 'text-gray-400'}`}>{scannedFile ? `📎 ${scannedFile.name}` : "Click to select scan (PDF/Image)"}</span>
                  <span className="text-xl">📄</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setScannedFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={isUploading}
                  className="flex-1 bg-[#0B1F3A] text-white font-black py-4 rounded-xl shadow hover:shadow-xl transition-all disabled:opacity-50">
                  {isUploading ? "Uploading..." : isEditing ? "Update Invoice" : "Post Invoice"} 🚀
                </button>
                <button type="button" onClick={resetForm} className="px-5 py-4 rounded-xl border border-gray-200 text-gray-400 font-bold hover:bg-gray-50 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARTIAL PAYMENT MODAL */}
      {partialInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
            <h3 className="text-lg font-black text-[#0B1F3A] mb-2">Record Partial Payment</h3>
            <p className="text-sm text-gray-500 mb-1">Invoice: <span className="font-bold text-[#0B1F3A]">{partialInvoice.fileName}</span></p>
            <p className="text-sm text-gray-500 mb-6">Outstanding: <span className="font-bold text-red-600">{formatCurrency(partialInvoice.balance)}</span></p>
            <label className="block text-xs font-black text-gray-400 uppercase mb-1">Payment Amount</label>
            <input
              type="number"
              className="w-full bg-gray-50 border-none p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-lg font-bold mb-6"
              placeholder="Enter amount received"
              value={partialAmount || ""}
              onChange={e => setPartialAmount(Number(e.target.value))}
              max={partialInvoice.balance}
            />
            <div className="flex gap-3">
              <button onClick={handlePartialSubmit} disabled={partialAmount <= 0}
                className="flex-1 bg-green-600 text-white font-black py-3 rounded-xl hover:bg-green-700 transition disabled:opacity-40">
                ✅ Record Payment
              </button>
              <button onClick={() => { setPartialInvoice(null); setPartialAmount(0); }}
                className="px-5 py-3 rounded-xl border border-gray-200 text-gray-400 font-bold hover:bg-gray-50 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
        <input type="text" placeholder="Search reference or matter..." className="flex-1 min-w-[200px] bg-gray-50 border-none p-3 rounded-lg text-sm focus:ring-2 focus:ring-[#0B1F3A] outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <select className="bg-gray-50 border-none p-3 rounded-lg text-sm font-bold text-[#0B1F3A] outline-none cursor-pointer" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Paid">Paid Only</option>
          <option value="Pending">Unpaid / Pending</option>
        </select>
        <span className="text-xs font-bold text-gray-400">{filteredInvoices.length} entries</span>
      </div>

      {/* INVOICE TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b bg-white">
          <h3 className="text-lg font-bold text-[#0B1F3A]">Accounts Receivable Aging</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="p-5">Matter & Ref</th>
                <th className="p-5 text-right">Age</th>
                <th className="p-5 text-right">Billed</th>
                <th className="p-5 text-right">Paid</th>
                <th className="p-5 text-right">Outstanding</th>
                <th className="p-5 text-center">Status & Actions</th>
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
                      <div className="text-[10px] text-gray-300 mt-0.5">{inv.dateCreated}</div>
                    </td>
                    <td className="p-5 text-right">
                      <span className={`text-xs font-bold ${age > 30 && !inv.isPaid ? 'text-red-600' : 'text-gray-400'}`}>
                        {inv.isPaid ? '—' : `${age}d`}
                      </span>
                    </td>
                    <td className="p-5 text-right text-sm font-medium">{formatCurrency(inv.amountBilled)}</td>
                    <td className="p-5 text-right text-sm font-medium text-green-600">{formatCurrency(inv.amountPaid || 0)}</td>
                    <td className="p-5 text-right">
                      <span className={`text-sm font-black ${inv.balance > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                        {formatCurrency(inv.balance)}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg ${inv.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {inv.isPaid ? 'PAID' : 'PENDING'}
                        </span>
                        {/* Action buttons — always visible */}
                        <div className="flex flex-wrap gap-1 justify-center">
                          {!inv.isPaid && (
                            <>
                              <button
                                onClick={() => handleMarkPaid(inv)}
                                className="bg-green-500 hover:bg-green-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-colors"
                                title="Mark as fully paid"
                              >✅ Paid</button>
                              <button
                                onClick={() => { setPartialInvoice(inv); setPartialAmount(0); }}
                                className="bg-amber-400 hover:bg-amber-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-colors"
                                title="Record partial payment"
                              >💰 Partial</button>
                            </>
                          )}
                          {inv.scannedInvoiceUrl && (
                            <a href={inv.scannedInvoiceUrl} target="_blank" rel="noreferrer"
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-colors">👁️ View</a>
                          )}
                          <button
                            onClick={() => handleEdit(inv)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-colors"
                          >✏️ Edit</button>
                          <button
                            onClick={() => { if (window.confirm("Delete this invoice permanently?")) deleteInvoice(inv.id); }}
                            className="bg-red-50 hover:bg-red-100 text-red-500 text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-colors"
                          >🗑️ Delete</button>
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
          <div className="p-20 text-center text-gray-300 italic font-medium">No ledger entries match your criteria.</div>
        )}
      </div>
    </div>
  );
};

export default Invoices;