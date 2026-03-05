import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type UserRole = "admin" | "manager" | "lawyer" | "clerk" | "accountant";
export interface User { id: string; name: string; email: string; role: UserRole; password: string; }
export interface AppNotification { id: string; recipientId: string; type: 'alert' | 'task' | 'file'; message: string; date: string; read: boolean; relatedId?: string; relatedType?: 'case' | 'transaction' | 'letter' | 'task'; }
export interface Task { id: string; title: string; description: string; assignedToId: string; assignedToName: string; assignedById: string; assignedByName: string; status: "Pending" | "Completed"; clerkNote?: string; dateCreated: string; }
export interface ProgressNote { id: string; message: string; authorId: string; authorName: string; authorRole: UserRole; date: string; }
export interface AppDocument { id: string; name: string; url: string; date: string; }
export interface Transaction { id: string; fileName: string; lawyerId: string; type: string; billedAmount?: number; paidAmount?: number; balance?: number; date?: string; archived?: boolean; documents?: AppDocument[]; progressNotes?: ProgressNote[]; }
export interface CourtCase { id: string; fileName: string; details?: string; billed?: number; paid?: number; balance?: number; status: "Ongoing" | "Completed"; nextCourtDate?: string; lawyerId?: string; archived?: boolean; documents?: AppDocument[]; progressNotes?: ProgressNote[]; }
export interface Letter { recipient: string; id: string; subject: string; type: "Incoming" | "Outgoing"; lawyerId?: string; status: "Pending" | "Completed"; date?: string; billed?: number; paid?: number; documents?: AppDocument[]; progressNotes?: ProgressNote[]; }
export interface Invoice { id: string; fileName: string; relatedFile: string; amountBilled: number; amountPaid: number; balance: number; isPaid: boolean; dateCreated: string; dueDate?: string; }
export interface Client { id: string; name: string; type: "Individual" | "Corporate"; email: string; phone: string; address: string; tinNumber?: string; dateAdded: string; }
export interface CommunicationLog { id: string; clientId: string; note: string; authorName: string; date: string; }

