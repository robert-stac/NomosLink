import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/* =======================
    TYPES
======================= */
export type UserRole = "admin" | "manager" | "lawyer" | "clerk" | "accountant";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  type: 'alert' | 'task' | 'file';
  message: string;
  date: string;
  read: boolean;
  relatedId?: string;
  relatedType?: 'case' | 'transaction' | 'letter' | 'task';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
  status: "Pending" | "Completed";
  clerkNote?: string;
  dateCreated: string;
}

export interface ProgressNote {
  id: string;
  message: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  date: string;
}

export interface AppDocument {
  id: string;
  name: string;
  url: string;
  date: string;
}

export interface Transaction {
  id: string;
  fileName: string;
  lawyerId: string;
  type: string;
  billedAmount?: number;
  paidAmount?: number;
  balance?: number;
  date?: string;
  archived?: boolean;
  documents?: AppDocument[];
  progressNotes?: ProgressNote[];
}

export interface CourtCase {
  id: string;
  fileName: string;
  details?: string;
  billed?: number;
  paid?: number;
  balance?: number;
  status: "Ongoing" | "Completed";
  nextCourtDate?: string;
  lawyerId?: string;
  archived?: boolean;
  documents?: AppDocument[];
  progressNotes?: ProgressNote[];
}

export interface Letter {
  recipient: string;
  id: string;
  subject: string;
  type: "Incoming" | "Outgoing";
  lawyerId?: string;
  status: "Pending" | "Completed";
  archived?: boolean;
  date?: string;
  billed?: number;
  paid?: number;
  documents?: AppDocument[];
  progressNotes?: ProgressNote[];
}

export interface Invoice {
  id: string;
  fileName: string;
  relatedFile: string;
  amountBilled: number;
  amountPaid: number;
  balance: number;
  isPaid: boolean;
  dateCreated: string;
  dueDate?: string;
}

export interface Client {
  id: string;
  name: string;
  type: "Individual" | "Corporate";
  email: string;
  phone: string;
  address: string;
  tinNumber?: string;
  dateAdded: string;
}

export interface CommunicationLog {
  id: string;
  clientId: string;
  note: string;
  authorName: string;
  date: string;
}

/* =======================
    CONTEXT TYPE
======================= */
interface AppContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  users: User[];
  lawyers: User[];
  addUser: (user: User) => void;
  deleteUser: (id: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUsers: (users: User[]) => void;

  transactions: Transaction[];
  addTransaction: (tx: Transaction) => Promise<void>;
  editTransaction: (id: string, data: Partial<Transaction>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addTransactionProgress: (id: string, message: string) => void;
  editTransactionProgress: (txId: string, noteId: string, message: string) => void;
  deleteTransactionProgress: (txId: string, noteId: string) => void;
  uploadTransactionDocument: (id: string, file: File) => Promise<void>;
  deleteTransactionDocument: (txId: string, docId: string) => Promise<void>;

  courtCases: CourtCase[];
  addCourtCase: (c: CourtCase) => void;
  editCourtCase: (id: string, data: Partial<CourtCase>) => void;
  updateCourtCase: (id: string, data: Partial<CourtCase>) => void;
  deleteCourtCase: (id: string) => void;
  addCourtCaseProgress: (id: string, message: string) => void;
  deleteCourtCaseProgress: (caseId: string, noteId: string) => void;
  uploadCourtCaseDocument: (caseId: string, file: File) => Promise<void>;
  deleteCourtCaseDocument: (caseId: string, docId: string) => Promise<void>;

  letters: Letter[];
  addLetter: (l: Letter) => void;
  editLetter: (id: string, data: Partial<Letter>) => void;
  updateLetter: (id: string, data: Partial<Letter>) => void;
  deleteLetter: (id: string) => void;
  addLetterProgress: (id: string, message: string) => void;
  uploadLetterDocument: (letterId: string, file: File) => Promise<void>;
  deleteLetterDocument: (letterId: string, docId: string) => Promise<void>;

  invoices: Invoice[];
  addInvoice: (inv: Invoice) => void;
  updateInvoice: (inv: Invoice) => void;
  deleteInvoice: (id: string) => void;

  clients: Client[];
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;

  commLogs: CommunicationLog[];
  addCommLog: (log: CommunicationLog) => void;

  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "status" | "dateCreated">) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (taskId: string, note: string) => void;

  notifications: AppNotification[];
  sendNotification: (recipientId: string, message: string, type: 'alert' | 'task' | 'file', relatedId?: string, relatedType?: 'case' | 'transaction' | 'letter' | 'task') => void;
  markNotificationsAsRead: (userId: string) => void;
  setNotifications: (notifications: AppNotification[]) => void;

  expenses: any[];
  setExpenses: React.Dispatch<React.SetStateAction<any[]>>;
  firmName: string;
  setFirmName: React.Dispatch<React.SetStateAction<string>>;

  syncToCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/* =======================
    NORMALIZE TASK
======================= */
const normalizeTask = (raw: any): Task => ({
  ...raw,
  assignedToId: raw.assignedToId ?? raw.assigned_to_id ?? "",
  assignedToName: raw.assignedToName ?? raw.assigned_to_name ?? "",
  assignedById: raw.assignedById ?? raw.assigned_by_id ?? "",
  assignedByName: raw.assignedByName ?? raw.assigned_by_name ?? "",
  dateCreated: raw.dateCreated ?? raw.date_created ?? "",
  clerkNote: raw.clerkNote ?? raw.clerk_note ?? undefined,
  status: raw.status ?? "Pending",
});

/* =======================
    WEB PUSH HELPERS
======================= */
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
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await supabase.from('push_subscriptions').upsert({
      userId,
      subscription: JSON.stringify(subscription),
      updatedAt: new Date().toISOString(),
    }, { onConflict: 'userId' });
  } catch (err) {
    console.warn("Push subscription failed:", err);
  }
}

