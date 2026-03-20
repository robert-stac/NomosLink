import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function LandTitles() {
  const { landTitles, addLandTitle, users, transactions, initialDataLoaded, currentUser } = useAppContext();
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [lawyerFilter, setLawyerFilter] = useState("All");
  const [billingFilter, setBillingFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);

  // Stats calculation
  const stats = useMemo(() => {
    const total = landTitles.length;
    const inCustody = landTitles.filter(t => t.status === 'In Custody').length;
    const underTransaction = landTitles.filter(t => t.status === 'Under Transaction').length;
    const released = landTitles.filter(t => t.status === 'Released').length;

    // Overdue logic: in custody for 90+ days
    const today = new Date();
    const overdue = landTitles.filter(t => {
      if (t.status !== 'In Custody' && t.status !== 'Under Transaction') return false;
      const receivedDate = new Date(t.date_received);
      const diffTime = Math.abs(today.getTime() - receivedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 90;
    }).length;

    return { total, inCustody, underTransaction, released, overdue };
  }, [landTitles]);

  const filteredTitles = useMemo(() => {
    return landTitles.filter(t => {
      // Main register shows active custody titles and titles temporarily "Taken"
      const isActiveOrTaken = t.status === 'In Custody' || t.status === 'Under Transaction' || t.status === 'Taken';
      if (!isActiveOrTaken) return false;

      const matchesSearch =
        t.title_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.location || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "All" || t.status === statusFilter;
      const matchesLawyer = lawyerFilter === "All" || t.handling_lawyer_id === lawyerFilter;
      
      const balance = (t.total_billed || 0) - (t.total_paid || 0);
      const matchesBilling = billingFilter === "All" || 
        (billingFilter === "Pending" && balance > 0) ||
        (billingFilter === "Paid" && balance <= 0 && (t.total_billed || 0) > 0);

      return matchesSearch && matchesStatus && matchesLawyer && matchesBilling;
    });
  }, [landTitles, searchTerm, statusFilter, lawyerFilter, billingFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Custody': return { bg: '#dcfce7', text: '#166534' };
      case 'Under Transaction': return { bg: '#dbeafe', text: '#1e40af' };
      case 'Taken': return { bg: '#fef3c7', text: '#92400e' };
      case 'Released': return { bg: '#f1f5f9', text: '#475569' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const formatCurrency = (n: number) => "UGX " + Math.round(n).toLocaleString();

  const handleExportCSV = () => {
    if (filteredTitles.length === 0) {
      alert("No data to export matching filters.");
      return;
    }

    const headers = ["Plot Number", "Block", "Owner Name", "District", "Location", "County", "Title Type", "Status", "Date Received", "Storage Location"];
    const csvRows = filteredTitles.map(t => {
      const row = [
        t.title_number,
        t.block || "",
        t.owner_name,
        t.district || "",
        t.location || "",
        t.county || "",
        t.title_type,
        t.status,
        new Date(t.date_received).toLocaleDateString(),
        t.storage_location || ""
      ];
      // Escape commas and double quotes
      return row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `land_titles_register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!initialDataLoaded) return <div className="p-8 text-center text-gray-500 font-medium">Loading register...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Land Titles Register</h1>
          <p style={styles.subtitle}>Manage and track land titles in firm custody</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.exportBtn} onClick={handleExportCSV}>
            <span>📥</span> Export CSV
          </button>
          {isAdminOrManager && (
            <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
              <span>➕</span> Add Title
            </button>
          )}
        </div>
      </header>

      {/* STATS CARDS */}
      <section style={styles.statsGrid}>
        <StatCard label="Total Titles" value={stats.total} color="#0B1F3A" />
        <StatCard label="In Custody" value={stats.inCustody} color="#10b981" />
        <StatCard label="Under Transaction" value={stats.underTransaction} color="#3b82f6" />
        <StatCard label="Released" value={stats.released} color="#64748b" />
        <StatCard label="Overdue (90d+)" value={stats.overdue} color="#ef4444" isUrgent={stats.overdue > 0} />
      </section>

      {/* FILTERS */}
      <div style={styles.filterBar}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search by plot number, owner, or location..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          style={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="In Custody">In Custody</option>
          <option value="Under Transaction">Under Transaction</option>
          <option value="Taken">Taken</option>
        </select>
        
        <select
          style={styles.filterSelect}
          value={lawyerFilter}
          onChange={(e) => setLawyerFilter(e.target.value)}
        >
          <option value="All">All Lawyers</option>
          {users.filter(u => u.role === 'lawyer').map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        {(currentUser?.role === 'admin' || currentUser?.role === 'accountant') && (
          <select
            style={styles.filterSelect}
            value={billingFilter}
            onChange={(e) => setBillingFilter(e.target.value)}
          >
            <option value="All">All Billing</option>
            <option value="Pending">Pending Balance</option>
            <option value="Paid">Fully Paid</option>
          </select>
        )}
      </div>

      {/* TABLE */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Plot / Block</th>
                <th style={styles.th}>Owner Name</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Lawyer</th>
                <th style={styles.th}>Status</th>
                {(currentUser?.role === 'admin' || currentUser?.role === 'accountant') && (
                   <th style={styles.th}>Balance</th>
                )}
                <th style={styles.thCenter}>Actions</th>
              </tr>
          </thead>
          <tbody>
            {filteredTitles.length === 0 ? (
              <tr>
                <td colSpan={currentUser?.role === 'admin' || currentUser?.role === 'accountant' ? 7 : 6} style={styles.noData}>No titles matching your criteria.</td>
              </tr>
            ) : (
              filteredTitles.map(t => (
                  <tr key={t.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '800', color: '#0B1F3A' }}>Plot {t.title_number}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{t.block ? `Block ${t.block}` : 'No Block'}</div>
                    </td>
                    <td style={styles.td}>{t.owner_name}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '500' }}>{t.location}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{t.district}</div>
                    </td>
                    <td style={styles.td}>
                       <span style={{ fontSize: '12px', color: '#475569' }}>
                         {users.find(u => u.id === t.handling_lawyer_id)?.name || "Unassigned"}
                       </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(t.status).bg,
                        color: getStatusColor(t.status).text
                      }}>{t.status}</span>
                    </td>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'accountant') && (
                      <td style={styles.td}>
                        <div style={{ 
                          fontWeight: '800', 
                          color: ((t.total_billed || 0) - (t.total_paid || 0)) > 0 ? '#ef4444' : '#10b981' 
                        }}>
                          {formatCurrency((t.total_billed || 0) - (t.total_paid || 0))}
                        </div>
                      </td>
                    )}
                    <td style={styles.tdCenter}>
                    <Link to={`/land-titles/${t.id}`} style={styles.viewLink}>View Details</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && <AddTitleModal onClose={() => setShowAddModal(false)} onSubmit={addLandTitle} users={users} transactions={transactions} />}
    </div>
  );
}

function StatCard({ label, value, icon, color, isUrgent }: any) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statContent}>
        <span style={styles.statLabel}>{label}</span>
        <span style={{ ...styles.statValue, color: isUrgent ? '#ef4444' : '#0B1F3A' }}>{value}</span>
      </div>
    </div>
  );
}


function AddTitleModal({ onClose, onSubmit, users, transactions }: any) {
  const { uploadLandTitleScan } = useAppContext();
  const [formData, setFormData] = useState({
    title_number: "",
    title_type: "Mailo",
    owner_name: "",
    district: "Kampala",
    county: "",
    block: "",
    location: "",
    date_received: new Date().toISOString().split('T')[0],
    origin: "Direct Custody",
    transaction_id: "",
    handling_lawyer_id: "",
    storage_location: "",
    notes: "",
    monthly_rate: 200000,
    status: "In Custody"
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newTitle = await onSubmit(formData);
      if (newTitle && selectedFile) {
        await uploadLandTitleScan(newTitle.id, selectedFile);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Add New Land Title</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Block *</label>
              <input
                required
                placeholder="e.g. 256"
                type="text"
                style={styles.input}
                value={formData.block}
                onChange={e => setFormData({ ...formData, block: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Plot Number *</label>
              <input
                required
                placeholder="e.g. 456"
                type="text"
                style={styles.input}
                value={formData.title_number}
                onChange={e => setFormData({ ...formData, title_number: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Title Type *</label>
              <select
                required
                style={styles.input}
                value={formData.title_type}
                onChange={e => setFormData({ ...formData, title_type: e.target.value })}
              >
                <option value="Mailo">Mailo</option>
                <option value="Freehold">Freehold</option>
                <option value="Leasehold">Leasehold</option>
                <option value="Customary">Customary</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Owner Name *</label>
              <input
                required
                placeholder="Enter owner name"
                type="text"
                style={styles.input}
                value={formData.owner_name}
                onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>District *</label>
              <input
                required
                placeholder="Enter district"
                type="text"
                style={styles.input}
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>County</label>
              <input
                type="text"
                placeholder="Enter county"
                style={styles.input}
                value={formData.county}
                onChange={e => setFormData({ ...formData, county: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Location / Village *</label>
              <input
                required
                placeholder="Land at..."
                type="text"
                style={styles.input}
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date Received *</label>
              <input
                required
                type="date"
                style={styles.input}
                value={formData.date_received}
                onChange={e => setFormData({ ...formData, date_received: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Handling Lawyer</label>
              <select
                style={styles.input}
                value={formData.handling_lawyer_id}
                onChange={e => setFormData({ ...formData, handling_lawyer_id: e.target.value })}
              >
                <option value="">Select Lawyer</option>
                {users.filter((u: any) => u.role !== 'clerk').map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Storage Location (Safe ID/Box)</label>
              <input
                type="text"
                style={styles.input}
                value={formData.storage_location}
                placeholder="e.g. Counsel's Cabin, Registry"
                onChange={e => setFormData({ ...formData, storage_location: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Origin</label>
              <select
                style={styles.input}
                value={formData.origin}
                onChange={e => setFormData({ ...formData, origin: e.target.value as any })}
              >
                <option value="Direct Custody">Direct Custody</option>
                <option value="Transaction">Transaction</option>
              </select>
            </div>
            {formData.origin === 'Transaction' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Link to Transaction</label>
                <select
                  style={styles.input}
                  value={formData.transaction_id}
                  onChange={e => setFormData({ ...formData, transaction_id: e.target.value })}
                >
                  <option value="">Select Transaction</option>
                  {transactions.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.fileName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Scanned Copy (optional - PDF or Image)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              style={styles.input}
              onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Initial Notes</label>
            <textarea
              placeholder="Enter notes if any"
              style={{ ...styles.input, height: '80px', resize: 'none' }}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={isSubmitting}>Cancel</button>
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Save Land Title"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 900,
    color: '#0B1F3A',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  exportBtn: {
    padding: '10px 18px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    color: '#334155',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  addBtn: {
    padding: '10px 18px',
    backgroundColor: '#0B1F3A',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(11, 31, 58, 0.15)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    fontSize: '24px',
    width: '48px',
    height: '48px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 900,
    marginTop: '2px',
  },
  filterBar: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  searchWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: '#94a3b8',
  },
  searchInput: {
    width: '100%',
    padding: '10px 10px 10px 36px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  filterSelect: {
    padding: '10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#334155',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: '#f8fafc',
  },
  tableWrapper: {
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thead: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  th: {
    padding: '16px 24px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px 24px',
    fontSize: '14px',
    color: '#334155',
    verticalAlign: 'middle',
  },
  titleNum: {
    fontWeight: 700,
    color: '#0B1F3A',
  },
  titleType: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
  },
  viewLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '13px',
  },
  noData: {
    padding: '48px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '15px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalHeader: {
    padding: '24px 32px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 10,
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#0B1F3A',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#94a3b8',
  },
  form: {
    padding: '32px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#475569',
  },
  input: {
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#f8fafc',
    width: '100%',
    boxSizing: 'border-box',
  },
  modalFooter: {
    marginTop: '32px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '24px',
    borderTop: '1px solid #f1f5f9',
  },
  cancelBtn: {
    padding: '12px 24px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    color: '#64748b',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '12px 24px',
    backgroundColor: '#0B1F3A',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(11, 31, 58, 0.2)',
  },
};
