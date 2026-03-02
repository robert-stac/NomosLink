import { useState, useMemo, useEffect } from "react"; 
import { useLocation } from "react-router-dom"; 
import { useAppContext } from "../context/AppContext";

export default function CourtCases() {
  const { courtCases, addCourtCase, editCourtCase, deleteCourtCase, lawyers } = useAppContext();
  const location = useLocation(); 

  const [editingId, setEditingId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [lawyerId, setLawyerId] = useState("");
  const [billed, setBilled] = useState("");
  const [paid, setPaid] = useState("");
  const [nextDate, setNextDate] = useState("");
  
  // --- SEARCH & HIGHLIGHT LOGIC ---
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get("search");
    if (search) {
      setSearchTerm(search);
      const targetCase = courtCases.find(c => c.fileName.toLowerCase().includes(search.toLowerCase()));
      if (targetCase) {
        setHighlightId(targetCase.id);
        setTimeout(() => setHighlightId(null), 3000);
      }
    }
  }, [location, courtCases]);

  // --- FILTERING LOGIC (Hides Archived) ---
  const filteredCases = useMemo(() => {
    return courtCases
      .filter(c => !c.archived) 
      .filter(c => 
        c.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [courtCases, searchTerm]);

  // --- FORM FUNCTIONS ---
  const resetForm = () => {
    setFileName("");
    setLawyerId("");
    setBilled("");
    setPaid("");
    setNextDate("");
    setEditingId(null);
  };

  const handleSave = () => {
    if (!fileName || !billed || !lawyerId) return;
    const billedNum = Number(billed);
    const paidNum = Number(paid) || 0;
    const balance = billedNum - paidNum;
    const now = new Date().toLocaleDateString();
    const lawyerObj = lawyers.find((l) => l.id === lawyerId) || null;

    if (editingId) {
      editCourtCase(editingId, {
        fileName,
        lawyerId,
        lawyer: lawyerObj,
        billed: billedNum,
        paid: paidNum,
        balance,
        status: balance <= 0 ? "Completed" : "Ongoing",
        completedDate: balance <= 0 ? now : null,
        nextCourtDate: nextDate,
      });
    } else {
      addCourtCase({
        id: crypto.randomUUID(),
        fileName,
        lawyerId,
        lawyer: lawyerObj,
        billed: billedNum,
        paid: paidNum,
        balance,
        status: "Ongoing",
        nextCourtDate: nextDate,
        completedDate: null,
        progressNotes: [],
        archived: false,
      });
    }
    resetForm();
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setFileName(c.fileName);
    setLawyerId(c.lawyerId || "");
    setBilled(c.billed.toString());
    setPaid(c.paid.toString());
    setNextDate(c.nextCourtDate || "");
  };

  // --- ARCHIVE LOGIC (Soft Delete) ---
  const handleArchive = (id: string) => {
    if (confirm("Move this case to the Firm Archives?")) {
      const now = new Date().toLocaleDateString();
      editCourtCase(id, {
        archived: true,
        status: "Completed",
        completedDate: now,
      });
    }
  };

  // --- DELETE LOGIC (Permanent Delete) ---
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to PERMANENTLY delete this case? This cannot be undone.")) {
      deleteCourtCase(id);
    }
  };

  const formatCurrency = (n: number) => "UGX " + n.toLocaleString();

  const activeCases = courtCases.filter(c => !c.archived);
  const totalCases = activeCases.length;
  const ongoingCases = activeCases.filter((c) => c.status === "Ongoing").length;
  const completedCases = activeCases.filter((c) => c.status === "Completed").length;
  const totalBilled = useMemo(() => activeCases.reduce((sum, c) => sum + c.billed, 0), [activeCases]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Court Cases</h1>
        <input 
            type="text" 
            placeholder="Filter files..." 
            className="border rounded-lg px-4 py-2 w-64 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-md rounded-lg p-4 text-center border-b-4 border-blue-500">
          <h2 className="text-gray-500 font-medium mb-2">Total Cases</h2>
          <p className="text-2xl font-bold">{totalCases}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4 text-center border-b-4 border-yellow-500">
          <h2 className="text-gray-500 font-medium mb-2">Ongoing Cases</h2>
          <p className="text-2xl font-bold">{ongoingCases}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4 text-center border-b-4 border-green-500">
          <h2 className="text-gray-500 font-medium mb-2">Completed Cases</h2>
          <p className="text-2xl font-bold">{completedCases}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4 text-center border-b-4 border-purple-500">
          <h2 className="text-gray-500 font-medium mb-2">Total Billed</h2>
          <p className="text-2xl font-bold font-mono text-sm">{formatCurrency(totalBilled)}</p>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      <div className="bg-white shadow-md rounded-lg mb-8">
        <div className="bg-[#0B1F3A] text-white px-6 py-4 rounded-t-lg flex justify-between">
          <h3 className="font-semibold">{editingId ? "Edit Court Case" : "Add Court Case"}</h3>
          {editingId && <button onClick={resetForm} className="text-xs bg-gray-600 px-2 py-1 rounded">Cancel Edit</button>}
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block font-semibold mb-2 text-sm">File Name *</label>
            <input className="w-full border rounded px-3 py-2" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold mb-2 text-sm">Assigned Lawyer *</label>
            <select className="w-full border rounded px-3 py-2" value={lawyerId} onChange={(e) => setLawyerId(e.target.value)}>
              <option value="">Select lawyer</option>
              {lawyers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-2 text-sm">Amount Billed (UGX) *</label>
            <input type="number" className="w-full border rounded px-3 py-2" value={billed} onChange={(e) => setBilled(e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold mb-2 text-sm">Amount Paid (UGX)</label>
            <input type="number" className="w-full border rounded px-3 py-2" value={paid} onChange={(e) => setPaid(e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold mb-2 text-sm">Next Court Date</label>
            <input type="date" className="w-full border rounded px-3 py-2" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={handleSave} className="bg-[#0B1F3A] text-white px-6 py-2 rounded w-full hover:bg-[#09203b] transition font-bold">
              {editingId ? "Update Case Details" : "Register New Case"}
            </button>
          </div>
        </div>
      </div>

      {/* COURT CASES TABLE */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#0B1F3A] text-white">
              <th className="p-4 text-left">File Name</th>
              <th className="p-4 text-left">Lawyer</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Billed</th>
              <th className="p-4 text-left">Paid</th>
              <th className="p-4 text-left">Balance</th>
              <th className="p-4 text-left text-orange-300">Next Date</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.map((c) => (
              <tr 
                key={c.id} 
                className={`border-b transition-colors duration-500 ${highlightId === c.id ? 'bg-yellow-100' : 'hover:bg-gray-50'}`}
              >
                <td className="p-4 font-bold text-blue-900">{c.fileName}</td>
                <td className="p-4">{lawyers.find(l => l.id === c.lawyerId)?.name || "Unassigned"}</td>
                <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.status}
                    </span>
                </td>
                <td className="p-4">{formatCurrency(c.billed)}</td>
                <td className="p-4 text-green-600">{formatCurrency(c.paid)}</td>
                <td className="p-4 font-bold text-red-600">{formatCurrency(c.balance)}</td>
                <td className="p-4 font-mono">{c.nextCourtDate || "TBA"}</td>
                <td className="p-4 text-center space-x-2">
                  <button onClick={() => handleEdit(c)} className="bg-yellow-400 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Edit</button>
                  <button onClick={() => handleArchive(c.id)} className="bg-gray-400 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Archive</button>
                  <button onClick={() => handleDelete(c.id)} className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCases.length === 0 && (
          <div className="p-10 text-center text-gray-400 italic">No active cases match your search criteria.</div>
        )}
      </div>
    </div>
  );
}