interface AppContextType {
  currentUser: User | null; setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  users: User[]; lawyers: User[]; addUser: (u: User) => void; deleteUser: (id: string) => void;
  login: (email: string, password: string) => Promise<boolean>; logout: () => void; setUsers: (u: User[]) => void;
  transactions: Transaction[]; addTransaction: (tx: Transaction) => Promise<void>;
  editTransaction: (id: string, data: Partial<Transaction>) => void; updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void; addTransactionProgress: (id: string, message: string) => void;
  editTransactionProgress: (txId: string, noteId: string, message: string) => void; deleteTransactionProgress: (txId: string, noteId: string) => void;
  uploadTransactionDocument: (id: string, file: File) => Promise<void>; deleteTransactionDocument: (txId: string, docId: string) => Promise<void>;
  courtCases: CourtCase[]; addCourtCase: (c: CourtCase) => void; editCourtCase: (id: string, data: Partial<CourtCase>) => void;
  updateCourtCase: (id: string, data: Partial<CourtCase>) => void; deleteCourtCase: (id: string) => void;
  addCourtCaseProgress: (id: string, message: string) => void; deleteCourtCaseProgress: (caseId: string, noteId: string) => void;
  uploadCourtCaseDocument: (caseId: string, file: File) => Promise<void>; deleteCourtCaseDocument: (caseId: string, docId: string) => Promise<void>;
  letters: Letter[]; addLetter: (l: Letter) => void; editLetter: (id: string, data: Partial<Letter>) => void;
  updateLetter: (id: string, data: Partial<Letter>) => void; deleteLetter: (id: string) => void;
  addLetterProgress: (id: string, message: string) => void; uploadLetterDocument: (letterId: string, file: File) => Promise<void>;
  deleteLetterDocument: (letterId: string, docId: string) => Promise<void>;
  invoices: Invoice[]; addInvoice: (inv: Invoice) => void; updateInvoice: (inv: Invoice) => void; deleteInvoice: (id: string) => void;
  clients: Client[]; addClient: (c: Client) => void; updateClient: (c: Client) => void; deleteClient: (id: string) => void;
  commLogs: CommunicationLog[]; addCommLog: (log: CommunicationLog) => void;
  tasks: Task[]; addTask: (task: Omit<Task, "id" | "status" | "dateCreated">) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => void; deleteTask: (id: string) => void; completeTask: (id: string, note: string) => void;
  notifications: AppNotification[];
  sendNotification: (recipientId: string, message: string, type: 'alert' | 'task' | 'file', relatedId?: string, relatedType?: 'case' | 'transaction' | 'letter' | 'task') => void;
  markNotificationsAsRead: (userId: string) => void; setNotifications: (n: AppNotification[]) => void;
  expenses: any[]; setExpenses: React.Dispatch<React.SetStateAction<any[]>>;
  firmName: string; setFirmName: React.Dispatch<React.SetStateAction<string>>;
  syncToCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const normalizeTask = (raw: any): Task => ({
  ...raw,
  assignedToId:   raw.assignedToId   ?? raw.assigned_to_id   ?? "",
  assignedToName: raw.assignedToName ?? raw.assigned_to_name ?? "",
  assignedById:   raw.assignedById   ?? raw.assigned_by_id   ?? "",
  assignedByName: raw.assignedByName ?? raw.assigned_by_name ?? "",
  dateCreated:    raw.dateCreated    ?? raw.date_created      ?? "",
  clerkNote:      raw.clerkNote      ?? raw.clerk_note        ?? undefined,
  status:         raw.status         ?? "Pending",
});

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
async function registerPushSubscription(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === "YOUR_VAPID_PUBLIC_KEY_HERE") return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
    await supabase.from('push_subscriptions').upsert({ userId, subscription: JSON.stringify(subscription), updatedAt: new Date().toISOString() }, { onConflict: 'userId' });
  } catch (err) { console.warn("Push subscription failed:", err); }
}
function showLocalNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/icon.png', badge: '/badge.png' });
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (!savedUser) return null;
    try { const parsed = JSON.parse(savedUser); if (parsed?.id && parsed?.role) return parsed; } catch {}
    localStorage.removeItem("currentUser"); return null;
  });

  const [users, setUsers]             = useState<User[]>(() => JSON.parse(localStorage.getItem("users") || '[{"id":"d70d4e47-1422-4501-961a-c1e69a1c15d7","name":"System Admin","email":"admin@nomoslink.com","role":"admin","password":"password123"}]'));
  const [transactions, setTransactions]   = useState<Transaction[]>(() => JSON.parse(localStorage.getItem("transactions") || "[]"));
  const [courtCases, setCourtCases]       = useState<CourtCase[]>(() => JSON.parse(localStorage.getItem("courtCases") || "[]"));
  const [letters, setLetters]             = useState<Letter[]>(() => JSON.parse(localStorage.getItem("letters") || "[]"));
  const [invoices, setInvoices]           = useState<Invoice[]>(() => JSON.parse(localStorage.getItem("invoices") || "[]"));
  const [clients, setClients]             = useState<Client[]>(() => JSON.parse(localStorage.getItem("clients") || "[]"));
  const [tasks, setTasks]                 = useState<Task[]>(() => JSON.parse(localStorage.getItem("tasks") || "[]").map(normalizeTask));
  const [commLogs, setCommLogs]           = useState<CommunicationLog[]>(() => JSON.parse(localStorage.getItem("commLogs") || "[]"));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => JSON.parse(localStorage.getItem("notifications") || "[]"));
  const [expenses, setExpenses]           = useState<any[]>(() => JSON.parse(localStorage.getItem("expenses") || "[]"));
  const [firmName, setFirmName]           = useState("Buwembo & Co. Advocates");

  const localNotifIds  = useRef<Set<string>>(new Set());
  const currentUserRef = useRef<User | null>(currentUser);
  const usersRef       = useRef<User[]>(users);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { usersRef.current = users; }, [users]);

  const getAdminIds = () => usersRef.current.filter(u => u.role === 'admin').map(u => u.id);

  const instantSave = async (table: string, payload: any) => {
    if (!navigator.onLine) return;
    try { const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' }); if (error) throw error; }
    catch (e) { console.error(`Save to ${table} failed:`, e); }
  };

  // Service worker registration
  useEffect(() => {
    if (!currentUser) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => registerPushSubscription(currentUser.id))
        .catch(err => console.warn("SW failed:", err));
    }
  }, [currentUser?.id]);

  // Tasks realtime — subscribed once, never resubscribes
  useEffect(() => {
    const channel = supabase.channel('tasks-only')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') setTasks(prev => prev.find(t => t.id === payload.new.id) ? prev : [...prev, normalizeTask(payload.new)]);
        else if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? normalizeTask(payload.new) : t));
        else if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Notifications realtime — filtered to current user only, no flood
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase.channel(`notifs-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `recipientId=eq.${currentUser.id}`
      }, (payload) => {
        setNotifications(prev => {
          if (prev.find(n => n.id === payload.new.id)) return prev;
          if (localNotifIds.current.has(payload.new.id)) return prev;
          const n = payload.new as AppNotification;
          if (document.hidden) showLocalNotification('NomoSLink', n.message);
          return [n, ...prev];
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  // Fetch all data once on mount
  useEffect(() => {
    (async () => {
      try {
        const [
          { data: courtData }, { data: txData }, { data: clientData },
          { data: letterData }, { data: userData }, { data: taskData },
          { data: invoiceData }, { data: expenseData }
        ] = await Promise.all([
          supabase.from('court_cases').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('clients').select('*').order('dateAdded', { ascending: false }),
          supabase.from('letters').select('*'),
          supabase.from('users').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('invoices').select('*'),
          supabase.from('expenses').select('*').order('date', { ascending: false })
        ]);
        const merge = (local: any[], cloud: any[] | null) => {
          if (!cloud) return local;
          const ids = new Set(cloud.map((i: any) => i.id));
          return [...cloud, ...local.filter((i: any) => !ids.has(i.id))];
        };
        if (courtData)   setCourtCases(p => merge(p, courtData));
        if (txData)      setTransactions(p => merge(p, txData));
        if (clientData)  setClients(p => merge(p, clientData));
        if (letterData)  setLetters(p => merge(p, letterData));
        if (userData)    setUsers(p => merge(p, userData));
        if (taskData)    setTasks(p => merge(p, taskData).map(normalizeTask));
        if (invoiceData) setInvoices(p => merge(p, invoiceData));
        if (expenseData) setExpenses(p => merge(p, expenseData));
      } catch (err) { console.error("Initial load failed.", err); }
    })();
  }, []);

  // Fetch only current user's notifications (last 50) — prevents loading hundreds of rows
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase.from('notifications').select('*')
      .eq('recipientId', currentUser.id)
      .order('date', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setNotifications(data); });
  }, [currentUser?.id]);

  const sendNotification = (
    recipientId: string, message: string, type: 'alert' | 'task' | 'file' = 'alert',
    relatedId?: string, relatedType?: 'case' | 'transaction' | 'letter' | 'task'
  ) => {
    const adminIds = getAdminIds();
    const allRecipients = Array.from(new Set([recipientId, ...adminIds]));
    const now = Date.now();

    const newNotifs: AppNotification[] = allRecipients.map(rid => ({
      id: `NOTIF-${now}-${rid}`, recipientId: rid, message, type,
      date: new Date().toLocaleString(), read: false, relatedId, relatedType
    }));

    // Update local state only for current user — no flooding other users' state
    const myId = currentUserRef.current?.id;
    setNotifications(prev => {
      const mine = newNotifs.filter(n => n.recipientId === myId);
      const fresh = mine.filter(n => !prev.some(p => p.recipientId === n.recipientId && p.message === message && (now - new Date(p.date).getTime() < 3000)));
      if (fresh.length === 0) return prev;
      fresh.forEach(n => { localNotifIds.current.add(n.id); setTimeout(() => localNotifIds.current.delete(n.id), 10000); });
      return [...fresh, ...prev];
    });

    // Persist all to DB (other users fetch theirs on login)
    newNotifs.forEach(n => {
      localNotifIds.current.add(n.id);
      setTimeout(() => localNotifIds.current.delete(n.id), 10000);
      supabase.from('notifications').upsert(n, { onConflict: 'id' }).then();
    });

    if (navigator.onLine) {
      allRecipients.forEach(rid => {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}` },
          body: JSON.stringify({ userId: rid, title: 'NomoSLink', body: message, url: '/' })
        }).catch(() => {});
      });
    }
  };

  const markNotificationsAsRead = async (userId: string) => {
    setNotifications(prev => prev.map(n => n.recipientId === userId ? { ...n, read: true } : n));
    if (navigator.onLine) await supabase.from('notifications').update({ read: true }).eq('recipientId', userId);
  };

  const syncToCloud = async () => {
    if (!navigator.onLine || !currentUser) return;
    try {
      await Promise.all([
        supabase.from('expenses').upsert(expenses, { onConflict: 'id' }),
        supabase.from('clients').upsert(clients, { onConflict: 'id' }),
        supabase.from('letters').upsert(letters, { onConflict: 'id' }),
        supabase.from('invoices').upsert(invoices, { onConflict: 'id' }),
        supabase.from('transactions').upsert(transactions, { onConflict: 'id' }),
        supabase.from('court_cases').upsert(courtCases, { onConflict: 'id' }),
        supabase.from('users').upsert(users, { onConflict: 'id' }),
        supabase.from('tasks').upsert(tasks, { onConflict: 'id' }),
      ]);
    } catch (e) { console.error("Sync failed:", e); }
  };

  const login = async (email: string, password: string) => {
    let user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      const { data } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
      if (data) user = data;
    }
    if (!user) return false;
    setCurrentUser(user);
    localStorage.setItem("currentUser", JSON.stringify(user));
    return true;
  };

  const logout = () => { localStorage.removeItem("currentUser"); setCurrentUser(null); window.location.href = "/"; };
  const addUser    = (user: User)   => { setUsers(p => [...p, user]); instantSave('users', user); };
  const deleteUser = async (id: string) => { setUsers(p => p.filter(u => u.id !== id)); if (navigator.onLine) await supabase.from('users').delete().eq('id', id); };
  const lawyers    = users.filter(u => u.role !== "admin");

  const addTransaction = async (tx: Transaction) => {
    const { id, archived, ...cleanData } = tx as any;
    const { data, error } = await supabase.from('transactions').insert([cleanData]).select().single();
    if (error) { console.error("Supabase Error:", error.message); return; }
    if (data) setTransactions(p => [...p, data]);
  };

  const editTransaction = (id: string, data: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...data };
      const billed = Number(updated.billedAmount) || 0, paid = Number(updated.paidAmount) || 0;
      const final = { ...updated, billedAmount: billed, paidAmount: paid, balance: billed - paid };
      const { progressNotes, documents, ...dbSafe } = final as any;
      instantSave('transactions', dbSafe); return final;
    }));
  };

  const deleteTransaction = (id: string) => { setTransactions(p => p.filter(t => t.id !== id)); if (navigator.onLine) supabase.from('transactions').delete().eq('id', id).then(); };

  const addTransactionProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setTransactions(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, progressNotes: [...(t.progressNotes || []), { id: crypto.randomUUID(), message, authorId: currentUser.id, authorName: currentUser.name, authorRole: currentUser.role, date: new Date().toLocaleString() }] };
      supabase.from('transactions').update({ progressNotes: updated.progressNotes }).eq('id', id).then();
      if (t.lawyerId && String(t.lawyerId) !== String(currentUser.id)) {
        sendNotification(t.lawyerId, `📁 Transaction Update: ${t.fileName} — "${message}"`, 'file', t.id, 'transaction');
      } else {
        getAdminIds().forEach(adminId => { if (String(adminId) !== String(currentUser.id)) sendNotification(adminId, `📁 Transaction Update: ${t.fileName} — "${message}"`, 'file', t.id, 'transaction'); });
      }
      return updated;
    }));
  };

  const editTransactionProgress = (txId: string, noteId: string, message: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id !== txId) return t;
      const updatedNotes = (t.progressNotes || []).map(n => n.id === noteId ? { ...n, message } : n);
      supabase.from('transactions').update({ progressNotes: updatedNotes }).eq('id', txId).then();
      return { ...t, progressNotes: updatedNotes };
    }));
  };

  const deleteTransactionProgress = (txId: string, noteId: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id !== txId) return t;
      const updatedNotes = (t.progressNotes || []).filter(n => n.id !== noteId);
      supabase.from('transactions').update({ progressNotes: updatedNotes }).eq('id', txId).then();
      return { ...t, progressNotes: updatedNotes };
    }));
  };

  const uploadTransactionDocument = async (txId: string, file: File) => {
    try {
      const filePath = `tx-docs/${txId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('transactions').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('transactions').getPublicUrl(filePath);
      const newDoc: AppDocument = { id: crypto.randomUUID(), name: file.name, url: publicUrl, date: new Date().toLocaleDateString() };
      setTransactions(prev => prev.map(t => {
        if (t.id !== txId) return t;
        const updatedDocs = [...(t.documents || []), newDoc];
        supabase.from('transactions').update({ documents: updatedDocs }).eq('id', txId).then();
        return { ...t, documents: updatedDocs };
      }));
    } catch (err) { console.error("Tx Upload failed", err); }
  };

  const deleteTransactionDocument = async (txId: string, docId: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id !== txId) return t;
      const updatedDocs = (t.documents || []).filter(d => d.id !== docId);
      supabase.from('transactions').update({ documents: updatedDocs }).eq('id', txId).then();
      return { ...t, documents: updatedDocs };
    }));
  };

  const addCourtCase    = (c: CourtCase) => { setCourtCases(p => [...p, c]); instantSave('court_cases', c); };
  const editCourtCase   = (id: string, data: Partial<CourtCase>) => setCourtCases(prev => prev.map(c => { if (c.id !== id) return c; const u = { ...c, ...data }; instantSave('court_cases', u); return u; }));
  const deleteCourtCase = (id: string) => { setCourtCases(p => p.filter(c => c.id !== id)); if (navigator.onLine) supabase.from('court_cases').delete().eq('id', id).then(); };

  const addCourtCaseProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setCourtCases(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newNote: ProgressNote = { id: crypto.randomUUID(), message, authorId: currentUser.id, authorName: currentUser.name, authorRole: currentUser.role, date: new Date().toLocaleString() };
      const updated = { ...c, progressNotes: [...(c.progressNotes || []), newNote] };
      supabase.from('court_cases').update({ progressNotes: updated.progressNotes }).eq('id', id).then();
      if (c.lawyerId && String(c.lawyerId) !== String(currentUser.id)) {
        sendNotification(c.lawyerId, `⚖️ Court Case Update: ${c.fileName} — "${message}"`, 'file', c.id, 'case');
      } else {
        getAdminIds().forEach(adminId => { if (String(adminId) !== String(currentUser.id)) sendNotification(adminId, `⚖️ Court Case Update: ${c.fileName} — "${message}"`, 'file', c.id, 'case'); });
      }
      return updated;
    }));
  };

  const deleteCourtCaseProgress = (caseId: string, noteId: string) => {
    setCourtCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const updatedNotes = (c.progressNotes || []).filter(n => n.id !== noteId);
      supabase.from('court_cases').update({ progressNotes: updatedNotes }).eq('id', caseId).then();
      return { ...c, progressNotes: updatedNotes };
    }));
  };

  const uploadCourtCaseDocument = async (caseId: string, file: File) => {
    try {
      const filePath = `court-docs/${caseId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
      const newDoc: AppDocument = { id: crypto.randomUUID(), name: file.name, url: publicUrl, date: new Date().toLocaleDateString() };
      setCourtCases(prev => prev.map(c => { if (c.id !== caseId) return c; const d = [...(c.documents || []), newDoc]; supabase.from('court_cases').update({ documents: d }).eq('id', caseId).then(); return { ...c, documents: d }; }));
    } catch (err) { console.error("Upload failed", err); }
  };

  const deleteCourtCaseDocument = async (caseId: string, docId: string) => {
    setCourtCases(prev => prev.map(c => { if (c.id !== caseId) return c; const d = (c.documents || []).filter(x => x.id !== docId); supabase.from('court_cases').update({ documents: d }).eq('id', caseId).then(); return { ...c, documents: d }; }));
  };

  const addLetter    = (l: Letter) => { setLetters(p => [...p, l]); instantSave('letters', l); };
  const editLetter   = (id: string, data: Partial<Letter>) => setLetters(prev => prev.map(l => { if (l.id !== id) return l; const u = { ...l, ...data }; const { progressNotes, documents, ...dbSafe } = u as any; instantSave('letters', dbSafe); return u; }));
  const deleteLetter = (id: string) => { setLetters(p => p.filter(l => l.id !== id)); if (navigator.onLine) supabase.from('letters').delete().eq('id', id).then(); };

  const addLetterProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setLetters(prev => prev.map(l => {
      if (l.id !== id) return l;
      const newNote: ProgressNote = { id: crypto.randomUUID(), message, authorId: currentUser.id, authorName: currentUser.name, authorRole: currentUser.role, date: new Date().toLocaleString() };
      const updated = { ...l, progressNotes: [...(l.progressNotes || []), newNote] };
      supabase.from('letters').update({ progressNotes: updated.progressNotes }).eq('id', id).then();
      if (l.lawyerId && String(l.lawyerId) !== String(currentUser.id)) {
        sendNotification(l.lawyerId, `✉️ Letter Update: ${l.subject} — "${message}"`, 'file', l.id, 'letter');
      } else {
        getAdminIds().forEach(adminId => { if (String(adminId) !== String(currentUser.id)) sendNotification(adminId, `✉️ Letter Update: ${l.subject} — "${message}"`, 'file', l.id, 'letter'); });
      }
      return updated;
    }));
  };

  const uploadLetterDocument = async (letterId: string, file: File) => {
    try {
      const filePath = `letter-docs/${letterId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('letters').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('letters').getPublicUrl(filePath);
      const newDoc: AppDocument = { id: crypto.randomUUID(), name: file.name, url: publicUrl, date: new Date().toLocaleDateString() };
      setLetters(prev => prev.map(l => { if (l.id !== letterId) return l; const d = [...(l.documents || []), newDoc]; supabase.from('letters').update({ documents: d }).eq('id', letterId).then(); return { ...l, documents: d }; }));
    } catch (err) { console.error("Letter Upload failed", err); }
  };

  const deleteLetterDocument = async (letterId: string, docId: string) => {
    setLetters(prev => prev.map(l => { if (l.id !== letterId) return l; const d = (l.documents || []).filter(x => x.id !== docId); supabase.from('letters').update({ documents: d }).eq('id', letterId).then(); return { ...l, documents: d }; }));
  };

  const addInvoice    = (inv: Invoice) => { setInvoices(p => [...p, inv]); instantSave('invoices', inv); };
  const updateInvoice = (inv: Invoice) => { setInvoices(p => p.map(i => i.id === inv.id ? inv : i)); instantSave('invoices', inv); };
  const deleteInvoice = (id: string)   => { setInvoices(p => p.filter(i => i.id !== id)); if (navigator.onLine) supabase.from('invoices').delete().eq('id', id).then(); };
  const addClient     = (c: Client)    => { setClients(p => [...p, c]); instantSave('clients', c); };
  const updateClient  = (c: Client)    => { setClients(p => p.map(x => x.id === c.id ? c : x)); instantSave('clients', c); };
  const deleteClient  = (id: string)   => { setClients(p => p.filter(c => c.id !== id)); if (navigator.onLine) supabase.from('clients').delete().eq('id', id).then(); };

  const addTask = async (taskData: Omit<Task, "id" | "status" | "dateCreated">) => {
    const newTask: Task = { ...taskData, id: crypto.randomUUID(), status: "Pending", dateCreated: new Date().toISOString() };
    setTasks(p => [...p, normalizeTask(newTask)]);
    const { error } = await supabase.from('tasks').insert([newTask]);
    if (error) console.error("Task sync failed:", error);
    sendNotification(taskData.assignedToId, `📋 New Task from ${taskData.assignedByName}: "${taskData.title}"`, 'task', newTask.id, 'task');
  };

  const updateTask  = (id: string, data: Partial<Task>) => setTasks(prev => prev.map(t => { if (t.id !== id) return t; const u = { ...t, ...data }; instantSave('tasks', u); return u; }));
  const deleteTask  = (id: string) => { setTasks(p => p.filter(t => t.id !== id)); supabase.from('tasks').delete().eq('id', id).then(); };
  const completeTask = (id: string, note: string) => {
    const task = tasks.find(t => t.id === id);
    updateTask(id, { status: "Completed", clerkNote: note });
    if (task) sendNotification(task.assignedById, `✅ Task Completed by ${task.assignedToName}: "${task.title}" — "${note}"`, 'task', task.id, 'task');
  };

  // localStorage — split to prevent notification loop
  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("transactions", JSON.stringify(transactions));
    localStorage.setItem("courtCases", JSON.stringify(courtCases));
    localStorage.setItem("letters", JSON.stringify(letters));
    localStorage.setItem("invoices", JSON.stringify(invoices));
    localStorage.setItem("clients", JSON.stringify(clients));
    localStorage.setItem("tasks", JSON.stringify(tasks));
    localStorage.setItem("commLogs", JSON.stringify(commLogs));
    localStorage.setItem("expenses", JSON.stringify(expenses));
    if (currentUser) localStorage.setItem("currentUser", JSON.stringify(currentUser));
  }, [users, transactions, courtCases, letters, invoices, clients, tasks, commLogs, expenses, currentUser]);

  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem("notifications", JSON.stringify(notifications)), 1000);
    return () => clearTimeout(t);
  }, [notifications]);

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, users, setUsers, lawyers, addUser, deleteUser, login, logout,
      transactions, addTransaction, editTransaction, updateTransaction: editTransaction, deleteTransaction,
      addTransactionProgress, editTransactionProgress, deleteTransactionProgress, uploadTransactionDocument, deleteTransactionDocument,
      courtCases, addCourtCase, editCourtCase, updateCourtCase: editCourtCase, deleteCourtCase,
      addCourtCaseProgress, deleteCourtCaseProgress, uploadCourtCaseDocument, deleteCourtCaseDocument,
      letters, addLetter, editLetter, updateLetter: editLetter, deleteLetter, addLetterProgress, uploadLetterDocument, deleteLetterDocument,
      invoices, addInvoice, updateInvoice, deleteInvoice,
      clients, addClient, updateClient, deleteClient,
      commLogs, addCommLog: (log) => { setCommLogs(p => [...p, log]); instantSave('commLogs', log); },
      tasks, addTask, updateTask, deleteTask, completeTask,
      notifications, sendNotification, markNotificationsAsRead, setNotifications,
      expenses, setExpenses, firmName, setFirmName, syncToCloud
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};