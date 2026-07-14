import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import type { Requisition } from "../context/AppContext";

export default function Requisitions() {
  const navigate = useNavigate();
  const { currentUser, users, requisitions, addRequisition, updateRequisition, sendNotification, courtCases, transactions, letters } = useAppContext();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [relatedFileId, setRelatedFileId] = useState("");
  const [relatedFileType, setRelatedFileType] = useState<any>("");
  const [relatedFileName, setRelatedFileName] = useState("");

  const myCases = useMemo(() => courtCases.filter(c => !c.archived && c.lawyerId === currentUser?.id), [courtCases, currentUser]);
  const myTransactions = useMemo(() => transactions.filter(t => !t.archived && t.lawyerId === currentUser?.id), [transactions, currentUser]);
  const myLetters = useMemo(() => letters.filter(l => !l.archived && l.lawyerId === currentUser?.id), [letters, currentUser]);

  const isManager = currentUser?.role === "manager";
  const isAccountant = currentUser?.role === "accountant";
  const isAdmin = currentUser?.role === "admin";
  const isManagingPartner = currentUser?.role === "managing_partner";
  
  const canApprove = isManagingPartner || isAdmin;
  const canPay = isAccountant || isAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const newReq: Requisition = {
      id: crypto.randomUUID(),
      title,
      amount: Number(amount),
      status: "Pending",
      submittedById: currentUser.id,
      submittedByName: currentUser.name,
      dateSubmitted: new Date().toISOString(),
      notes,
      relatedFileId,
      relatedFileType,
      relatedFileName
    };

    await addRequisition(newReq);

    // Notify managing partners and admins about the new requisition
    users.filter(u => u.role === 'managing_partner' || u.role === 'admin').forEach(m => {
      if (m.id !== currentUser.id) {
        sendNotification(m.id, `New Requisition from ${currentUser.name}: "${title}" for UGX ${amount}`, 'alert', newReq.id, 'requisition');
      }
    });

    setShowModal(false);
    setTitle("");
    setAmount("");
    setNotes("");
    setRelatedFileId("");
    setRelatedFileType("");
    setRelatedFileName("");
    setFileSearch("");
    setIsFileDropdownOpen(false);
  };

  const handleApprove = async (id: string) => {
    if (!currentUser) return;
    const req = requisitions.find(r => r.id === id);
    if (!req) return;

    await updateRequisition(id, {
      status: "Approved",
      approvedById: currentUser.id,
      approvedByName: currentUser.name,
      dateApproved: new Date().toISOString()
    });

    sendNotification(req.submittedById, `Your requisition "${req.title}" has been approved!`, 'alert', req.id);

    // Notify accountants
    users.filter(u => u.role === 'accountant').forEach(a => {
      sendNotification(a.id, `Requisition "${req.title}" approved and ready for payment.`, 'alert', req.id);
    });
  };

  const handleReject = async (id: string) => {
    if (!currentUser) return;
    const req = requisitions.find(r => r.id === id);
    if (!req) return;

    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;

    await updateRequisition(id, {
      status: "Rejected",
      rejectionReason: reason
    });

    sendNotification(req.submittedById, `Your requisition "${req.title}" was rejected. Reason: ${reason}`, 'alert', req.id);
  };

  const handleMarkPaid = async (id: string) => {
    if (!currentUser) return;
    const req = requisitions.find(r => r.id === id);
    if (!req) return;

    await updateRequisition(id, {
      status: "Paid",
      paidById: currentUser.id,
      paidByName: currentUser.name,
      datePaid: new Date().toISOString()
    });

    sendNotification(req.submittedById, `Your requisition "${req.title}" has been paid by the accountant.`, 'alert', req.id);
  };

  const visibleRequisitions = useMemo(() => {
    let list = requisitions || [];
    
    // Ordinary users only see theirs.
    if (!canApprove && !canPay && !isManager) {
      list = list.filter(r => r.submittedById === currentUser?.id);
    } else if (isManager || isManagingPartner) {
      // Managers and Managing Partner only see history for a week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      list = list.filter(r => {
        // Always show pending requisitions so they never miss approval
        if (r.status === "Pending") return true;
        // Hide processed requisitions after 7 days
        const actionDate = r.datePaid || r.dateApproved || r.dateSubmitted;
        return new Date(actionDate) >= oneWeekAgo;
      });
    }
    // Accountants and Admins see everything forever.

    return list.sort((a, b) => new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime());
  }, [requisitions, canApprove, canPay, isManager, isManagingPartner, currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Approved": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Paid": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8" style={{ fontFamily: '"Arial Narrow", Arial, sans-serif' }}>
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 text-sm font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          ← Back
        </button>
      </div>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Requisitions</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Submit and track requests for funds.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors">
            + New Requisition
          </button>
        </div>
      </header>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4">Date</th>
                <th className="p-4">Title</th>
                <th className="p-4">Submitted By</th>
                <th className="p-4 text-right">Amount (UGX)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {visibleRequisitions.length > 0 ? visibleRequisitions.map(req => (
                <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-600 whitespace-nowrap">{new Date(req.dateSubmitted).toLocaleDateString()}</td>
                  <td className="p-4 text-slate-800 font-bold">
                    {req.title}
                    {req.relatedFileName && (
                      <p className="text-xs text-blue-600 truncate mt-1">⚖️ {req.relatedFileName}</p>
                    )}
                  </td>
                  <td className="p-4 text-slate-600">{req.submittedByName}</td>
                  <td className="p-4 text-right font-black text-slate-800">{req.amount.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                    {req.status === "Rejected" && req.rejectionReason && (
                      <p className="text-[10px] text-red-500 mt-1 truncate max-w-[150px]" title={req.rejectionReason}>{req.rejectionReason}</p>
                    )}
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    {req.status === "Pending" && canApprove && (
                      <>
                        <button onClick={() => handleApprove(req.id)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase mr-3">Approve</button>
                        <button onClick={() => handleReject(req.id)} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase">Reject</button>
                      </>
                    )}
                    {req.status === "Approved" && canPay && (
                      <button onClick={() => handleMarkPaid(req.id)} className="text-emerald-600 hover:text-emerald-800 font-bold text-xs uppercase">Mark Paid</button>
                    )}
                    {req.status === "Pending" && req.submittedById === currentUser?.id && !canApprove && (
                      <span className="text-slate-400 italic text-xs">Waiting...</span>
                    )}
                    {req.status === "Approved" && !canPay && (
                      <span className="text-slate-400 italic text-xs">Awaiting Payment</span>
                    )}
                    {req.status === "Paid" && (
                      <span className="text-slate-400 italic text-xs">Completed</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-medium italic">No requisitions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {visibleRequisitions.length > 0 ? visibleRequisitions.map(req => (
            <div key={req.id} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{req.title}</h3>
                  {req.relatedFileName && (
                    <p className="text-xs text-blue-600 truncate mt-0.5">⚖️ {req.relatedFileName}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">{new Date(req.dateSubmitted).toLocaleDateString()} • {req.submittedByName}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-slate-800 text-sm">UGX {req.amount.toLocaleString()}</div>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              </div>

              {req.status === "Rejected" && req.rejectionReason && (
                <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                  <p className="text-[10px] text-red-600 font-medium">Reason: {req.rejectionReason}</p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                {req.status === "Pending" && canApprove && (
                  <>
                    <button onClick={() => handleApprove(req.id)} className="text-blue-600 hover:text-blue-800 font-bold text-[11px] uppercase bg-blue-50 px-3 py-1.5 rounded-lg">Approve</button>
                    <button onClick={() => handleReject(req.id)} className="text-red-500 hover:text-red-700 font-bold text-[11px] uppercase bg-red-50 px-3 py-1.5 rounded-lg">Reject</button>
                  </>
                )}
                {req.status === "Approved" && canPay && (
                  <button onClick={() => handleMarkPaid(req.id)} className="text-emerald-600 hover:text-emerald-800 font-bold text-[11px] uppercase bg-emerald-50 px-3 py-1.5 rounded-lg">Mark Paid</button>
                )}
                {req.status === "Pending" && req.submittedById === currentUser?.id && !canApprove && (
                  <span className="text-slate-400 italic text-[11px]">Waiting...</span>
                )}
                {req.status === "Approved" && !canPay && (
                  <span className="text-slate-400 italic text-[11px]">Awaiting Payment</span>
                )}
                {req.status === "Paid" && (
                  <span className="text-slate-400 italic text-[11px]">Completed</span>
                )}
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-slate-400 font-medium italic text-sm">No requisitions found.</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase transition-colors">
                Cancel
              </button>
              <h3 className="text-lg font-black text-slate-800">New Requisition</h3>
              <div className="w-10"></div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Title / Purpose</label>
                <input required autoFocus className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g. Transport to Court" />
              </div>

              <div className="group relative z-40">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Link Personal File (Optional)</label>
                <div className="relative">
                  <div
                    onClick={() => setIsFileDropdownOpen(!isFileDropdownOpen)}
                    className={`w-full bg-slate-50/50 border ${isFileDropdownOpen ? "border-blue-500 ring-4 ring-blue-500/10" : "border-slate-200"} p-3.5 pl-10 rounded-xl font-bold text-sm text-slate-800 transition-all shadow-sm cursor-pointer flex justify-between items-center`}
                  >
                    <span className="truncate">{relatedFileName || "-- General Requisition --"}</span>
                    <span className={`text-slate-400 text-xs transition-transform ${isFileDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📎</span>
                  </div>

                  {isFileDropdownOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden max-h-72">
                      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                          <input
                            autoFocus type="text" placeholder="Search your files..."
                            className="w-full bg-white border border-slate-200 p-3 pl-9 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                            value={fileSearch} onChange={e => setFileSearch(e.target.value)} onClick={e => e.stopPropagation()}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                        </div>
                      </div>

                      <div className="overflow-y-auto p-2 space-y-1" onClick={e => e.stopPropagation()}>
                        <button type="button" className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition ${!relatedFileId ? "bg-slate-100 text-slate-700" : "text-slate-500"}`}
                          onClick={() => { setRelatedFileId(""); setRelatedFileType(""); setRelatedFileName(""); setIsFileDropdownOpen(false); setFileSearch(""); }}
                        >
                          ❌ No File Linked
                        </button>

                        {myCases.filter(c => c.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                          <div className="pt-2">
                            <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Court Cases</p>
                            {myCases.filter(c => c.fileName.toLowerCase().includes(fileSearch.toLowerCase())).map(c => (
                              <button type="button" key={`case-${c.id}`} className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center gap-2 ${relatedFileId === c.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                onClick={() => { setRelatedFileId(c.id); setRelatedFileType("case"); setRelatedFileName(c.fileName); setIsFileDropdownOpen(false); setFileSearch(""); }}
                              >
                                <span className="text-sm">⚖️</span> {c.fileName}
                              </button>
                            ))}
                          </div>
                        )}

                        {myTransactions.filter(t => t.fileName.toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                          <div className="pt-2">
                            <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Transactions</p>
                            {myTransactions.filter(t => t.fileName.toLowerCase().includes(fileSearch.toLowerCase())).map(t => (
                              <button type="button" key={`tx-${t.id}`} className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center gap-2 ${relatedFileId === t.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                onClick={() => { setRelatedFileId(t.id); setRelatedFileType("transaction"); setRelatedFileName(t.fileName); setIsFileDropdownOpen(false); setFileSearch(""); }}
                              >
                                <span className="text-sm">💼</span> {t.fileName}
                              </button>
                            ))}
                          </div>
                        )}

                        {myLetters.filter(l => l.subject.toLowerCase().includes(fileSearch.toLowerCase())).length > 0 && (
                          <div className="pt-2">
                            <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Letters</p>
                            {myLetters.filter(l => l.subject.toLowerCase().includes(fileSearch.toLowerCase())).map(l => (
                              <button type="button" key={`letter-${l.id}`} className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center gap-2 ${relatedFileId === l.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                onClick={() => { setRelatedFileId(l.id); setRelatedFileType("letter"); setRelatedFileName(l.subject); setIsFileDropdownOpen(false); setFileSearch(""); }}
                              >
                                <span className="text-sm">✉️</span> {l.subject}
                              </button>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                  {isFileDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsFileDropdownOpen(false)} />}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Amount (UGX)</label>
                <input required type="number" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Additional Notes</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra details..." />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-xs transition-colors shadow-md">
                Submit Requisition
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