/* =======================
    PROVIDER
======================= */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (!savedUser) return null;
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.id && parsed.role) return parsed;
      localStorage.removeItem("currentUser");
      return null;
    } catch (e) {
      localStorage.removeItem("currentUser");
      return null;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem("users");
    return stored ? JSON.parse(stored) : [{
      id: "d70d4e47-1422-4501-961a-c1e69a1c15d7",
      name: "System Admin",
      email: "admin@buwembo.com",
      role: "admin",
      password: "password123"
    }];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => JSON.parse(localStorage.getItem("transactions") || "[]"));
  const [courtCases, setCourtCases] = useState<CourtCase[]>(() => JSON.parse(localStorage.getItem("courtCases") || "[]"));
  const [letters, setLetters] = useState<Letter[]>(() => JSON.parse(localStorage.getItem("letters") || "[]"));
  const [invoices, setInvoices] = useState<Invoice[]>(() => JSON.parse(localStorage.getItem("invoices") || "[]"));
  const [clients, setClients] = useState<Client[]>(() => JSON.parse(localStorage.getItem("clients") || "[]"));
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem("tasks") || "[]").map(normalizeTask));
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>(() => JSON.parse(localStorage.getItem("commLogs") || "[]"));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => JSON.parse(localStorage.getItem("notifications") || "[]"));
  const [expenses, setExpenses] = useState<any[]>(() => JSON.parse(localStorage.getItem("expenses") || "[]"));
  const [firmName, setFirmName] = useState("Buwembo & Co. Advocates");

  const localNotifIds = useRef<Set<string>>(new Set());
  const currentUserRef = useRef<User | null>(currentUser);
  const usersRef = useRef<User[]>(users);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { usersRef.current = users; }, [users]);

  const getAdminIds = () => usersRef.current.filter(u => u.role === 'admin').map(u => u.id);
  const getManagerIds = () => usersRef.current.filter(u => u.role === 'manager').map(u => u.id);

  /* =======================
      SEND EMAIL
  ======================= */
  const sendEmail = (to: string, subject: string, html: string) => {
    if (!navigator.onLine || !to) return;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ to, subject, html }),
    }).catch(() => { });
  };

  /* =======================
      EMAIL TEMPLATE
  ======================= */
  const buildProgressEmail = (
    recipientName: string,
    authorName: string,
    authorRole: string,
    fileTitle: string,
    fileType: string,
    message: string,
  ) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;">
      <div style="background:#0B1F3A;padding:24px 32px;border-radius:16px 16px 0 0;">
        <h2 style="color:white;margin:0;font-size:20px;font-weight:900;letter-spacing:-0.5px;">NomosLink</h2>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">File Update Notification</p>
      </div>
      <div style="background:white;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
        <p style="color:#64748b;font-size:14px;">Hi <strong>${recipientName}</strong>,</p>
        <p style="color:#64748b;font-size:14px;">A new update has been posted to one of your files by <strong>${authorName}</strong> (${authorRole}).</p>
        <div style="background:#f1f5f9;border-left:4px solid #0B1F3A;padding:16px 20px;border-radius:0 12px 12px 0;margin:24px 0;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">${fileType}</p>
          <p style="margin:0 0 12px;font-size:16px;font-weight:900;color:#0B1F3A;">${fileTitle}</p>
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">"${message}"</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #f1f5f9;padding-top:16px;">
          This is an automated notification from NomosLink Legal Management System for <strong>Buwembo & Co. Advocates</strong>.<br/>
          Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  const instantSave = async (table: string, payload: any) => {
    if (!navigator.onLine) return;
    try {
      const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.error(`Save to ${table} failed:`, e);
    }
  };

  /* =======================
      PUSH SUBSCRIPTION
  ======================= */
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      registerPushSubscription(currentUser.id);
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentUser?.id]);

  /* =======================
      HELPER: Build set of manager IDs to notify for a file
      Includes managers assigned to the file (lawyerId) +
      managers who have previously commented on it.
      Excludes the current user (don't notify self).
  ======================= */
  const getManagersToNotify = (
    lawyerId: string | undefined,
    progressNotes: ProgressNote[],
    currentUserId: string
  ): Set<string> => {
    const managers = new Set<string>();

    // Managers who previously commented
    progressNotes
      .filter(n => n.authorRole === 'manager')
      .forEach(n => managers.add(String(n.authorId)));

    // Manager assigned to this file via lawyerId
    if (lawyerId) {
      const assignedUser = usersRef.current.find(u => String(u.id) === String(lawyerId));
      if (assignedUser?.role === 'manager') managers.add(String(lawyerId));
    }

    // Never notify the person who just posted the note
    managers.delete(String(currentUserId));

    return managers;
  };

  /* =======================
      TASKS REALTIME
  ======================= */
  useEffect(() => {
    const channel = supabase
      .channel('tasks-only')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => prev.find(t => t.id === payload.new.id) ? prev : [...prev, normalizeTask(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? normalizeTask(payload.new) : t));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* =======================
      NOTIFICATIONS REALTIME
  ======================= */
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`notifs-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipientId=eq.${currentUser.id}`,
      }, (payload) => {
        setNotifications(prev => {
          if (prev.find(n => n.id === payload.new.id)) return prev;
          if (localNotifIds.current.has(payload.new.id)) return prev;
          const newNotif = payload.new as AppNotification;
          if (document.hidden) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('NomoSLink', { body: newNotif.message, icon: '/icon.png' });
            }
          }
          return [newNotif, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  /* =======================
      INITIAL DATA FETCH
  ======================= */
  useEffect(() => {
    (async () => {
      try {
        const [
          { data: courtData },
          { data: txData },
          { data: clientData },
          { data: letterData },
          { data: userData },
          { data: taskData },
          { data: invoiceData },
          { data: expenseData },
        ] = await Promise.all([
          supabase.from('court_cases').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('clients').select('*').order('dateAdded', { ascending: false }),
          supabase.from('letters').select('*'),
          supabase.from('users').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('invoices').select('*'),
          supabase.from('expenses').select('*').order('date', { ascending: false }),
        ]);

        const merge = (local: any[], cloud: any[] | null) => {
          if (!cloud) return local;
          const cloudIds = new Set(cloud.map((i: any) => i.id));
          return [...cloud, ...local.filter((i: any) => !cloudIds.has(i.id))];
        };

        if (courtData) setCourtCases(prev => merge(prev, courtData));
        if (txData) setTransactions(prev => merge(prev, txData));
        if (clientData) setClients(prev => merge(prev, clientData));
        if (letterData) setLetters(prev => merge(prev, letterData));
        if (userData) setUsers(prev => merge(prev, userData));
        if (taskData) setTasks(prev => merge(prev, taskData).map(normalizeTask));
        if (invoiceData) setInvoices(prev => merge(prev, invoiceData));
        if (expenseData) setExpenses(prev => merge(prev, expenseData));
      } catch (err) {
        console.error("Initial load failed.", err);
      }
    })();
  }, []);

  /* =======================
      NOTIFICATIONS FETCH
  ======================= */
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('recipientId', currentUser.id)
      .order('date', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setNotifications(data); });
  }, [currentUser?.id]);

  /* =======================
      SEND NOTIFICATION
  ======================= */
  const sendNotification = (
    recipientId: string,
    message: string,
    type: 'alert' | 'task' | 'file' = 'alert',
    relatedId?: string,
    relatedType?: 'case' | 'transaction' | 'letter' | 'task'
  ) => {
    const adminIds = getAdminIds();
    const allRecipients = Array.from(new Set([recipientId, ...adminIds]));
    const now = Date.now();

    const newNotifs: AppNotification[] = allRecipients.map(rid => ({
      id: `NOTIF-${now}-${rid}`,
      recipientId: rid,
      message,
      type,
      date: new Date().toLocaleString(),
      read: false,
      relatedId,
      relatedType,
    }));

    const myId = currentUserRef.current?.id;
    setNotifications(prev => {
      const mine = newNotifs.filter(n => n.recipientId === myId);
      const fresh = mine.filter(newNotif =>
        !prev.some(n =>
          n.recipientId === newNotif.recipientId &&
          n.message === message &&
          (now - new Date(n.date).getTime() < 3000)
        )
      );
      if (fresh.length === 0) return prev;
      fresh.forEach(n => {
        localNotifIds.current.add(n.id);
        setTimeout(() => localNotifIds.current.delete(n.id), 10000);
      });
      return [...fresh, ...prev];
    });

    newNotifs.forEach(n => {
      localNotifIds.current.add(n.id);
      setTimeout(() => localNotifIds.current.delete(n.id), 10000);
      supabase.from('notifications').upsert(n, { onConflict: 'id' }).then();
    });

    if (navigator.onLine) {
      allRecipients.forEach(rid => {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({ userId: rid, title: 'NomoSLink', body: message, url: '/' }),
        }).catch(() => { });
      });
    }
  };

  const markNotificationsAsRead = async (userId: string) => {
    setNotifications(prev => prev.map(n => n.recipientId === userId ? { ...n, read: true } : n));
    if (navigator.onLine) {
      await supabase.from('notifications').update({ read: true }).eq('recipientId', userId);
    }
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
      console.log("Full sync successful.");
    } catch (e) {
      console.error("Full sync failed:", e);
    }
  };

  const login = async (email: string, password: string) => {
    let user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      const { data } = await supabase
        .from('users').select('*')
        .eq('email', email).eq('password', password).single();
      if (data) user = data;
    }
    if (!user) return false;
    setCurrentUser(user);
    localStorage.setItem("currentUser", JSON.stringify(user));
    return true;
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    window.location.href = "/";
  };

  const addUser = (user: User) => { setUsers(prev => [...prev, user]); instantSave('users', user); };
  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    if (navigator.onLine) await supabase.from('users').delete().eq('id', id);
  };
  const lawyers = users.filter(u => u.role !== "admin");

  /* =======================
      TRANSACTIONS
  ======================= */
  const addTransaction = async (tx: Transaction) => {
    const { id, archived, ...cleanData } = tx as any;
    const { data, error } = await supabase.from('transactions').insert([cleanData]).select().single();
    if (error) { console.error("Supabase Error:", error.message); return; }
    if (data) setTransactions(prev => [...prev, data]);
  };

  const editTransaction = (id: string, data: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...data };
      const billed = Number(updated.billedAmount) || 0;
      const paid = Number(updated.paidAmount) || 0;
      const final = { ...updated, billedAmount: billed, paidAmount: paid, balance: billed - paid };
      const { progressNotes, documents, ...dbSafe } = final as any;
      instantSave('transactions', dbSafe);
      return final;
    }));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (navigator.onLine) supabase.from('transactions').delete().eq('id', id).then();
  };

  const addTransactionProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setTransactions(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = {
        ...t,
        progressNotes: [...(t.progressNotes || []), {
          id: crypto.randomUUID(), message,
          authorId: currentUser.id, authorName: currentUser.name,
          authorRole: currentUser.role, date: new Date().toLocaleString(),
        }],
      };
      supabase.from('transactions').update({ progressNotes: updated.progressNotes }).eq('id', id).then();

      const isAuthorManagerOrAdmin = currentUser.role === 'manager' || currentUser.role === 'admin';

      // 1. Notify + email the assigned user if it's not the author
      if (t.lawyerId && String(t.lawyerId) !== String(currentUser.id)) {
        sendNotification(t.lawyerId, `📁 Transaction Update: ${t.fileName} — "${message}"`, 'file', t.id, 'transaction');
        const assignedUser = usersRef.current.find(u => String(u.id) === String(t.lawyerId));
        if (assignedUser?.email) {
          const isAssignedLawyer = assignedUser.role === 'lawyer';
          const isAssignedManager = assignedUser.role === 'manager';
          if ((isAssignedLawyer && isAuthorManagerOrAdmin) || isAssignedManager) {
            sendEmail(
              assignedUser.email,
              `File Update: ${t.fileName}`,
              buildProgressEmail(assignedUser.name, currentUser.name, currentUser.role, t.fileName, 'Transaction', message)
            );
          }
        }
      }

      // 2. Notify managers assigned to OR who commented on this file (excluding self + already notified)
      const managersToNotify = getManagersToNotify(t.lawyerId, t.progressNotes || [], currentUser.id);
      if (t.lawyerId) managersToNotify.delete(String(t.lawyerId)); // already handled above
      managersToNotify.forEach(managerId => {
        sendNotification(managerId, `📁 Transaction Update: ${t.fileName} — "${message}"`, 'file', t.id, 'transaction');
      });

      // 3. Notify admins (in-app only)
      getAdminIds().forEach(adminId => {
        if (String(adminId) !== String(currentUser.id))
          sendNotification(adminId, `📁 Transaction Update: ${t.fileName} — "${message}"`, 'file', t.id, 'transaction');
      });

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

  /* =======================
      COURT CASES
  ======================= */
  const addCourtCase = (c: CourtCase) => { setCourtCases(prev => [...prev, c]); instantSave('court_cases', c); };
  const editCourtCase = (id: string, data: Partial<CourtCase>) =>
    setCourtCases(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...data };
      instantSave('court_cases', updated);
      return updated;
    }));
  const deleteCourtCase = (id: string) => {
    setCourtCases(prev => prev.filter(c => c.id !== id));
    if (navigator.onLine) supabase.from('court_cases').delete().eq('id', id).then();
  };

  const addCourtCaseProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setCourtCases(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newNote: ProgressNote = {
        id: crypto.randomUUID(), message,
        authorId: currentUser.id, authorName: currentUser.name,
        authorRole: currentUser.role, date: new Date().toLocaleString(),
      };
      const updated = { ...c, progressNotes: [...(c.progressNotes || []), newNote] };
      supabase.from('court_cases').update({ progressNotes: updated.progressNotes }).eq('id', id).then();

      const isAuthorManagerOrAdmin = currentUser.role === 'manager' || currentUser.role === 'admin';

      // 1. Notify + email the assigned user if it's not the author
      if (c.lawyerId && String(c.lawyerId) !== String(currentUser.id)) {
        sendNotification(c.lawyerId, `⚖️ Court Case Update: ${c.fileName} — "${message}"`, 'file', c.id, 'case');
        const assignedUser = usersRef.current.find(u => String(u.id) === String(c.lawyerId));
        if (assignedUser?.email) {
          const isAssignedLawyer = assignedUser.role === 'lawyer';
          const isAssignedManager = assignedUser.role === 'manager';
          if ((isAssignedLawyer && isAuthorManagerOrAdmin) || isAssignedManager) {
            sendEmail(
              assignedUser.email,
              `File Update: ${c.fileName}`,
              buildProgressEmail(assignedUser.name, currentUser.name, currentUser.role, c.fileName, 'Court Case', message)
            );
          }
        }
      }

      // 2. Notify managers assigned to OR who commented on this file (excluding self + already notified)
      const managersToNotify = getManagersToNotify(c.lawyerId, c.progressNotes || [], currentUser.id);
      if (c.lawyerId) managersToNotify.delete(String(c.lawyerId)); // already handled above
      managersToNotify.forEach(managerId => {
        sendNotification(managerId, `⚖️ Court Case Update: ${c.fileName} — "${message}"`, 'file', c.id, 'case');
      });

      // 3. Notify admins (in-app only)
      getAdminIds().forEach(adminId => {
        if (String(adminId) !== String(currentUser.id))
          sendNotification(adminId, `⚖️ Court Case Update: ${c.fileName} — "${message}"`, 'file', c.id, 'case');
      });

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
      setCourtCases(prev => prev.map(c => {
        if (c.id !== caseId) return c;
        const updatedDocs = [...(c.documents || []), newDoc];
        supabase.from('court_cases').update({ documents: updatedDocs }).eq('id', caseId).then();
        return { ...c, documents: updatedDocs };
      }));
    } catch (err) { console.error("Upload failed", err); }
  };

  const deleteCourtCaseDocument = async (caseId: string, docId: string) => {
    setCourtCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const updatedDocs = (c.documents || []).filter(d => d.id !== docId);
      supabase.from('court_cases').update({ documents: updatedDocs }).eq('id', caseId).then();
      return { ...c, documents: updatedDocs };
    }));
  };

  /* =======================
      LETTERS
  ======================= */
  const addLetter = (l: Letter) => { setLetters(prev => [...prev, l]); instantSave('letters', l); };
  const editLetter = (id: string, data: Partial<Letter>) =>
    setLetters(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, ...data };
      const { progressNotes, documents, ...dbSafe } = updated as any;
      instantSave('letters', dbSafe);
      return updated;
    }));
  const deleteLetter = (id: string) => {
    setLetters(prev => prev.filter(l => l.id !== id));
    if (navigator.onLine) supabase.from('letters').delete().eq('id', id).then();
  };

  const addLetterProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setLetters(prev => prev.map(l => {
      if (l.id !== id) return l;
      const newNote: ProgressNote = {
        id: crypto.randomUUID(), message,
        authorId: currentUser.id, authorName: currentUser.name,
        authorRole: currentUser.role, date: new Date().toLocaleString(),
      };
      const updated = { ...l, progressNotes: [...(l.progressNotes || []), newNote] };
      supabase.from('letters').update({ progressNotes: updated.progressNotes }).eq('id', id).then();

      const isAuthorManagerOrAdmin = currentUser.role === 'manager' || currentUser.role === 'admin';

      // 1. Notify + email the assigned user if it's not the author
      if (l.lawyerId && String(l.lawyerId) !== String(currentUser.id)) {
        sendNotification(l.lawyerId, `✉️ Letter Update: ${l.subject} — "${message}"`, 'file', l.id, 'letter');
        const assignedUser = usersRef.current.find(u => String(u.id) === String(l.lawyerId));
        if (assignedUser?.email) {
          const isAssignedLawyer = assignedUser.role === 'lawyer';
          const isAssignedManager = assignedUser.role === 'manager';
          if ((isAssignedLawyer && isAuthorManagerOrAdmin) || isAssignedManager) {
            sendEmail(
              assignedUser.email,
              `File Update: ${l.subject}`,
              buildProgressEmail(assignedUser.name, currentUser.name, currentUser.role, l.subject, 'Letter', message)
            );
          }
        }
      }

      // 2. Notify managers assigned to OR who commented on this file (excluding self + already notified)
      const managersToNotify = getManagersToNotify(l.lawyerId, l.progressNotes || [], currentUser.id);
      if (l.lawyerId) managersToNotify.delete(String(l.lawyerId)); // already handled above
      managersToNotify.forEach(managerId => {
        sendNotification(managerId, `✉️ Letter Update: ${l.subject} — "${message}"`, 'file', l.id, 'letter');
      });

      // 3. Notify admins (in-app only)
      getAdminIds().forEach(adminId => {
        if (String(adminId) !== String(currentUser.id))
          sendNotification(adminId, `✉️ Letter Update: ${l.subject} — "${message}"`, 'file', l.id, 'letter');
      });

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
      setLetters(prev => prev.map(l => {
        if (l.id !== letterId) return l;
        const updatedDocs = [...(l.documents || []), newDoc];
        supabase.from('letters').update({ documents: updatedDocs }).eq('id', letterId).then();
        return { ...l, documents: updatedDocs };
      }));
    } catch (err) { console.error("Letter Upload failed", err); }
  };

  const deleteLetterDocument = async (letterId: string, docId: string) => {
    setLetters(prev => prev.map(l => {
      if (l.id !== letterId) return l;
      const updatedDocs = (l.documents || []).filter(d => d.id !== docId);
      supabase.from('letters').update({ documents: updatedDocs }).eq('id', letterId).then();
      return { ...l, documents: updatedDocs };
    }));
  };

  /* =======================
      INVOICES
  ======================= */
  const addInvoice = (inv: Invoice) => { setInvoices(prev => [...prev, inv]); instantSave('invoices', inv); };
  const updateInvoice = (inv: Invoice) => { setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i)); instantSave('invoices', inv); };
  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
    if (navigator.onLine) supabase.from('invoices').delete().eq('id', id).then();
  };

  /* =======================
      CLIENTS
  ======================= */
  const addClient = (client: Client) => { setClients(prev => [...prev, client]); instantSave('clients', client); };
  const updateClient = (client: Client) => { setClients(prev => prev.map(c => c.id === client.id ? client : c)); instantSave('clients', client); };
  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    if (navigator.onLine) supabase.from('clients').delete().eq('id', id).then();
  };

  /* =======================
      TASKS
  ======================= */
  const addTask = async (taskData: Omit<Task, "id" | "status" | "dateCreated">) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      status: "Pending",
      dateCreated: new Date().toISOString(),
    };
    setTasks(prev => [...prev, normalizeTask(newTask)]);
    const { error } = await supabase.from('tasks').insert([newTask]);
    if (error) console.error("Cross-device sync failed:", error);
    sendNotification(
      taskData.assignedToId,
      `📋 New Task from ${taskData.assignedByName}: "${taskData.title}"`,
      'task', newTask.id, 'task'
    );
  };

  const updateTask = (id: string, data: Partial<Task>) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...data };
      instantSave('tasks', updated);
      return updated;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    supabase.from('tasks').delete().eq('id', id).then();
  };

  const completeTask = (id: string, note: string) => {
    const task = tasks.find(t => t.id === id);
    updateTask(id, { status: "Completed", clerkNote: note });
    if (task) {
      sendNotification(
        task.assignedById,
        `✅ Task Completed by ${task.assignedToName}: "${task.title}" — "${note}"`,
        'task', task.id, 'task'
      );
    }
  };

  /* =======================
      LOCALSTORAGE PERSISTENCE
  ======================= */
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
    const timer = setTimeout(() => {
      localStorage.setItem("notifications", JSON.stringify(notifications));
    }, 1000);
    return () => clearTimeout(timer);
  }, [notifications]);

  return (
    <AppContext.Provider
      value={{
        currentUser, setCurrentUser, users, setUsers, lawyers, addUser, deleteUser,
        login, logout,
        transactions, addTransaction, editTransaction, updateTransaction: editTransaction, deleteTransaction,
        addTransactionProgress, editTransactionProgress, deleteTransactionProgress,
        uploadTransactionDocument, deleteTransactionDocument,
        courtCases, addCourtCase, editCourtCase, updateCourtCase: editCourtCase, deleteCourtCase,
        addCourtCaseProgress, deleteCourtCaseProgress, uploadCourtCaseDocument, deleteCourtCaseDocument,
        letters, addLetter, editLetter, updateLetter: editLetter, deleteLetter, addLetterProgress,
        uploadLetterDocument, deleteLetterDocument,
        invoices, addInvoice, updateInvoice, deleteInvoice,
        clients, addClient, updateClient, deleteClient,
        commLogs, addCommLog: (log) => { setCommLogs(p => [...p, log]); instantSave('commLogs', log); },
        tasks, addTask, updateTask, deleteTask, completeTask,
        notifications, sendNotification, markNotificationsAsRead, setNotifications,
        expenses, setExpenses,
        firmName, setFirmName,
        syncToCloud,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};