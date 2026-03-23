import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import type { LandTitle } from '../context/AppContext';

/* ===========================================================
   SEARCHABLE FILE PICKER
   Searches court cases, transactions, and letters in one box.
=========================================================== */
function SearchableFilePicker({
  value,
  onChange,
  courtCases,
  transactions,
  letters,
}: {
  value: string;
  onChange: (val: string) => void;
  courtCases: any[];
  transactions: any[];
  letters: any[];
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Build unified list
  const allFiles = useMemo(() => [
    ...courtCases.map(c => ({ id: c.id, label: c.fileName, type: 'Court Case' })),
    ...transactions.map(t => ({ id: t.id, label: t.fileName, type: 'Transaction' })),
    ...letters.map(l => ({ id: l.id, label: l.subject || l.fileName || '—', type: 'Letter' })),
  ], [courtCases, transactions, letters]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q ? allFiles.filter(f => f.label.toLowerCase().includes(q)) : allFiles;
    return list.slice(0, 50);
  }, [allFiles, query]);

  const selectedLabel = allFiles.find(f => f.id === value)?.label || '';
  const selectedType = allFiles.find(f => f.id === value)?.type || '';

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const typeColor = (t: string) =>
    t === 'Court Case' ? '#7c3aed' :
      t === 'Transaction' ? '#0284c7' :
        t === 'Letter' ? '#b45309' : '#64748b';

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>

      {/* Trigger button */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '12px 36px 12px 14px',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          fontSize: '14px',
          backgroundColor: '#f8fafc',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: selectedLabel ? '#1e293b' : '#94a3b8',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selectedLabel
            ? <><span style={{ color: typeColor(selectedType), fontWeight: 700, marginRight: '6px', fontSize: '11px' }}>[{selectedType}]</span>{selectedLabel}</>
            : 'Search and select a file…'
          }
        </span>
        <span style={{ position: 'absolute', right: '12px', color: '#94a3b8', fontSize: '10px' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange(''); setQuery(''); }}
          style={{
            position: 'absolute', right: '32px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: '#94a3b8',
            cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '2px 6px',
          }}
          title="Clear selection"
        >
          x
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          backgroundColor: 'white', border: '1px solid #e2e8f0',
          borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          zIndex: 200, overflow: 'hidden',
          maxHeight: '340px', display: 'flex', flexDirection: 'column',
        }}>

          {/* Search */}
          <div style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
            <input
              autoFocus
              type="text"
              placeholder="Type to search files…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', padding: '8px 12px',
                border: '1px solid #e2e8f0', borderRadius: '8px',
                fontSize: '13px', outline: 'none',
                backgroundColor: 'white', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>

            {/* No link option */}
            <button
              type="button"
              onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px',
                background: !value ? '#eff6ff' : 'none',
                border: 'none', borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer', fontSize: '13px', color: '#64748b',
              }}
            >
              — No linked file
            </button>

            {filtered.length === 0 && (
              <p style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                No files match your search.
              </p>
            )}

            {/* Grouped by type */}
            {(['Court Case', 'Transaction', 'Letter'] as const).map(type => {
              const group = filtered.filter(f => f.type === type);
              if (!group.length) return null;
              return (
                <div key={type}>
                  <p style={{
                    margin: 0, padding: '6px 14px 4px',
                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.8px', color: typeColor(type),
                    backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9',
                  }}>
                    {type}s
                  </p>
                  {group.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => { onChange(f.id); setQuery(''); setOpen(false); }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 14px',
                        background: value === f.id ? '#eff6ff' : 'none',
                        border: 'none', borderBottom: '1px solid #f8fafc',
                        cursor: 'pointer', fontSize: '13px',
                        color: value === f.id ? '#1d4ed8' : '#334155',
                        fontWeight: value === f.id ? 600 : 400,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   MAIN PAGE
=========================================================== */
export default function LandTitleDetails() {
  const { id } = useParams();
  const {
    landTitles, updateLandTitle, addLandTitleNote,
    users, clients, transactions, courtCases, letters,
    currentUser, uploadLandTitleScan,
  } = useAppContext();
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const title = landTitles.find(t => t.id === id);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTakenModal, setShowTakenModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ── CUSTODY DAYS ────────────────────────────────────────────────────────
  // Days are ONLY counted while the status is "In Custody".
  // Any other status (Under Transaction, Released, Taken, Archived) returns 0.
  const daysInCustody = useMemo(() => {
    if (!title) return 0;
    if (title.status !== 'In Custody') return 0;
    const start = new Date(title.date_received);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [title]);

  const estimatedFee = useMemo(() => {
    const months = Math.ceil(daysInCustody / 30);
    return months * (title?.monthly_rate || 200000);
  }, [daysInCustody, title]);

  const timerColor = useMemo(() => {
    if (title?.status !== 'In Custody') return '#94a3b8';
    if (daysInCustody > 90) return '#ef4444';
    if (daysInCustody > 30) return '#f59e0b';
    return '#10b981';
  }, [daysInCustody, title?.status]);
  // ────────────────────────────────────────────────────────────────────────

  const handleStatusChange = async (
    newStatus: LandTitle['status'],
    takenInfo?: { by: string; reason: string }
  ) => {
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
      updates.date_released = updates.taken_at;
      await addLandTitleNote(title.id, `Taken by ${takenInfo.by}. Reason: ${takenInfo.reason}.`);
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
    setNewNote('');
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

  // Resolve linked file across all three sources
  const allFiles = [
    ...courtCases.map(c => ({ id: c.id, label: c.fileName, type: 'Court Case' })),
    ...transactions.map(t => ({ id: t.id, label: t.fileName, type: 'Transaction' })),
    ...letters.map(l => ({ id: l.id, label: l.subject || '(Letter)', type: 'Letter' })),
  ];
  const linkedFile = allFiles.find(f => f.id === title.transaction_id);

  const lawyer = users.find(u => u.id === title.handling_lawyer_id);

  return (
    <div style={styles.container}>

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/land-titles" style={styles.breadcrumb}>← Back to Register</Link>
          <h1 style={styles.title}>
            Title: {title.block && `Block ${title.block}, `}Plot {title.title_number}
          </h1>
          <div style={styles.headerBadges}>
            <StatusBadge status={title.status} />
            <span style={styles.typeBadge}>{title.title_type}</span>
          </div>
        </div>
        <div style={styles.headerActions}>
          {isAdminOrManager && (
            <>
              <button style={styles.editBtn} onClick={() => setShowEditModal(true)}>
                ✏️ Edit Details
              </button>
              {title.status !== 'Released' && title.status !== 'Taken' && (
                <>
                  <button style={styles.takenBtn} disabled={isUpdating} onClick={() => setShowTakenModal(true)}>
                    👤 Mark as Taken
                  </button>
                  <button style={styles.releaseBtn} disabled={isUpdating} onClick={() => handleStatusChange('Released')}>
                    📤 Mark as Released
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </header>

      <div style={styles.contentGrid}>

        {/* LEFT COL */}
        <div style={styles.leftCol}>

          {/* CUSTODY TIMER */}
          <div style={{ ...styles.card, borderTop: `6px solid ${timerColor}` }}>
            <h3 style={styles.cardTitle}>Custody Timer</h3>

            {title.status !== 'In Custody' ? (
              /* ── PAUSED STATE ── */
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontSize: '48px', fontWeight: 900, color: '#94a3b8', lineHeight: 1 }}>—</div>
                <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, marginTop: '10px' }}>
                  Timer paused
                </div>
                <div style={{
                  marginTop: '10px', padding: '8px 16px', display: 'inline-block',
                  backgroundColor: '#f1f5f9', borderRadius: '20px',
                  fontSize: '12px', color: '#475569', fontWeight: 600,
                }}>
                  Status: {title.status}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
                  Days only accrue while the title is <strong>In Custody</strong>.
                </div>
              </div>
            ) : (
              /* ── ACTIVE STATE ── */
              <>
                <div style={styles.timerWrapper}>
                  <div style={{ ...styles.timerDays, color: timerColor }}>{daysInCustody}</div>
                  <div style={styles.timerLabel}>Days in Custody</div>
                </div>
                <div style={styles.feeInfo}>
                  <div style={styles.feeRow}>
                    <span>Monthly Rate:</span>
                    <strong>UGX {(title.monthly_rate || 200000).toLocaleString()}</strong>
                  </div>
                  <div style={styles.feeRow}>
                    <span>Accrued Fee:</span>
                    <strong style={{ color: '#1e293b' }}>UGX {estimatedFee.toLocaleString()}</strong>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* TAKEN INFO */}
          {title.status === 'Taken' && (
            <div style={{ ...styles.card, borderLeft: '6px solid #6366f1' }}>
              <h3 style={styles.cardTitle}>Release Information (Taken)</h3>
              <div style={styles.infoGrid}>
                <InfoItem label="Taken By" value={title.taken_by || 'Not recorded'} />
                <InfoItem label="Date Taken" value={title.taken_at ? new Date(title.taken_at).toLocaleString() : 'Not recorded'} />
                <div style={{ gridColumn: 'span 2' }}>
                  <InfoItem label="Reason" value={title.taken_reason || 'No reason provided'} />
                </div>
              </div>
            </div>
          )}

          {/* MAIN INFO */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Title Information</h3>
            <div style={styles.infoGrid}>
              <InfoItem label="Block" value={title.block || 'Not specified'} />
              <InfoItem label="District" value={title.district || 'Not specified'} />
              <InfoItem label="County" value={title.county || 'Not specified'} />
              <InfoItem label="Location" value={title.location || 'Not specified'} />
              <InfoItem label="Size" value={title.size || 'Not specified'} />
              <InfoItem label="Storage" value={title.storage_location || 'Not specified'} />
              <InfoItem label="Lawyer" value={lawyer?.name || 'Unassigned'} />
              <InfoItem label="Received" value={new Date(title.date_received).toLocaleDateString()} />
            </div>
            {title.scanned_copy_url && (
              <div style={styles.scanSection}>
                <a href={title.scanned_copy_url} target="_blank" rel="noopener noreferrer" style={styles.scanLink}>
                  📄 View Scanned Copy: {title.scanned_copy_name || 'Download'}
                </a>
              </div>
            )}
          </div>

          {/* LINKED FILE */}
          {linkedFile && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Linked File</h3>
              <div style={styles.linkedTxBox}>
                <div style={styles.txIcon}>📁</div>
                <div style={styles.txInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                      borderRadius: '20px', backgroundColor: '#f1f5f9', color: '#475569',
                    }}>
                      {linkedFile.type}
                    </span>
                  </div>
                  <p style={styles.txName}>{linkedFile.label}</p>
                  <p style={styles.txMeta}>ID: {linkedFile.id}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COL: NOTES */}
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
                      {index !== (title.notes_history?.length || 0) - 1 && (
                        <div style={styles.timelineLine} />
                      )}
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
          clients={clients}
          transactions={transactions}
          courtCases={courtCases}
          letters={letters}
          onSubmit={updateLandTitle}
          uploadLandTitleScan={uploadLandTitleScan}
        />
      )}
      {showTakenModal && (
        <RecordTakenModal
          onClose={() => setShowTakenModal(false)}
          onSubmit={(info: any) => handleStatusChange('Taken', info)}
        />
      )}
    </div>
  );
}

/* ===========================================================
   SUB-COMPONENTS
=========================================================== */
function InfoItem({ label, value }: { label: string; value: string }) {
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
    <span style={{ ...styles.badge, backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
      {status}
    </span>
  );
}

function EditTitleModal({ title, onClose, onSubmit, users, clients, transactions, courtCases, letters, uploadLandTitleScan }: any) {
  const [formData, setFormData] = useState({ ...title });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Strip notes_history before saving — it is a joined relation, not a DB column,
      // and Supabase returns a 400 if it is included in an update payload.
      const { notes_history, ...dataToSave } = formData;
      await onSubmit(title.id, dataToSave);
      if (selectedFile) await uploadLandTitleScan(title.id, selectedFile);
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
            <FormField label="Plot Number">
              <input type="text" style={styles.input} value={formData.title_number} onChange={e => setFormData({ ...formData, title_number: e.target.value })} />
            </FormField>
            <FormField label="Owner Name">
              <input type="text" style={styles.input} value={formData.owner_name} onChange={e => setFormData({ ...formData, owner_name: e.target.value })} />
            </FormField>
            <FormField label="Block">
              <input type="text" style={styles.input} value={formData.block || ''} onChange={e => setFormData({ ...formData, block: e.target.value })} />
            </FormField>
            <FormField label="District">
              <input type="text" style={styles.input} value={formData.district || ''} onChange={e => setFormData({ ...formData, district: e.target.value })} />
            </FormField>
            <FormField label="County">
              <input type="text" style={styles.input} value={formData.county || ''} onChange={e => setFormData({ ...formData, county: e.target.value })} />
            </FormField>
            <FormField label="Location">
              <input type="text" style={styles.input} value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} />
            </FormField>
            <FormField label="Size">
              <input type="text" style={styles.input} value={formData.size || ''} onChange={e => setFormData({ ...formData, size: e.target.value })} />
            </FormField>
            <FormField label="Handling Lawyer">
              <select style={styles.input} value={formData.handling_lawyer_id} onChange={e => setFormData({ ...formData, handling_lawyer_id: e.target.value })}>
                <option value="">Select Lawyer</option>
                {users.filter((u: any) => u.role !== 'clerk').map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select style={styles.input} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                <option value="In Custody">In Custody</option>
                <option value="Under Transaction">Under Transaction</option>
                <option value="Archived">Archived</option>
                <option value="Released">Released</option>
                <option value="Taken">Taken</option>
              </select>
            </FormField>
            {formData.status === 'Taken' && (
              <>
                <FormField label="Taken By">
                  <input type="text" style={styles.input} value={formData.taken_by || ''} onChange={e => setFormData({ ...formData, taken_by: e.target.value })} />
                </FormField>
                <FormField label="Taken Reason">
                  <input type="text" style={styles.input} value={formData.taken_reason || ''} onChange={e => setFormData({ ...formData, taken_reason: e.target.value })} />
                </FormField>
              </>
            )}
            <FormField label="Client (optional)">
              <select style={styles.input} value={formData.client_id || ''}
                onChange={e => setFormData({ ...formData, client_id: e.target.value || null })}>
                <option value="">-- No client linked --</option>
                {(clients || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* SEARCHABLE FILE PICKER */}
          <FormField label="Linked File (Court Case / Transaction / Letter)">
            <SearchableFilePicker
              value={formData.transaction_id || ''}
              onChange={val => setFormData({ ...formData, transaction_id: val || null })}
              courtCases={courtCases}
              transactions={transactions}
              letters={letters}
            />
          </FormField>

          {/* SCAN UPLOAD */}
          <FormField label={formData.scanned_copy_url ? 'Scanned Copy (Replace)' : 'Scanned Copy (Upload)'}>
            <input type="file" accept=".pdf,image/*" style={styles.input} onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
            {formData.scanned_copy_url && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Current: {formData.scanned_copy_name}</span>
                <button type="button"
                  onClick={() => setFormData({ ...formData, scanned_copy_url: null, scanned_copy_name: null })}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                >
                  Remove
                </button>
              </div>
            )}
          </FormField>

          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={isSubmitting}>Cancel</button>
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordTakenModal({ onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({ by: '', reason: '' });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(formData); onClose(); };
  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalContent, maxWidth: '480px' }}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Record Taken Title</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <FormField label="Who took the title?">
            <input required type="text" style={styles.input} placeholder="Full name of the person"
              value={formData.by} onChange={e => setFormData({ ...formData, by: e.target.value })} />
          </FormField>
          <FormField label="Reason for taking">
            <textarea required style={{ ...styles.input, height: '100px', resize: 'none' }}
              placeholder="Why was the title taken out of custody?"
              value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
          </FormField>
          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={{ ...styles.submitBtn, backgroundColor: '#6366f1' }}>Record & Release</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.formGroup}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

/* ===========================================================
   STYLES (preserved exactly from original)
=========================================================== */
const styles: Record<string, React.CSSProperties> = {
  container: { padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' },
  headerLeft: { display: 'flex', flexDirection: 'column' },
  breadcrumb: { fontSize: '13px', color: '#64748b', textDecoration: 'none', fontWeight: 500, marginBottom: '12px', display: 'block' },
  title: { fontSize: '28px', fontWeight: 900, color: '#0B1F3A', margin: '0 0 12px 0', letterSpacing: '-1px' },
  headerBadges: { display: 'flex', gap: '10px' },
  typeBadge: { padding: '4px 12px', borderRadius: '20px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700, border: '1px solid #e2e8f0' },
  headerActions: { display: 'flex', gap: '12px' },
  editBtn: { padding: '10px 20px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#334155', fontWeight: 600, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  releaseBtn: { padding: '10px 20px', backgroundColor: '#10b981', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' },
  takenBtn: { padding: '10px 20px', backgroundColor: '#6366f1', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '32px' },
  rightCol: { display: 'flex', flexDirection: 'column' },
  card: { backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  cardTitle: { fontSize: '16px', fontWeight: 800, color: '#0B1F3A', margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.5px' },
  timerWrapper: { textAlign: 'center', padding: '20px 0' },
  timerDays: { fontSize: '64px', fontWeight: 900, lineHeight: 1 },
  timerLabel: { fontSize: '14px', color: '#64748b', fontWeight: 600, marginTop: '8px' },
  feeInfo: { marginTop: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  feeRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#64748b' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  infoLabel: { fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  infoValue: { fontSize: '15px', fontWeight: 600, color: '#1e293b' },
  scanSection: { marginTop: '24px', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '16px', border: '1px dashed #3b82f6', textAlign: 'center' },
  scanLink: { display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 700, textDecoration: 'none', fontSize: '14px' },
  linkedTxBox: { display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '16px', gap: '16px' },
  txIcon: { fontSize: '24px', backgroundColor: 'white', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' },
  txInfo: { flex: 1 },
  txName: { fontSize: '14px', fontWeight: 700, color: '#0B1F3A', margin: 0 },
  txMeta: { fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' },
  timelineContainer: { flex: 1, overflowY: 'auto', padding: '10px 5px', maxHeight: '400px' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '0' },
  timelineItem: { display: 'flex', gap: '20px', position: 'relative', paddingBottom: '25px' },
  timelineDot: { width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '3px solid #dbeafe', zIndex: 2, marginTop: '4px', flexShrink: 0 },
  timelineLine: { position: 'absolute', left: '7.5px', top: '16px', bottom: 0, width: '2px', backgroundColor: '#e2e8f0', zIndex: 1 },
  timelineContent: { flex: 1 },
  timelineHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  timelineAuthor: { fontSize: '12px', fontWeight: 800, color: '#0B1F3A' },
  timelineDate: { fontSize: '10px', color: '#94a3b8', fontWeight: 600 },
  timelineMessage: { fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-line' },
  noNotes: { textAlign: 'center', color: '#94a3b8', padding: '40px 0' },
  noteForm: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' },
  noteInput: { padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', height: '80px', resize: 'none', outline: 'none', backgroundColor: '#f8fafc' },
  noteSubmit: { padding: '10px 20px', backgroundColor: '#0B1F3A', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 },
  notFound: { padding: '80px 20px', textAlign: 'center', color: '#64748b' },
  backLink: { marginTop: '20px', display: 'inline-block', color: '#3b82f6', fontWeight: 600 },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modalContent: { backgroundColor: 'white', padding: '32px', borderRadius: '24px', width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' },
  modalTitle: { margin: 0, fontSize: '20px', fontWeight: 800, color: '#0B1F3A' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#475569' },
  input: { padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', width: '100%', boxSizing: 'border-box' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' },
  cancelBtn: { padding: '12px 24px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b', fontWeight: 600, cursor: 'pointer' },
  submitBtn: { padding: '12px 24px', backgroundColor: '#0B1F3A', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(11, 31, 58, 0.2)' },
};