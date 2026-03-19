import { useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import { useAppContext } from "../context/AppContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AccountantDashboard() {
  const { transactions, courtCases, letters, expenses, invoices } = useAppContext();
  
  // Interactive UI States
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<any>(null);
  const [viewScanUrl, setViewScanUrl] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Helper to format currency
  const formatUGX = (val: number) => "UGX " + val.toLocaleString();

  // 1. Calculate Financials using REAL data & Filters
  const financeTotals = useMemo(() => {
    let allRevenueItems = [
      ...(transactions || []),
      ...(courtCases || []),
      ...(letters || [])
    ];
    
    let allExpenses = expenses || [];

    // Real date-based filter logic
    if (timeFilter !== "All Time") {
      const now = new Date();
      allRevenueItems = allRevenueItems.filter(item => {
        const itemDateStr = (('date' in item ? (item as any).date : '') || ('dateAdded' in item ? (item as any).dateAdded : '') || ('dateCreated' in item ? (item as any).dateCreated : '')) as string;
        if (!itemDateStr) return true; // Show items with no date by default in this version
        const itemDate = new Date(itemDateStr);
        if (timeFilter === "This Month") {
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        } else if (timeFilter === "This Year") {
          return itemDate.getFullYear() === now.getFullYear();
        }
        return true;
      });

      allExpenses = allExpenses.filter(exp => {
        if (!exp.date) return true;
        const expDate = new Date(exp.date);
        if (timeFilter === "This Month") {
          return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
        } else if (timeFilter === "This Year") {
          return expDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }
    
    // Calculate Revenue & Billing
    const revenue = allRevenueItems.reduce((acc, item) => {
      const billed = Number(('billed' in item ? item.billed : 0) || ('billedAmount' in item ? item.billedAmount : 0) || 0);
      const paid = Number(('paid' in item ? item.paid : 0) || ('paidAmount' in item ? item.paidAmount : 0) || 0);
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

  // 2. Chart Data: Revenue Sources
  const sourceData = {
    labels: ["Transactions", "Court Cases", "Letters"],
    datasets: [{
      data: [
        transactions?.length || 0,
        courtCases?.length || 0,
        letters?.length || 0
      ],
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
      
      {/* HEADER PORTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Command Center</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Real-time overview of the firm's financial health.</p>
        </div>
        
        {/* TIME FILTER */}
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          {["All Time", "This Year", "This Month"].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                timeFilter === filter 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      {/* PRIMARY KPI METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Billed */}
        <div className="bg-gradient-to-br from-[#0B1F3A] to-blue-900 rounded-[24px] p-6 shadow-xl shadow-blue-900/10 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-200/80 mb-2">Total Billed</p>
          <h2 className="text-3xl font-black tracking-tight">{formatUGX(financeTotals.totalBilled)}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-300">
            <span>📄 {collectionRate}% Collected</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[24px] p-6 shadow-xl shadow-emerald-900/10 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/80 mb-2">Total Revenue (Paid)</p>
          <h2 className="text-3xl font-black tracking-tight">{formatUGX(financeTotals.totalPaid)}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-300">
            <span>💰 Actual Cash In</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-gradient-to-br from-red-500 to-rose-700 rounded-[24px] p-6 shadow-xl shadow-red-900/10 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-black/10 rounded-full blur-xl group-hover:bg-black/20 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-200/80 mb-2">Total Expenses</p>
          <h2 className="text-3xl font-black tracking-tight">{formatUGX(financeTotals.totalExpenses)}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-rose-300">
            <span>📉 Outflows</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`bg-gradient-to-br rounded-[24px] p-6 shadow-xl text-white relative overflow-hidden group ${netProfit >= 0 ? 'from-[#0f172a] to-slate-800 shadow-slate-900/20' : 'from-orange-500 to-red-600 shadow-red-900/20'}`}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">Net Profit</p>
          <h2 className="text-3xl font-black tracking-tight">{formatUGX(netProfit)}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-300">
            <span>{netProfit >= 0 ? '📈 Profitable' : '⚠️ Deficit'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (Wider) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Accounts Receivable Table */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900">Accounts Receivable (Pending)</h3>
              <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm border border-orange-100">
                Total Uncollected: {formatUGX(financeTotals.outstanding)}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th 
                      onClick={() => setSortConfig(p => p?.key === 'name' ? { key: 'name', direction: p.direction === 'asc' ? 'desc' : 'asc' } : { key: 'name', direction: 'asc' })}
                      className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      File Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => setSortConfig(p => p?.key === 'billed' ? { key: 'billed', direction: p.direction === 'asc' ? 'desc' : 'asc' } : { key: 'billed', direction: 'desc' })}
                      className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      Total Billed {sortConfig?.key === 'billed' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => setSortConfig(p => p?.key === 'unpaid' ? { key: 'unpaid', direction: p.direction === 'asc' ? 'desc' : 'asc' } : { key: 'unpaid', direction: 'desc' })}
                      className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-right cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      Unpaid Balance {sortConfig?.key === 'unpaid' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...(transactions || []), ...(courtCases || []), ...(letters || [])]
                    .filter(item => {
                      const billed = ('billed' in item ? item.billed : 0) || ('billedAmount' in item ? item.billedAmount : 0) || 0;
                      const paid = ('paid' in item ? item.paid : 0) || ('paidAmount' in item ? item.paidAmount : 0) || 0;
                      return billed > paid;
                    })
                    .sort((a, b) => {
                      if (!sortConfig) return 0;
                      
                      const getVal = (item: any, key: string) => {
                        if (key === 'name') return String(('fileName' in item ? item.fileName : '') || ('subject' in item ? item.subject : '') || ('clientName' in item ? item.clientName : '')).toLowerCase();
                        if (key === 'billed') return Number(('billed' in item ? item.billed : 0) || ('billedAmount' in item ? item.billedAmount : 0) || 0);
                        if (key === 'unpaid') {
                          const b = Number(('billed' in item ? item.billed : 0) || ('billedAmount' in item ? item.billedAmount : 0) || 0);
                          const p = Number(('paid' in item ? item.paid : 0) || ('paidAmount' in item ? item.paidAmount : 0) || 0);
                          return b - p;
                        }
                        return 0;
                      };

                      const vA = getVal(a, sortConfig.key);
                      const vB = getVal(b, sortConfig.key);

                      if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1;
                      if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1;
                      return 0;
                    })
                    .map((item, idx) => {
                      const billed = ('billed' in item ? item.billed : 0) || ('billedAmount' in item ? item.billedAmount : 0) || 0;
                      const paid = ('paid' in item ? item.paid : 0) || ('paidAmount' in item ? item.paidAmount : 0) || 0;
                      const unpaid = billed - paid;
                      const name = String(
                        ('fileName' in item ? item.fileName : '') || 
                        ('subject' in item ? item.subject : '') || 
                        ('clientName' in item ? item.clientName : 'Unknown')
                      );
                      // Check if there is an invoice with a scanned URL linked to this file
                      const linkedInvoice = invoices.find(inv => inv.relatedFile === name);
                      const scanUrl = item.scannedInvoiceUrl || linkedInvoice?.scannedInvoiceUrl;
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 px-2 text-sm font-bold text-slate-800">{name}</td>
                          <td className="py-4 px-2 text-xs font-bold text-slate-500">{formatUGX(billed)}</td>
                          <td className="py-4 px-2 text-sm font-black text-rose-500 text-right">{formatUGX(unpaid)}</td>
                          <td className="py-4 px-2 text-center">
                            <button 
                              onClick={() => {
                                if (scanUrl) {
                                  setViewScanUrl(scanUrl);
                                } else {
                                  handleSendInvoice(item);
                                }
                              }}
                              className={`border px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm group-hover:shadow-md active:scale-95 flex items-center gap-1 mx-auto ${
                                scanUrl 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600" 
                                : "bg-white border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                              }`}
                            >
                              {scanUrl ? (
                                <><span>👁️</span> View Invoice</>
                              ) : (
                                <><span>👁️</span> View Invoice</>
                              )}
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

          {/* New Expense Breakdown Component */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-slate-900 mb-6">Recent Expense Outflows</h3>
            {financeTotals.allExpensesList.length > 0 ? (
              <div className="space-y-4">
                {financeTotals.allExpensesList.slice(0, 5).map((exp, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{exp.description || exp.category || "Unknown Expense"}</p>
                      <p className="text-xs font-bold text-slate-400 mt-1">{exp.date ? new Date(exp.date).toLocaleDateString() : 'Recent'}</p>
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

        {/* RIGHT COLUMN (Metrics & Charts) */}
        <div className="space-y-8">
          
          {/* Revenue Split Chart */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-black text-slate-900 mb-6">Case Volume Breakdown</h3>
            <div className="relative h-64 w-full flex items-center justify-center">
              <Doughnut 
                data={sourceData} 
                options={{ 
                  maintainAspectRatio: false, 
                  cutout: '75%',
                  plugins: { 
                    legend: { position: 'bottom', labels: { font: { family: 'inherit', weight: 'bold', size: 11 }, padding: 20, usePointStyle: true } } 
                  } 
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

          {/* Efficiency Metric */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 overflow-hidden relative">
            <h3 className="text-lg font-black text-slate-900 mb-2">Collection Efficiency</h3>
            <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">Percentage of billed invoices that have been successfully collected from clients.</p>
            
            <div className="w-full h-12 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200 shadow-inner block">
              <div 
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-out relative"
                  style={{ width: `${collectionRate}%` }}
              >
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

      {/* Invoice Modal Overlay */}
      {showInvoiceModal && invoiceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-8 transform transition-all animate-in zoom-in-95">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-6 mx-auto">
              📄
            </div>
            <h3 className="text-2xl font-black text-center text-slate-900 mb-2 tracking-tight">Invoice Preview</h3>
            <p className="text-center text-xs font-medium text-slate-500 mb-6 leading-relaxed">
              Digital preview for <br/><strong className="text-slate-800">{String(invoiceTarget.fileName || invoiceTarget.subject || 'Unknown File')}</strong>. 
              <br/><span className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-1 block">Scan not yet uploaded</span>
            </p>
            
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-8 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Billed Amount:</span>
                <span>{formatUGX(('billed' in invoiceTarget ? invoiceTarget.billed : 0) || ('billedAmount' in invoiceTarget ? invoiceTarget.billedAmount : 0) || 0)}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-rose-600">
                <span>Unpaid Balance:</span>
                <span>{formatUGX((('billed' in invoiceTarget ? invoiceTarget.billed : 0) || ('billedAmount' in invoiceTarget ? invoiceTarget.billedAmount : 0) || 0) - (('paid' in invoiceTarget ? invoiceTarget.paid : 0) || ('paidAmount' in invoiceTarget ? invoiceTarget.paidAmount : 0) || 0))}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowInvoiceModal(false)}
                className="flex-[1] py-4 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50 transition-all border border-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  // In a real app this would trigger an email/PDF generation backend function
                  alert(`Invoice Sent via Email to client!`);
                  setShowInvoiceModal(false);
                }}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all"
              >
                Dispatch Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanned Invoice Viewer Modal */}
      {viewScanUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setViewScanUrl(null)}></div>
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-4 transform transition-all animate-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Scanned Invoice Preview</h3>
              <button 
                onClick={() => setViewScanUrl(null)}
                className="w-10 h-10 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full flex items-center justify-center transition-all text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-100/50 rounded-2xl m-2 flex items-center justify-center p-8">
              {viewScanUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe 
                  src={viewScanUrl} 
                  className="w-full h-full border-none rounded-xl bg-white shadow-lg"
                  title="PDF Invoice"
                />
              ) : (
                <img 
                  src={viewScanUrl} 
                  alt="Scanned Invoice" 
                  className="max-w-full h-auto rounded-xl shadow-2xl border border-white/20"
                />
              )}
            </div>
            
            <div className="p-4 flex gap-4 justify-end">
              <button 
                onClick={() => window.open(viewScanUrl, '_blank')}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Open in New Tab
              </button>
              <button 
                onClick={() => setViewScanUrl(null)}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}