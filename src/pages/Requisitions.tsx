import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabaseClient";
import type { Requisition } from "../context/AppContext";

export default function Requisitions() {
  const navigate = useNavigate();
  const { currentUser, users, requisitions, addRequisition, updateRequisition, sendNotification, courtCases, transactions, letters, clients } = useAppContext();
  const { deleteRequisition } = useAppContext();

  const handleNavigate = (type: string, id: string) => {
    if (!type || !id) return;
    if (type === 'case') navigate(`/lawyer/cases/${id}`);
    else if (type === 'transaction') navigate(`/lawyer/transactions/${id}`);
    else if (type === 'letter') navigate(`/lawyer/letters/${id}`);
  };

  const [showModal, setShowModal] = useState(false);
  
  // Approval Modal State
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalReq, setApprovalReq] = useState<Requisition | null>(null);
  const [approvalAmount, setApprovalAmount] = useState("");
  const [approvalReductionReason, setApprovalReductionReason] = useState("");

  // Rejection Modal State
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReq, setRejectionReq] = useState<Requisition | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Acknowledgement Modal State
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackReq, setAckReq] = useState<Requisition | null>(null);
  const [ackAmount, setAckAmount] = useState("");
  const [ackNote, setAckNote] = useState("");

  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");

  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [relatedFileId, setRelatedFileId] = useState("");
  const [relatedFileType, setRelatedFileType] = useState<any>("");
  const [relatedFileName, setRelatedFileName] = useState("");
  // Reporting filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRequesterId, setFilterRequesterId] = useState("");
  const [filterAcknowledgement, setFilterAcknowledgement] = useState("");
  const [filterFileName, setFilterFileName] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  // UI sections: Pending / Approved / Paid
  const [activeTab, setActiveTab] = useState<'all'|'pending'|'approved'|'paid'>('all');
  // Paid subview: awaiting acknowledgement / acknowledged / all
  const [paidView, setPaidView] = useState<'awaiting'|'acknowledged'|'all'>('awaiting');
  const [presets, setPresets] = useState<Array<any>>([]);
  const [selectedPreset, setSelectedPreset] = useState("");

  const availableCases = useMemo(() => courtCases, [courtCases]);
  const availableTransactions = useMemo(() => transactions, [transactions]);
  const availableLetters = useMemo(() => letters, [letters]);

  const filteredCasesForDropdown = useMemo(() => {
    return availableCases.filter(c => {
      if (c.archived) return false;
      const searchLower = fileSearch.toLowerCase();
      const nameMatch = (c.fileName || "").toLowerCase().includes(searchLower);
      const clientName = c.clientId ? clients.find(cl => cl.id === c.clientId)?.name || "" : "";
      const clientMatch = clientName.toLowerCase().includes(searchLower);
      const detailsMatch = (c.details || "").toLowerCase().includes(searchLower);
      return nameMatch || clientMatch || detailsMatch;
    }).sort((a, b) => (a.fileName || "").localeCompare(b.fileName || ""));
  }, [availableCases, fileSearch, clients]);

  const filteredTransactionsForDropdown = useMemo(() => {
    return availableTransactions.filter(t => {
      if (t.archived) return false;
      const searchLower = fileSearch.toLowerCase();
      const nameMatch = (t.fileName || "").toLowerCase().includes(searchLower);
      const clientName = t.clientId ? clients.find(cl => cl.id === t.clientId)?.name || "" : "";
      const clientMatch = clientName.toLowerCase().includes(searchLower);
      return nameMatch || clientMatch;
    }).sort((a, b) => (a.fileName || "").localeCompare(b.fileName || ""));
  }, [availableTransactions, fileSearch, clients]);

  const filteredLettersForDropdown = useMemo(() => {
    return availableLetters.filter(l => {
      if (l.archived) return false;
      const searchLower = fileSearch.toLowerCase();
      const subjectMatch = (l.subject || "").toLowerCase().includes(searchLower);
      const recipientMatch = (l.recipient || "").toLowerCase().includes(searchLower);
      const clientName = l.clientId ? clients.find(cl => cl.id === l.clientId)?.name || "" : "";
      const clientMatch = clientName.toLowerCase().includes(searchLower);
      return subjectMatch || recipientMatch || clientMatch;
    }).sort((a, b) => (a.subject || "").localeCompare(b.subject || ""));
  }, [availableLetters, fileSearch, clients]);

  const isManager = currentUser?.role === "manager";
  const isAccountant = currentUser?.role === "accountant";
  const isAdmin = currentUser?.role === "admin";
  const isManagingPartner = currentUser?.role === "managing_partner";

  const canApprove = isManagingPartner || isAdmin;
  const canPay = isAccountant || isAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!category) { alert('Please select a category for the requisition.'); return; }

    if (editingReqId) {
      await updateRequisition(editingReqId, {
        title,
        amount: Number(amount),
        category,
        notes,
        relatedFileId,
        relatedFileType,
        relatedFileName
      });
    } else {
      const newReq: Requisition = {
        id: crypto.randomUUID(),
        title,
        amount: Number(amount),
        category,
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
          sendNotification(m.id, `New Requisition from ${currentUser.name}: "${title}" for UGX ${amount} (Category: ${category})`, 'alert', newReq.id, 'requisition');
        }
      });

      // Telegram Fallback Notification (WhatsApp style)
      const telegramBotToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      const telegramChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
      if (telegramBotToken && telegramChatId) {
        const text = `🚨 *New Requisition Pending*\n\n*From:* ${currentUser.name}\n*File Name:* ${relatedFileName || 'N/A'}\n*Category:* ${category}\n*Details:* ${notes || title}\n*Amount:* UGX ${Number(amount).toLocaleString()}\n\n_Please review in the NomosLink app._`;
        fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: telegramChatId, text: text, parse_mode: 'Markdown' })
        }).catch(e => console.error("Telegram error:", e));
      }
    }

    setShowModal(false);
    setTitle("");
    setAmount("");
    setCategory("");
    setNotes("");
    setRelatedFileId("");
    setRelatedFileType("");
    setRelatedFileName("");
    setFileSearch("");
    setIsFileDropdownOpen(false);
    setEditingReqId(null);
  };

  const openApprovalModal = (id: string) => {
    const req = requisitions.find(r => r.id === id);
    if (!req) return;
    setApprovalReq(req);
    setApprovalAmount(req.amount.toString());
    setApprovalReductionReason("");
    setShowApprovalModal(true);
  };

  const openRejectionModal = (id: string) => {
    const req = requisitions.find(r => r.id === id);
    if (!req) return;
    setRejectionReq(req);
    setRejectionReason("");
    setShowRejectionModal(true);
  };

  const submitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !approvalReq) return;
    
    const approvedAmount = Number(approvalAmount);
    if (isNaN(approvedAmount) || approvedAmount < 0) {
      alert("Invalid amount entered. Please enter a valid number.");
      return;
    }

    if (approvedAmount < approvalReq.amount && !approvalReductionReason.trim()) {
      alert("Please provide a reason for reducing the requested amount.");
      return;
    }

    const req = approvalReq;
    const id = req.id;

    setShowApprovalModal(false);
    setApprovalReq(null);

    await updateRequisition(id, {
      status: "Approved",
      amount: approvedAmount,
      approvedById: currentUser.id,
      approvedByName: currentUser.name,
      dateApproved: new Date().toISOString(),
      ...(approvedAmount < req.amount ? { rejectionReason: `Amount reduced: ${approvalReductionReason}` } : {})
    });

    const amountMsg = approvedAmount !== req.amount ? `UGX ${approvedAmount.toLocaleString()} (changed from UGX ${req.amount.toLocaleString()})` : `UGX ${approvedAmount.toLocaleString()}`;
    const reductionMsg = approvedAmount < req.amount ? ` Reason: ${approvalReductionReason}` : "";

    sendNotification(req.submittedById, `Your requisition "${req.title}" has been approved for ${amountMsg}!${reductionMsg}`, 'alert', req.id);

    // Notify accountants
    users.filter(u => u.role === 'accountant').forEach(a => {
      sendNotification(a.id, `Requisition "${req.title}" approved and ready for payment of ${amountMsg}. (Category: ${req.category || 'N/A'})`, 'alert', req.id);
    });

    // Send individual Telegram notifications to accountants with Telegram IDs
    if (currentUser.role === 'managing_partner') {
      const telegramBotToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

      if (telegramBotToken) {
        try {
          // Fetch latest accountant records from Supabase to pick up any new telegramId values
          const { data: accountantsFromDb, error: usersError } = await supabase
            .from('users')
            .select('id, name, telegramid')
            .eq('role', 'accountant')
            .not('telegramid', 'is', null)
            .neq('telegramid', '')
            .order('name', { ascending: true });

          if (usersError) console.error('Failed to fetch accountants for Telegram notifications:', usersError.message);

          const accountantsWithTelegram = Array.isArray(accountantsFromDb) ? accountantsFromDb : [];

          if (accountantsWithTelegram.length > 0) {
            const text = `✅ *Requisition Approved by Managing Partner*\n\n*From:* ${req.submittedByName || 'Staff'}\n*File Name:* ${req.relatedFileName || 'N/A'}\n*Category:* ${req.category || 'N/A'}\n*Details:* ${req.notes || req.title}\n*Approved Amount:* UGX ${approvedAmount.toLocaleString()}${approvedAmount !== req.amount ? `\n_Note: Changed from original request of UGX ${req.amount.toLocaleString()}_` : ''}\n\n_Please process payment._`;

            accountantsWithTelegram.forEach((accountant: any) => {
              const chatId = accountant.telegramid || accountant.telegramId || accountant.telegram_id;
              if (!chatId) return;
              fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
              }).catch(e => console.error('Telegram error:', e));
            });
          } else {
            console.log('[Requisitions] No accountants with telegramId found to notify via Telegram.');
          }
        } catch (e) {
          console.error('[Requisitions] Error sending Telegram notifications:', e);
        }
      }
    }
  };

  const submitRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !rejectionReq) return;
    
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejecting this requisition.");
      return;
    }

    const reqId = rejectionReq.id;
    const submittedById = rejectionReq.submittedById;
    const title = rejectionReq.title;

    setShowRejectionModal(false);
    setRejectionReq(null);

    await updateRequisition(reqId, {
      status: "Rejected",
      rejectionReason: rejectionReason,
      approvedById: currentUser.id,
      approvedByName: currentUser.name,
      dateApproved: new Date().toISOString()
    });

    sendNotification(submittedById, `Your requisition "${title}" was rejected. Reason: ${rejectionReason}`, 'alert', reqId);
  };

  const openAckModal = (id: string) => {
    const req = requisitions.find(r => r.id === id);
    if (!req) return;
    setAckReq(req);
    setAckAmount((req.amount || 0).toString());
    setAckNote("");
    setShowAckModal(true);
  };

  const submitAcknowledgement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !ackReq) return;

    const amt = Number(ackAmount);
    if (isNaN(amt) || amt < 0) { alert('Invalid amount'); return; }

    const id = ackReq.id;
    setShowAckModal(false);
    setAckReq(null);

    await updateRequisition(id, {
      acknowledgedById: currentUser.id,
      acknowledgedByName: currentUser.name,
      acknowledgedAt: new Date().toISOString(),
      acknowledgeNote: ackNote,
      amountReceived: amt
    });

    // Notify accountants and paidBy user
    users.filter(u => u.role === 'accountant').forEach(a => {
      sendNotification(a.id, `Requisition "${ackReq.title}" acknowledged by ${currentUser.name}.`, 'alert', id, 'requisition');
    });
    if (ackReq.paidById) sendNotification(ackReq.paidById, `Requester acknowledged payment for "${ackReq.title}".`, 'alert', id, 'requisition');
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

  const filteredForReport = useMemo(() => {
    return visibleRequisitions.filter(r => {
      if (filterCategory && r.category !== filterCategory) return false;
      if (filterRequesterId && r.submittedById !== filterRequesterId) return false;
      if (filterAcknowledgement === 'awaiting_ack' && !(r.status === 'Paid' && !r.acknowledgedAt)) return false;
      if (filterAcknowledgement === 'acknowledged' && !r.acknowledgedAt) return false;
      if (filterFileName && !(r.relatedFileName || r.title || "").toLowerCase().includes(filterFileName.toLowerCase())) return false;
      if (filterDateFrom && new Date(r.dateSubmitted) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(r.dateSubmitted) > new Date(filterDateTo)) return false;
      return true;
    });
  }, [visibleRequisitions, filterCategory, filterRequesterId, filterAcknowledgement, filterFileName, filterDateFrom, filterDateTo]);

  // Counts for tabs (reflect current filters)
  const tabCounts = useMemo(() => {
    const all = filteredForReport || [];
    const pending = all.filter(r => r.status === 'Pending').length;
    const approved = all.filter(r => r.status === 'Approved').length;
    const paidAwaiting = all.filter(r => r.status === 'Paid' && !r.acknowledgedAt).length;
    const paidAck = all.filter(r => r.status === 'Paid' && r.acknowledgedAt).length;
    return { pending, approved, paidAwaiting, paidAck, paid: paidAwaiting + paidAck };
  }, [filteredForReport]);

  const displayedList = useMemo(() => {
    const list = filteredForReport || [];
    switch (activeTab) {
      case 'pending':
        return list.filter(r => r.status === 'Pending');
      case 'approved':
        return list.filter(r => r.status === 'Approved');
      case 'paid':
        if (paidView === 'awaiting') return list.filter(r => r.status === 'Paid' && !r.acknowledgedAt);
        if (paidView === 'acknowledged') return list.filter(r => r.status === 'Paid' && r.acknowledgedAt);
        return list.filter(r => r.status === 'Paid');
      default:
        return list;
    }
  }, [filteredForReport, activeTab, paidView]);

  const requisitionTotals = useMemo(() => {
    let total = 0;
    let pending = 0;
    let approved = 0;
    let paid = 0;

    filteredForReport.forEach(r => {
      const amt = Number(r.amount || 0);
      total += amt;
      if (r.status === "Pending") pending += amt;
      else if (r.status === "Approved") approved += amt;
      else if (r.status === "Paid") paid += amt;
    });

    return { total, pending, approved, paid };
  }, [filteredForReport]);

  // Presets persisted in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('requisitionReportPresets');
      if (raw) setPresets(JSON.parse(raw));
    } catch (e) { console.error('Failed to load presets', e); }
  }, []);

  const savePreset = async () => {
    const name = prompt('Preset name:');
    if (!name) return;
    const p = { name, filters: { filterCategory, filterRequesterId, filterFileName, filterDateFrom, filterDateTo } };
    const next = [...presets.filter((x: any) => x.name !== name), p];
    setPresets(next);
    localStorage.setItem('requisitionReportPresets', JSON.stringify(next));
    setSelectedPreset(name);
  };

  const applyPreset = (name: string) => {
    const p = presets.find((x: any) => x.name === name);
    if (!p) return;
    const f = p.filters || {};
    setFilterCategory(f.filterCategory || "");
    setFilterRequesterId(f.filterRequesterId || "");
    setFilterFileName(f.filterFileName || "");
    setFilterDateFrom(f.filterDateFrom || "");
    setFilterDateTo(f.filterDateTo || "");
    setSelectedPreset(name);
  };

  const deletePreset = (name: string) => {
    if (!confirm(`Delete preset "${name}"?`)) return;
    const next = presets.filter((x: any) => x.name !== name);
    setPresets(next);
    localStorage.setItem('requisitionReportPresets', JSON.stringify(next));
    if (selectedPreset === name) setSelectedPreset("");
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Title", "Category", "Related File", "Requestor", "Amount", "Status", "Notes", "Approved By", "Date Approved", "Paid By", "Date Paid"];
    const rows = displayedList.map(r => [
      new Date(r.dateSubmitted).toLocaleString(),
      (r.title || "").replace(/\n/g, " "),
      r.category || "",
      r.relatedFileName || "",
      r.submittedByName || "",
      r.amount?.toString() || "",
      r.status,
      (r.notes || "").replace(/\n/g, " "),
      r.approvedByName || "",
      r.dateApproved ? new Date(r.dateApproved).toLocaleString() : "",
      r.paidByName || "",
      r.datePaid ? new Date(r.datePaid).toLocaleString() : ""
    ]);

    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `requisitions_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    const htmlRows = displayedList.map(r => `
      <tr>
        <td>${new Date(r.dateSubmitted).toLocaleString()}</td>
        <td>${(r.title || "")}</td>
        <td>${r.category || ""}</td>
        <td>${r.relatedFileName || ""}</td>
        <td>${r.submittedByName || ""}</td>
        <td>${r.amount || ""}</td>
        <td>${r.status || ""}</td>
        <td>${(r.notes || "").replace(/\n/g, '<br/>')}</td>
      </tr>
    `).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Requisitions Report</title><meta charset="utf-8"/><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}</style></head><body><h2>Requisitions Report</h2><table><thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Related File</th><th>Requestor</th><th>Amount</th><th>Status</th><th>Notes</th></tr></thead><tbody>${htmlRows}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

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
    <div className="px-4 md:px-6 lg:px-8 py-6 md:py-10 max-w-[1600px] mx-auto space-y-8">
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

      {/* Requisition Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-b-slate-300 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Requisitioned</span>
          <h4 className="text-2xl font-bold text-slate-800">UGX {requisitionTotals.total.toLocaleString()}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-b-amber-500 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Pending Approval</span>
          <h4 className="text-2xl font-bold text-slate-800">UGX {requisitionTotals.pending.toLocaleString()}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-b-blue-500 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Approved (Unpaid)</span>
          <h4 className="text-2xl font-bold text-slate-800">UGX {requisitionTotals.approved.toLocaleString()}</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-b-emerald-500 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Paid / Completed</span>
          <h4 className="text-2xl font-bold text-slate-800">UGX {requisitionTotals.paid.toLocaleString()}</h4>
        </div>
      </div>

      {/* Section Tabs: Pending / Approved / Paid */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => { setActiveTab('pending'); setPaidView('awaiting'); }} className={`px-4 py-2 rounded-xl font-semibold text-sm ${activeTab === 'pending' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            Pending ({tabCounts.pending})
          </button>
          <button onClick={() => { setActiveTab('approved'); setPaidView('awaiting'); }} className={`px-4 py-2 rounded-xl font-semibold text-sm ${activeTab === 'approved' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            Approved ({tabCounts.approved})
          </button>
          <button onClick={() => setActiveTab('paid')} className={`px-4 py-2 rounded-xl font-semibold text-sm ${activeTab === 'paid' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            Paid ({tabCounts.paid})
          </button>
        </div>
        {activeTab === 'paid' && (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setPaidView('awaiting')} className={`px-3 py-1 rounded-lg text-sm font-medium ${paidView === 'awaiting' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
              Awaiting Ack ({tabCounts.paidAwaiting})
            </button>
            <button onClick={() => setPaidView('acknowledged')} className={`px-3 py-1 rounded-lg text-sm font-medium ${paidView === 'acknowledged' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
              Acknowledged ({tabCounts.paidAck})
            </button>
            <button onClick={() => setPaidView('all')} className={`px-3 py-1 rounded-lg text-sm font-medium ${paidView === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
              All Paid
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 items-stretch md:items-center bg-slate-50/50">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full md:w-auto bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            <option value="">All categories</option>
            <option>Commissioning fees</option>
            <option>Transport expenses</option>
            <option>Filing fees</option>
            <option>Office supplies</option>
            <option>Court Attendence fees</option>
            <option>Facilitation</option>
            <option>Stationery & Printing</option>
            <option>Car Repair & Maintenance</option>
            <option>Meals</option>
            <option>Office repairs & Maintenance</option>
            <option>Telephone & Internet Services</option>
            <option>Cost of Service</option>
            <option>NSSF</option>
            <option>PAYE</option>
            <option>Salaries & wages</option>
            <option>Security Services</option>
            <option>Garbage Collection</option>
            <option>Utility Bills</option>
            <option>Others</option>
          </select>
          <select value={filterRequesterId} onChange={e => setFilterRequesterId(e.target.value)} className="w-full md:w-auto bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            <option value="">All requestors</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={filterAcknowledgement} onChange={e => setFilterAcknowledgement(e.target.value)} className="w-full md:w-auto bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            <option value="">All acknowledgements</option>
            <option value="awaiting_ack">Awaiting Acknowledgement</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
          <input value={filterFileName} onChange={e => setFilterFileName(e.target.value)} placeholder="File name or title" className="w-full md:w-auto bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm placeholder:text-slate-400 placeholder:font-normal" />
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full sm:w-auto bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
            <span className="hidden sm:inline text-slate-400 text-sm">to</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full sm:w-auto bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => { setFilterCategory(''); setFilterRequesterId(''); setFilterFileName(''); setFilterDateFrom(''); setFilterDateTo(''); }} className="flex-1 md:flex-none text-sm font-semibold px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">Clear</button>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto md:ml-auto">
            <button onClick={handleExportCSV} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">Export CSV</button>
            <button onClick={handlePrint} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">Print</button>
          </div>
        </div>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 w-1/3">Details</th>
                <th className="px-4 py-3 hidden lg:table-cell">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Submitted By</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {displayedList.length > 0 ? displayedList.map(req => (
                <tr key={req.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">{new Date(req.dateSubmitted).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800 font-medium break-words leading-snug">{req.title}</p>
                    {req.relatedFileName && (
                      <span
                        onClick={() => req.relatedFileType && req.relatedFileId && req.relatedFileType !== 'general' ? handleNavigate(req.relatedFileType, req.relatedFileId) : null}
                        className={`text-xs block break-words leading-snug mt-1 ${req.relatedFileType && req.relatedFileId && req.relatedFileType !== 'general' ? 'text-blue-600 hover:text-blue-800 cursor-pointer hover:underline' : 'text-slate-500'}`}
                      >
                        {req.relatedFileName}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium hidden lg:table-cell">{req.category || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">{req.submittedByName}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">UGX {req.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-medium tracking-wide border ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                    {req.rejectionReason && (
                      <p className={`text-[10px] mt-1.5 truncate max-w-[150px] mx-auto ${req.status === 'Approved' ? 'text-blue-600' : 'text-red-500'}`} title={req.rejectionReason}>{req.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {req.status === "Pending" && canApprove && (
                        <>
                          <button onClick={() => openApprovalModal(req.id)} className="text-blue-600 hover:text-blue-800 font-medium text-[10px] uppercase tracking-wider transition-colors">Approve</button>
                          <button onClick={() => openRejectionModal(req.id)} className="text-red-500 hover:text-red-700 font-medium text-[10px] uppercase tracking-wider transition-colors">Reject</button>
                        </>
                      )}
                      {req.status === "Approved" && canPay && (
                        <button onClick={() => handleMarkPaid(req.id)} className="text-emerald-600 hover:text-emerald-800 font-medium text-[10px] uppercase tracking-wider transition-colors">Mark Paid</button>
                      )}
                      {req.status === "Paid" && req.submittedById === currentUser?.id && !req.acknowledgedAt && (
                        <button onClick={() => openAckModal(req.id)} className="text-indigo-600 hover:text-indigo-800 font-medium text-[10px] uppercase tracking-wider transition-colors">Acknowledge</button>
                      )}
                      {(req.submittedById === currentUser?.id || isAccountant) && (
                        <>
                          {req.submittedById === currentUser?.id && req.status === "Pending" && (
                            <button onClick={() => {
                              setTitle(req.title);
                              setAmount(req.amount.toString());
                              setCategory(req.category || "");
                              setNotes(req.notes || "");
                              setRelatedFileId(req.relatedFileId || "");
                              setRelatedFileType(req.relatedFileType || "");
                              setRelatedFileName(req.relatedFileName || "");
                              setEditingReqId(req.id);
                              setShowModal(true);
                            }} className="text-slate-400 hover:text-blue-600 font-medium text-[10px] uppercase tracking-wider transition-colors">Edit</button>
                          )}
                          <button onClick={() => { if (confirm('Delete this requisition?')) deleteRequisition(req.id); }} className="text-slate-400 hover:text-red-600 font-medium text-[10px] uppercase tracking-wider transition-colors">Del</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-medium italic">No requisitions found.</td></tr>
              )}
            </tbody>
            {displayedList.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-100 font-semibold text-slate-800">
                  <td className="px-4 py-4" colSpan={4}>Total Requisitioned Amount</td>
                  <td className="px-4 py-4 text-right text-base font-semibold whitespace-nowrap">UGX {requisitionTotals.total.toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Card View (Compact Banking App Style) */}
        <div className="md:hidden">
              {displayedList.length > 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100/60">
              {displayedList.map(req => {
                const isPaid = req.status === "Paid";
                const isApproved = req.status === "Approved";
                const iconBg = isPaid ? "bg-[#EEF7F4] text-[#2CB187]" : isApproved ? "bg-[#EFF3FE] text-[#3D71FF]" : "bg-[#FFF4E5] text-[#FF9B26]";
                const icon = isPaid ? "✓" : isApproved ? "↑" : "⏳";

                return (
                  <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 shrink-0 rounded-[12px] flex items-center justify-center font-semibold text-base ${iconBg}`}>
                        {icon}
                      </div>

                      {/* Details (Middle) */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-800 text-xs break-words leading-snug">{req.title}</h3>
                        <p className="text-[9px] text-slate-400 mt-1 break-words leading-snug">
                          {new Date(req.dateSubmitted).toLocaleDateString()} • {req.submittedByName}
                        </p>
                        {req.relatedFileName && (
                          <span
                            onClick={() => req.relatedFileType && req.relatedFileId && req.relatedFileType !== 'general' ? handleNavigate(req.relatedFileType, req.relatedFileId) : null}
                            className={`text-[9px] font-medium block break-words leading-snug mt-1.5 ${req.relatedFileType && req.relatedFileId && req.relatedFileType !== 'general' ? 'text-blue-600 hover:text-blue-800 cursor-pointer hover:underline' : 'text-slate-500'}`}
                          >
                            ⚖️ {req.relatedFileName}
                          </span>
                        )}
                        <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium uppercase mt-1.5 inline-block">
                          {req.category || "General"}
                        </span>
                      </div>

                      {/* Amount (Right) */}
                      <div className="text-right shrink-0">
                        <div className={`font-semibold text-xs ${isPaid ? "text-slate-800" : isApproved ? "text-[#3D71FF]" : "text-[#FF9B26]"}`}>
                          <span className="text-[8px] mr-0.5 opacity-60 font-medium uppercase">UGX</span>
                          {req.amount.toLocaleString()}
                        </div>
                        <div className="mt-0.5">
                           <span className={`text-[8px] font-semibold uppercase tracking-wider ${isPaid ? "text-[#2CB187]" : isApproved ? "text-[#3D71FF]" : "text-[#FF9B26]"}`}>
                             {req.status}
                           </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row (only if needed) */}
                    {(canApprove || canPay || req.submittedById === currentUser?.id || isAccountant || req.rejectionReason) && (
                      <div className="mt-3 pt-3 border-t border-slate-100 border-dashed flex flex-wrap items-center justify-end gap-2">
                        {req.rejectionReason && (
                          <div className={`mr-auto text-[10px] font-medium truncate max-w-[140px] ${req.status === 'Approved' ? 'text-blue-600' : 'text-red-500'}`}>
                            {req.rejectionReason}
                          </div>
                        )}
                        {req.status === "Pending" && canApprove && (
                          <>
                            <button onClick={() => openApprovalModal(req.id)} className="text-white bg-[#3D71FF] hover:bg-blue-700 font-medium text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-sm transition">Approve</button>
                            <button onClick={() => openRejectionModal(req.id)} className="text-white bg-red-500 hover:bg-red-600 font-medium text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-sm transition">Reject</button>
                          </>
                        )}
                        {req.status === "Approved" && canPay && (
                          <button onClick={() => handleMarkPaid(req.id)} className="text-white bg-[#2CB187] hover:bg-emerald-600 font-medium text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-sm transition">Pay</button>
                        )}
                        {req.status === "Paid" && req.submittedById === currentUser?.id && !req.acknowledgedAt && (
                          <button onClick={() => openAckModal(req.id)} className="text-white bg-indigo-600 hover:bg-indigo-700 font-medium text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-sm transition">Acknowledge</button>
                        )}
                        {(req.submittedById === currentUser?.id || isAccountant) && (
                          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                            {req.submittedById === currentUser?.id && req.status === "Pending" && (
                              <button onClick={() => {
                                setTitle(req.title);
                                setAmount(req.amount.toString());
                                setCategory(req.category || "");
                                setNotes(req.notes || "");
                                setRelatedFileId(req.relatedFileId || "");
                                setRelatedFileType(req.relatedFileType || "");
                                setRelatedFileName(req.relatedFileName || "");
                                setEditingReqId(req.id);
                                setShowModal(true);
                              }} className="text-slate-400 hover:text-slate-700 font-medium text-[10px] uppercase px-1.5 py-1 transition">Edit</button>
                            )}
                            <button onClick={() => { if (confirm('Delete this requisition?')) deleteRequisition(req.id); }} className="text-slate-400 hover:text-red-500 font-medium text-[10px] uppercase px-1.5 py-1 transition">Del</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm text-slate-400 font-medium italic text-sm">No requisitions found.</div>
          )}
        </div>
        {/* Mobile Total Row */}
        {filteredForReport.length > 0 && (
          <div className="md:hidden bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center font-bold text-slate-800">
            <span>Total Requisitioned</span>
            <span className="text-base font-black">UGX {requisitionTotals.total.toLocaleString()}</span>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-visible flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <button onClick={() => {
                setShowModal(false);
                setEditingReqId(null);
                setTitle("");
                setAmount("");
                setCategory("");
                setNotes("");
                setRelatedFileId("");
                setRelatedFileType("");
                setRelatedFileName("");
              }} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase transition-colors">
                Cancel
              </button>
              <h3 className="text-lg font-semibold text-slate-800">{editingReqId ? 'Edit Requisition' : 'New Requisition'}</h3>
              <div className="w-10"></div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="group relative">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Category</label>
                <select required autoFocus value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 p-3 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer">
                  <option value="">Select category...</option>
                  <option>Commissioning fees</option>
                  <option>Transport expenses</option>
                  <option>Filing fees</option>
                  <option>Office supplies</option>
                  <option>Court Attendence fees</option>
                  <option>Facilitation</option>
                  <option>Stationery & Printing</option>
                  <option>Car Repair & Maintenance</option>
                  <option>Meals</option>
                  <option>Office repairs & Maintenance</option>
                  <option>Telephone & Internet Services</option>
                  <option>Cost of Service</option>
                  <option>NSSF</option>
                  <option>PAYE</option>
                  <option>Salaries & wages</option>
                  <option>Security Services</option>
                  <option>Garbage Collection</option>
                  <option>Utility Bills</option>
                  <option>Others</option>
                </select>
              </div>
              <div className="group relative">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Title / Purpose</label>
                <input required className="w-full bg-slate-50/50 border border-slate-200 p-3 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g. Transport to Court" />
              </div>

              <div className="group relative z-40">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Link Related File (Optional)</label>
                <div className="relative">
                  <div
                    onClick={() => setIsFileDropdownOpen(!isFileDropdownOpen)}
                    className={`w-full bg-slate-50/50 border ${isFileDropdownOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"} p-3 pl-10 rounded-xl text-sm font-medium text-slate-700 transition-all shadow-sm cursor-pointer flex justify-between items-center`}
                  >
                    <span className="truncate">{relatedFileName || "-- General Requisition --"}</span>
                    <span className={`text-slate-400 text-xs transition-transform ${isFileDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📎</span>
                  </div>

                  {isFileDropdownOpen && (
                    <div className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[calc(28rem-3rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] flex flex-col max-h-[80vh]" style={{ top: '10vh' }}>
                      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                          <input
                            autoFocus type="text" placeholder="Search files..."
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

                        {(!fileSearch || "bca".includes(fileSearch.toLowerCase())) && (
                          <button type="button" className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center justify-between ${relatedFileId === 'BCA' ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                            onClick={() => { setRelatedFileId("BCA"); setRelatedFileType("general"); setRelatedFileName("BCA"); setIsFileDropdownOpen(false); setFileSearch(""); }}
                          >
                            <span>🏦 BCA</span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">General</span>
                          </button>
                        )}

                        {(!fileSearch || "fisk".includes(fileSearch.toLowerCase()) || "fisk (u) ltd".includes(fileSearch.toLowerCase())) && (
                          <button type="button" className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center justify-between ${relatedFileId === 'Fisk (U) Ltd' ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                            onClick={() => { setRelatedFileId("Fisk (U) Ltd"); setRelatedFileType("general"); setRelatedFileName("Fisk (U) Ltd"); setIsFileDropdownOpen(false); setFileSearch(""); }}
                          >
                            <span>🏢 Fisk (U) Ltd</span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">General</span>
                          </button>
                        )}

                        {filteredCasesForDropdown.length > 0 && (
                          <div className="pt-2">
                            <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Court Cases</p>
                            {filteredCasesForDropdown.map(c => (
                              <button type="button" key={`case-${c.id}`} className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center justify-between ${relatedFileId === c.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                onClick={() => { setRelatedFileId(c.id); setRelatedFileType("case"); setRelatedFileName(c.fileName); setIsFileDropdownOpen(false); setFileSearch(""); }}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span className="text-sm">⚖️</span>
                                  <span>{c.fileName}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {filteredTransactionsForDropdown.length > 0 && (
                          <div className="pt-2">
                            <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Transactions</p>
                            {filteredTransactionsForDropdown.map(t => (
                              <button type="button" key={`tx-${t.id}`} className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center justify-between ${relatedFileId === t.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                onClick={() => { setRelatedFileId(t.id); setRelatedFileType("transaction"); setRelatedFileName(t.fileName); setIsFileDropdownOpen(false); setFileSearch(""); }}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span className="text-sm">💼</span>
                                  <span>{t.fileName}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {filteredLettersForDropdown.length > 0 && (
                          <div className="pt-2">
                            <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Letters</p>
                            {filteredLettersForDropdown.map(l => (
                              <button type="button" key={`letter-${l.id}`} className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition truncate flex items-center justify-between ${relatedFileId === l.id ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
                                onClick={() => { setRelatedFileId(l.id); setRelatedFileType("letter"); setRelatedFileName(l.subject); setIsFileDropdownOpen(false); setFileSearch(""); }}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span className="text-sm">✉️</span>
                                  <span>{l.subject}</span>
                                </span>
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

              <div className="group relative">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-2 block ml-1 transition-colors group-focus-within:text-blue-600">Amount (UGX)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm leading-none">UGX</span>
                  <input required type="number" className="w-full bg-slate-50/50 border border-slate-200 p-3 pl-14 rounded-xl font-bold text-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium uppercase tracking-wider text-xs transition-colors shadow-md mt-2">
                Submit Requisition
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NEW: Professional Approval Modal */}
      {showApprovalModal && approvalReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 text-center">Approve Requisition</h3>
              <p className="text-xs font-medium text-slate-500 text-center mt-1">Review and finalize the amount.</p>
            </div>
            <form onSubmit={submitApproval} className="p-6 space-y-5">
              
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-1">Requested By</p>
                <p className="text-sm font-semibold text-slate-800">{approvalReq.submittedByName}</p>
                
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-1 mt-3">Purpose</p>
                <p className="text-sm font-semibold text-slate-800">{approvalReq.title}</p>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                  Final Approved Amount (UGX)
                </label>
                <input 
                  type="number"
                  required 
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-semibold text-lg text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center"
                  value={approvalAmount} 
                  onChange={e => setApprovalAmount(e.target.value)} 
                />
                {Number(approvalAmount) !== approvalReq.amount && (
                  <p className="text-xs text-amber-600 font-medium mt-2 text-center bg-amber-50 p-2 rounded-lg border border-amber-100">
                    Amount changed from originally requested UGX {approvalReq.amount.toLocaleString()}
                  </p>
                )}
              </div>

              {Number(approvalAmount) < approvalReq.amount && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                    Reason for Reduction <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    placeholder="Explain why the amount was reduced..."
                    value={approvalReductionReason}
                    onChange={(e) => setApprovalReductionReason(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => { setShowApprovalModal(false); setApprovalReq(null); }} 
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-widest py-4 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs uppercase tracking-widest py-4 rounded-xl shadow-xl shadow-blue-200 transition-all"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW: Professional Rejection Modal */}
      {showRejectionModal && rejectionReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-red-50 border-b border-red-100">
              <h3 className="text-lg font-semibold text-red-800 text-center">Reject Requisition</h3>
              <p className="text-xs font-medium text-red-600/80 text-center mt-1">Provide a reason for rejecting this request.</p>
            </div>
            <form onSubmit={submitRejection} className="p-6 space-y-5">
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Requested By</p>
                <p className="text-sm font-semibold text-slate-800">{rejectionReq.submittedByName}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 mt-3">Amount</p>
                <p className="text-sm font-semibold text-slate-800">UGX {rejectionReq.amount.toLocaleString()}</p>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  autoFocus
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-sm text-slate-800 outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                  placeholder="Explain why this requisition is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => { setShowRejectionModal(false); setRejectionReq(null); }} 
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-widest py-4 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs uppercase tracking-widest py-4 rounded-xl shadow-xl shadow-red-200 transition-all"
                >
                  Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acknowledgement Modal */}
      {showAckModal && ackReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-indigo-50 border-b border-indigo-100">
              <h3 className="text-lg font-semibold text-indigo-800 text-center">Acknowledge Payment</h3>
              <p className="text-xs font-medium text-indigo-600/80 text-center mt-1">Confirm receipt of funds for this requisition.</p>
            </div>
            <form onSubmit={submitAcknowledgement} className="p-6 space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Requested By</p>
                <p className="text-sm font-semibold text-slate-800">{ackReq.submittedByName}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 mt-3">Purpose</p>
                <p className="text-sm font-semibold text-slate-800">{ackReq.title}</p>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Amount Received (UGX)</label>
                <input
                  type="number"
                  required
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-semibold text-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                  value={ackAmount}
                  onChange={e => setAckAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Note (optional)</label>
                <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none" placeholder="Optional note about the payment" value={ackNote} onChange={e => setAckNote(e.target.value)} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAckModal(false); setAckReq(null); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-widest py-4 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs uppercase tracking-widest py-4 rounded-xl shadow-xl shadow-indigo-200 transition-all">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
