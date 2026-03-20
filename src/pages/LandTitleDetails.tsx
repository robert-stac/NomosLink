import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import type { LandTitle } from '../context/AppContext';

export default function LandTitleDetails() {
  const { id } = useParams();
  const { landTitles, updateLandTitle, addLandTitleNote, users, transactions, currentUser, uploadLandTitleScan } = useAppContext();
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const title = landTitles.find(t => t.id === id);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTakenModal, setShowTakenModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Custody Days Calculation
  const daysInCustody = useMemo(() => {
    if (!title) return 0;
    const start = new Date(title.date_received);
    const end = title.date_released ? new Date(title.date_released) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [title]);

  // Fee Calculation: UGX 200,000 per month
  const estimatedFee = useMemo(() => {
    const months = Math.ceil(daysInCustody / 30);
    return months * 200000;
  }, [daysInCustody]);

  const timerColor = useMemo(() => {
    if (daysInCustody > 90) return '#ef4444'; // Red
    if (daysInCustody > 30) return '#f59e0b'; // Orange
    return '#10b981'; // Green
  }, [daysInCustody]);

  const handleStatusChange = async (newStatus: LandTitle['status'], takenInfo?: { by: string, reason: string }) => {
    if (!title) return;
    setIsUpdating(true);
    const updates: Partial<LandTitle> = { status: newStatus };

    if (newStatus === 'Released') {
      updates.date_released = new Date().toISOString();
      await addLandTitleNote(title.id, `Status changed to Released. Final fee calculated based on ${daysInCustody} days.`);
    } else if (newStatus === 'Taken' && takenInfo) {
      updates.taken_by = takenInfo.by;
      updates.taken_reason = takenInfo.reason;
      updates.taken_at = new Date().toISOString();
      updates.date_released = updates.taken_at; // Lock custody timer
      await addLandTitleNote(title.id, `Taken by ${takenInfo.by}. Reason: ${takenInfo.reason}. Final fee calculated based on ${daysInCustody} days.`);
    } else {
      await addLandTitleNote(title.id, `Status changed to ${newStatus}.`);
    }

    await updateLandTitle(title.id, updates);
    setIsUpdating(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !title) return;
    await addLandTitleNote(title.id, newNote);
    setNewNote("");
  };

  if (!title) {
    return (
      <div style={styles.notFound}>
        <h2>Title Not Found</h2>
        <p>The land title you are looking for does not exist or has been removed.</p>
        <Link to="/land-titles" style={styles.backLink}>Back to Register</Link>
      </div>
    );
  }

  const linkedTx = transactions.find(tx => tx.id === title.transaction_id);
  const lawyer = users.find(u => u.id === title.handling_lawyer_id);

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/land-titles" style={styles.breadcrumb}>← Back to Register</Link>
          <h1 style={styles.title}>Title: {title.block && `Block ${title.block}, `}Plot {title.title_number}</h1>
          <div style={styles.headerBadges}>
            <StatusBadge status={title.status} />
            <span style={styles.typeBadge}>{title.title_type}</span>
          </div>
        </div>
        <div style={styles.headerActions}>
          {isAdminOrManager && (
            <>
              <button style={styles.editBtn} onClick={() => setShowEditModal(true)}>
                <span>✏️</span> Edit Details
              </button>
              {title.status !== 'Released' && title.status !== 'Taken' && (
                <>
                  <button
                    style={styles.takenBtn}
                    disabled={isUpdating}
                    onClick={() => setShowTakenModal(true)}
                  >
                    <span>👤</span> Mark as Taken
                  </button>
                  <button
                    style={styles.releaseBtn}
                    disabled={isUpdating}
                    onClick={() => handleStatusChange('Released')}
                  >
                    <span>📤</span> Mark as Released
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </header>

      <div style={styles.contentGrid}>
        {/* LEFT COL: INFO CARDS */}
        <div style={styles.leftCol}>
          {/* CUSTODY TIMER CARD */}
          <div style={{ ...styles.card, borderTop: `6px solid ${timerColor}` }}>
            <h3 style={styles.cardTitle}>Custody Timer</h3>
            <div style={styles.timerWrapper}>
              <div style={{ ...styles.timerDays, color: timerColor }}>{daysInCustody}</div>
              <div style={styles.timerLabel}>Days in Custody</div>
            </div>
            <div style={styles.feeInfo}>
              <div style={styles.feeRow}>
                <span>Monthly Rate:</span>
                <strong>UGX 200,000</strong>
              </div>
              <div style={styles.feeRow}>
                <span>Accrued Fee:</span>
                <strong style={{ color: '#1e293b' }}>UGX {estimatedFee.toLocaleString()}</strong>
              </div>
            </div>
            {title.date_released && (
              <div style={styles.releasedNote}>
                Released on {new Date(title.date_released).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* TAKEN INFO CARD */}
          {title.status === 'Taken' && (
            <div style={{ ...styles.card, borderLeft: '6px solid #6366f1' }}>
              <h3 style={styles.cardTitle}>Release Information (Taken)</h3>
              <div style={styles.infoGrid}>
                <InfoItem label="Taken By" value={title.taken_by || "Not recorded"} />
                <InfoItem label="Date Taken" value={title.taken_at ? new Date(title.taken_at).toLocaleString() : "Not recorded"} />
                <div style={{ gridColumn: 'span 2' }}>
                  <InfoItem label="Reason" value={title.taken_reason || "No reason provided"} />
                </div>
              </div>
            </div>
          )}

          {/* MAIN INFO CARD */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Title Information</h3>
            <div style={styles.infoGrid}>
              <InfoItem label="Block" value={title.block || "Not specified"} />
              <InfoItem label="District" value={title.district || "Not specified"} />
              <InfoItem label="County" value={title.county || "Not specified"} />
              <InfoItem label="Location" value={title.location || "Not specified"} />
              <InfoItem label="Size" value={title.size || "Not specified"} />
              <InfoItem label="Storage" value={title.storage_location || "Not specified"} />
              <InfoItem label="Lawyer" value={lawyer?.name || "Unassigned"} />
              <InfoItem label="Received" value={new Date(title.date_received).toLocaleDateString()} />
            </div>

            {title.scanned_copy_url && (
              <div style={styles.scanSection}>
                <a
                  href={title.scanned_copy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.scanLink}
                >
                  📄 View Scanned Copy: {title.scanned_copy_name || 'Download'}
                </a>
              </div>
            )}
          </div>

          {/* LINKED TRANSACTION CARD */}
          {linkedTx && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Linked Transaction</h3>
              <div style={styles.linkedTxBox}>
                <div style={styles.txIcon}>📁</div>
                <div style={styles.txInfo}>
                  <p style={styles.txName}>{linkedTx.fileName}</p>
                  <p style={styles.txMeta}>Transaction ID: {linkedTx.id}</p>
                </div>
                <Link to={`/lawyer/transactions/${linkedTx.id}`} style={styles.txLink}>View</Link>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COL: NOTES LOG */}
        <div style={styles.rightCol}>
          <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={styles.cardTitle}>Custody Log & Notes</h3>

            <div style={styles.timelineContainer}>
              {(!title.notes_history || title.notes_history.length === 0) ? (
                <p style={styles.noNotes}>No history recorded yet.</p>
              ) : (
                <div style={styles.timeline}>
                  {[...(title.notes_history || [])].reverse().map((note, index) => (
                    <div key={note.id} style={styles.timelineItem}>
                      <div style={styles.timelineDot} />
                      {index !== (title.notes_history?.length || 0) - 1 && <div style={styles.timelineLine} />}
                      <div style={styles.timelineContent}>
                        <div style={styles.timelineHeader}>
                          <span style={styles.timelineAuthor}>{note.author_name}</span>
                          <span style={styles.timelineDate}>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p style={styles.timelineMessage}>{note.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddNote} style={styles.noteForm}>
              <textarea
                style={styles.noteInput}
                placeholder="Add a note to this title's history..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
              <button type="submit" style={styles.noteSubmit} disabled={!newNote.trim()}>
                Add Note
              </button>
            </form>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditTitleModal
          title={title}
          onClose={() => setShowEditModal(false)}
          users={users}
          transactions={transactions}
          onSubmit={updateLandTitle}
          uploadLandTitleScan={uploadLandTitleScan}
        />
      )}
      {showTakenModal && <RecordTakenModal onClose={() => setShowTakenModal(false)} onSubmit={(info: any) => handleStatusChange('Taken', info)} />}
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div style={styles.infoItem}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'In Custody' ? '#10b981' :
      status === 'Under Transaction' ? '#3b82f6' :
        status === 'Released' ? '#6b7280' : '#94a3b8';

  return (
    <span style={{
      ...styles.badge,
      backgroundColor: `${color}15`,
      color: color,
      border: `1px solid ${color}30`
    }}>{status}</span>
  );
}

function EditTitleModal({ title, onClose, onSubmit, users, transactions, uploadLandTitleScan }: any) {
  const [formData, setFormData] = useState({ ...title });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Update title data
      await onSubmit(title.id, formData);

      // 2. Handle file upload if a new file was selected
      if (selectedFile) {
        await uploadLandTitleScan(title.id, selectedFile);
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
          <h2 style={styles.modalTitle}>Edit Title Details</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Plot Number</label>
              <input type="text" style={styles.input} value={formData.title_number} onChange={e => setFormData({ ...formData, title_number: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Owner Name</label>
              <input type="text" style={styles.input} value={formData.owner_name} onChange={e => setFormData({ ...formData, owner_name: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Block</label>
              <input type="text" style={styles.input} value={formData.block || ""} onChange={e => setFormData({ ...formData, block: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>District</label>
              <input type="text" style={styles.input} value={formData.district || ""} onChange={e => setFormData({ ...formData, district: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>County</label>
              <input type="text" style={styles.input} value={formData.county || ""} onChange={e => setFormData({ ...formData, county: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Location</label>
              <input type="text" style={styles.input} value={formData.location || ""} onChange={e => setFormData({ ...formData, location: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Size</label>
              <input type="text" style={styles.input} value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} />
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
              <label style={styles.label}>Status</label>
              <select style={styles.input} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                <option value="In Custody">In Custody</option>
                <option value="Under Transaction">Under Transaction</option>
                <option value="Archived">Archived</option>
                <option value="Released">Released</option>
                <option value="Taken">Taken</option>
              </select>
            </div>
            {formData.status === 'Taken' && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Taken By</label>
                  <input type="text" style={styles.input} value={formData.taken_by || ""} onChange={e => setFormData({ ...formData, taken_by: e.target.value })} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Taken Reason</label>
                  <input type="text" style={styles.input} value={formData.taken_reason || ""} onChange={e => setFormData({ ...formData, taken_reason: e.target.value })} />
                </div>
              </>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Linked Transaction</label>
              <select
                style={styles.input}
                value={formData.transaction_id || ""}
                onChange={e => setFormData({ ...formData, transaction_id: e.target.value || null })}
              >
                <option value="">No Transaction</option>
                {transactions.map((tx: any) => (
                  <option key={tx.id} value={tx.id}>{tx.fileName}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Scanned Copy {formData.scanned_copy_url ? "(Replace)" : "(Upload)"}
              </label>
              <input
                type="file"
                accept=".pdf,image/*"
                style={styles.input}
                onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              />
              {formData.scanned_copy_url && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Current: {formData.scanned_copy_name}</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scanned_copy_url: null, scanned_copy_name: null })}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={isSubmitting}>Cancel</button>
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordTakenModal({ onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({ by: "", reason: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Record Taken Title</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Who took the title?</label>
            <input
              required
              type="text"
              style={styles.input}
              placeholder="Full name of the person"
              value={formData.by}
              onChange={e => setFormData({ ...formData, by: e.target.value })}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Reason for taking</label>
            <textarea
              required
              style={{ ...styles.input, height: '100px', resize: 'none' }}
              placeholder="Why was the title taken out of custody?"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>
          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={{ ...styles.submitBtn, backgroundColor: '#6366f1' }}>Record & Release</button>
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
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '24px',
  },
  breadcrumb: {
    fontSize: '13px',
    color: '#64748b',
    textDecoration: 'none',
    fontWeight: 500,
    marginBottom: '12px',
    display: 'block',
  },
  title: {
    fontSize: '28px',
    fontWeight: 900,
    color: '#0B1F3A',
    margin: '0 0 12px 0',
    letterSpacing: '-1px',
  },
  headerBadges: {
    display: 'flex',
    gap: '10px',
  },
  typeBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '11px',
    fontWeight: 700,
    border: '1px solid #e2e8f0',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  editBtn: {
    padding: '10px 20px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    color: '#334155',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  releaseBtn: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
  },
  takenBtn: {
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '32px',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#0B1F3A',
    margin: '0 0 20px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  timerWrapper: {
    textAlign: 'center',
    padding: '20px 0',
  },
  timerDays: {
    fontSize: '64px',
    fontWeight: 900,
    lineHeight: 1,
  },
  timerLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: 600,
    marginTop: '8px',
  },
  feeInfo: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  feeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#64748b',
  },
  releasedNote: {
    marginTop: '16px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#059669',
    fontWeight: 600,
    backgroundColor: '#ecfdf5',
    padding: '8px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  scanSection: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '16px',
    border: '1px dashed #3b82f6',
    textAlign: 'center',
  },
  scanLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#3b82f6',
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: '14px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
  },
  linkedTxBox: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f1f5f9',
    borderRadius: '16px',
    gap: '16px',
  },
  txIcon: {
    fontSize: '24px',
    backgroundColor: 'white',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
  },
  txInfo: {
    flex: 1,
  },
  txName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0B1F3A',
    margin: 0,
  },
  txMeta: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  txLink: {
    color: '#3b82f6',
    fontWeight: 700,
    fontSize: '13px',
    textDecoration: 'none',
  },
  notesList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingRight: '8px',
    marginBottom: '24px',
    maxHeight: '400px',
  },
  noteItem: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    border: '1px solid #f1f5f9',
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '11px',
  },
  noteAuthor: {
    fontWeight: 700,
    color: '#0B1F3A',
  },
  noteDate: {
    color: '#94a3b8',
  },
  noteMessage: {
    fontSize: '14px',
    color: '#334155',
    margin: 0,
    lineHeight: 1.5,
  },
  noteForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: 'auto',
  },
  noteInput: {
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    height: '80px',
    resize: 'none',
    outline: 'none',
    backgroundColor: '#f8fafc',
  },
  noteSubmit: { padding: '10px 20px', backgroundColor: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-end' },
  timelineContainer: { flex: 1, overflowY: 'auto', padding: '10px 5px' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '0' },
  timelineItem: { display: 'flex', gap: '20px', position: 'relative', paddingBottom: '25px' },
  timelineDot: { width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '3px solid #dbeafe', zIndex: 2, marginTop: '4px', flexShrink: 0 },
  timelineLine: { position: 'absolute', left: '7.5px', top: '16px', bottom: 0, width: '2px', backgroundColor: '#e2e8f0', zIndex: 1 },
  timelineContent: { flex: 1 },
  timelineHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  timelineAuthor: { fontSize: '12px', fontWeight: 800, color: '#0B1F3A' },
  timelineDate: { fontSize: '10px', color: '#94a3b8', fontWeight: 600 },
  timelineMessage: { fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-line' },
  noNotes: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '40px 0',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
  },
  notFound: {
    padding: '80px 20px',
    textAlign: 'center',
    color: '#64748b',
  },
  backLink: {
    marginTop: '20px',
    display: 'inline-block',
    color: '#3b82f6',
    fontWeight: 600,
  },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '32px', borderRadius: '24px', width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' },
  modalTitle: { margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: 600 },
  input: { padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none', backgroundColor: '#f8fafc' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' },
  cancelBtn: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #ddd', background: 'white' },
  submitBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0B1F3A', color: 'white', fontWeight: 'bold' },
};
