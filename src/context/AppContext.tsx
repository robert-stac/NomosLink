import React, { createContext, useContext, useEffect, useState } from "react";
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
  uploadTransactionDocument: (id: string, file: File) => void;

  courtCases: CourtCase[];
  addCourtCase: (c: CourtCase) => void;
  editCourtCase: (id: string, data: Partial<CourtCase>) => void;
  updateCourtCase: (id: string, data: Partial<CourtCase>) => void;
  deleteCourtCase: (id: string) => void;
  addCourtCaseProgress: (id: string, message: string) => void;

  letters: Letter[];
  addLetter: (l: Letter) => void;
  editLetter: (id: string, data: Partial<Letter>) => void;
  updateLetter: (id: string, data: Partial<Letter>) => void;
  deleteLetter: (id: string) => void;
  addLetterProgress: (id: string, message: string) => void;

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
  addTask: (task: Omit<Task, "id" | "status" | "dateCreated">) => void;
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
    return stored ? JSON.parse(stored) : [{ id: "d70d4e47-1422-4501-961a-c1e69a1c15d7", name: "System Admin", email: "admin@nomoslink.com", role: "admin", password: "password123" }];
  });
 
  const [transactions, setTransactions] = useState<Transaction[]>(() => JSON.parse(localStorage.getItem("transactions") || "[]"));
  const [courtCases, setCourtCases] = useState<CourtCase[]>(() => JSON.parse(localStorage.getItem("courtCases") || "[]"));
  const [letters, setLetters] = useState<Letter[]>(() => JSON.parse(localStorage.getItem("letters") || "[]"));
  const [invoices, setInvoices] = useState<Invoice[]>(() => JSON.parse(localStorage.getItem("invoices") || "[]"));
  const [clients, setClients] = useState<Client[]>(() => JSON.parse(localStorage.getItem("clients") || "[]"));
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem("tasks") || "[]"));
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>(() => JSON.parse(localStorage.getItem("commLogs") || "[]"));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => JSON.parse(localStorage.getItem("notifications") || "[]"));
  const [expenses, setExpenses] = useState<any[]>(() => JSON.parse(localStorage.getItem("expenses") || "[]"));
  const [firmName, setFirmName] = useState("Buwembo & Co. Advocates");

  const instantSave = async (table: string, payload: any) => {
    if (!navigator.onLine) return;
    try {
      const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.error(`Instant save to ${table} failed:`, e);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [
          { data: courtData },
          { data: txData },
          { data: clientData },
          { data: letterData },
          { data: userData },
          { data: taskData },
          { data: invoiceData },
          { data: notifData },
          { data: expenseData }
        ] = await Promise.all([
          supabase.from('court_cases').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('clients').select('*').order('dateAdded', { ascending: false }),
          supabase.from('letters').select('*'),
          supabase.from('users').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('invoices').select('*'),
          supabase.from('notifications').select('*'),
          supabase.from('expenses').select('*').order('date', { ascending: false })
        ]);

        const merge = (local: any[], cloud: any[] | null) => {
          if (!cloud) return local;
          const cloudIds = new Set(cloud.map(i => i.id));
          const localOnly = local.filter(i => !cloudIds.has(i.id));
          return [...cloud, ...localOnly];
        };

        if (courtData) setCourtCases(prev => merge(prev, courtData));
        if (txData) setTransactions(prev => merge(prev, txData));
        if (clientData) setClients(prev => merge(prev, clientData));
        if (letterData) setLetters(prev => merge(prev, letterData));
        if (userData) setUsers(prev => merge(prev, userData));
        if (taskData) setTasks(prev => merge(prev, taskData));
        if (invoiceData) setInvoices(prev => merge(prev, invoiceData));
        if (notifData) setNotifications(prev => merge(prev, notifData));
        if (expenseData) setExpenses(prev => merge(prev, expenseData));

      } catch (err) {
        console.error("Initial load failed.", err);
      }
    };
    fetchInitialData();
  }, []);

  const sendNotification = (
    recipientId: string, 
    message: string, 
    type: 'alert' | 'task' | 'file' = 'alert',
    relatedId?: string,
    relatedType?: 'case' | 'transaction' | 'letter' | 'task'
  ) => {
    setNotifications(prev => {
      const isDuplicate = prev.some(n => 
        n.recipientId === recipientId && 
        n.message === message && 
        (Date.now() - new Date(n.date).getTime() < 3000)
      );
      if (isDuplicate) return prev;

      const newNotif: AppNotification = {
        id: `NOTIF-${Date.now()}`,
        recipientId, message, type, date: new Date().toLocaleString(),
        read: false, relatedId, relatedType
      };
      instantSave('notifications', newNotif);
      return [newNotif, ...prev];
    });
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
        supabase.from('notifications').upsert(notifications, { onConflict: 'id' })
      ]);
      console.log("Full sync successful.");
    } catch (e) {
      console.error("Full sync failed:", e);
    }
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

  const logout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    window.location.href = "/";
  };

  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
    instantSave('users', user);
  };
  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    if (navigator.onLine) await supabase.from('users').delete().eq('id', id);
  };
  const lawyers = users.filter(u => u.role !== "admin");

  const addTransaction = async (tx: Transaction) => {
    const { id, archived, ...cleanData } = tx as any;
    const { data, error } = await supabase.from('transactions').insert([cleanData]).select().single();
    if (error) {
      console.error("Supabase Error:", error.message);
      return;
    }
    if (data) setTransactions(prev => [...prev, data]);
  };
  
  const editTransaction = (id: string, data: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...data };
        const billed = Number(updated.billedAmount) || 0;
        const paid = Number(updated.paidAmount) || 0;
        const finalObj = { ...updated, billedAmount: billed, paidAmount: paid, balance: billed - paid };
        const { progressNotes, documents, ...dbSafe } = finalObj as any;
        instantSave('transactions', dbSafe); 
        return finalObj;
      }
      return t;
    }));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (navigator.onLine) supabase.from('transactions').delete().eq('id', id).then();
  };

  const addTransactionProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const updated = {
          ...t,
          progressNotes: [...(t.progressNotes || []), {
            id: Date.now().toString(),
            message, authorId: currentUser.id, authorName: currentUser.name, authorRole: currentUser.role,
            date: new Date().toLocaleString()
          }]
        };
        supabase.from('transactions').update({ progressNotes: updated.progressNotes }).eq('id', id).then();
        if (t.lawyerId && t.lawyerId !== currentUser.id) {
            sendNotification(t.lawyerId, `File Update: ${t.fileName}`, 'file', t.id, 'transaction');
        }
        return updated;
      }
      return t;
    }));
  };

  const addCourtCase = (c: CourtCase) => {
    setCourtCases(prev => [...prev, c]);
    instantSave('court_cases', c);
  };
  const editCourtCase = (id: string, data: Partial<CourtCase>) =>
    setCourtCases(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...data };
        instantSave('court_cases', updated);
        return updated;
      }
      return c;
    }));
  const deleteCourtCase = (id: string) => {
    setCourtCases(prev => prev.filter(c => c.id !== id));
    if (navigator.onLine) supabase.from('court_cases').delete().eq('id', id).then();
  };

  const addLetter = (l: Letter) => {
    setLetters(prev => [...prev, l]);
    instantSave('letters', l);
  };
  const editLetter = (id: string, data: Partial<Letter>) =>
    setLetters(prev => prev.map(l => {
      if (l.id === id) {
        const updated = { ...l, ...data };
        const { progressNotes, documents, ...dbSafe } = updated as any;
        instantSave('letters', dbSafe);
        return updated;
      }
      return l;
    }));
  const deleteLetter = (id: string) => {
    setLetters(prev => prev.filter(l => l.id !== id));
    if (navigator.onLine) supabase.from('letters').delete().eq('id', id).then();
  };

  /* --- ADDED: LETTER PROGRESS LOGIC --- */
  const addLetterProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setLetters(prev => prev.map(l => {
      if (l.id === id) {
        const newNote: ProgressNote = {
          id: crypto.randomUUID(),
          message,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          date: new Date().toLocaleString()
        };
        const updated = {
          ...l,
          progressNotes: [...(l.progressNotes || []), newNote]
        };
        
        // Sync specifically the progressNotes column to Supabase
        supabase.from('letters').update({ progressNotes: updated.progressNotes }).eq('id', id).then();
        
        // Notify the assigned lawyer if someone else updated it
        if (l.lawyerId && l.lawyerId !== currentUser.id) {
          sendNotification(l.lawyerId, `Letter Update: ${l.subject}`, 'file', l.id, 'letter');
        }
        return updated;
      }
      return l;
    }));
  };

  const addInvoice = (inv: Invoice) => {
    setInvoices(prev => [...prev, inv]);
    instantSave('invoices', inv);
  };
  const updateInvoice = (inv: Invoice) => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
    instantSave('invoices', inv);
  };
  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
    if (navigator.onLine) supabase.from('invoices').delete().eq('id', id).then();
  };

  const addClient = (client: Client) => {
    setClients(prev => [...prev, client]);
    instantSave('clients', client);
  };
  const updateClient = (client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    instantSave('clients', client);
  };
  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    if (navigator.onLine) supabase.from('clients').delete().eq('id', id).then();
  };

  const addTask = (taskData: Omit<Task, "id" | "status" | "dateCreated">) => {
    const newTask: Task = { ...taskData, id: `TASK-${Date.now()}`, status: "Pending", dateCreated: new Date().toLocaleString() };
    setTasks(prev => [...prev, newTask]);
    instantSave('tasks', newTask);
    sendNotification(taskData.assignedToId, `New Task: ${taskData.title}`, 'task', newTask.id, 'task');
  };
  const updateTask = (id: string, data: Partial<Task>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...data };
        instantSave('tasks', updated);
        return updated;
      }
      return t;
    }));
  };

  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("transactions", JSON.stringify(transactions));
    localStorage.setItem("courtCases", JSON.stringify(courtCases));
    localStorage.setItem("letters", JSON.stringify(letters));
    localStorage.setItem("invoices", JSON.stringify(invoices));
    localStorage.setItem("clients", JSON.stringify(clients));
    localStorage.setItem("tasks", JSON.stringify(tasks));
    localStorage.setItem("commLogs", JSON.stringify(commLogs));
    localStorage.setItem("notifications", JSON.stringify(notifications));
    localStorage.setItem("expenses", JSON.stringify(expenses));
    if (currentUser) localStorage.setItem("currentUser", JSON.stringify(currentUser));
  }, [users, transactions, courtCases, letters, invoices, clients, tasks, commLogs, expenses, notifications, currentUser]);

  return (
    <AppContext.Provider
      value={{
        currentUser, setCurrentUser, users, setUsers, lawyers, addUser, deleteUser,
        login, logout, 
        transactions, addTransaction, editTransaction, deleteTransaction,
        updateTransaction: editTransaction, 
        addTransactionProgress, editTransactionProgress: () => {}, deleteTransactionProgress: () => {}, uploadTransactionDocument: () => {},
        courtCases, addCourtCase, editCourtCase, deleteCourtCase, addCourtCaseProgress: () => {},
        updateCourtCase: editCourtCase, 
        letters, addLetter, editLetter, deleteLetter, addLetterProgress,
        updateLetter: editLetter, 
        invoices, addInvoice, updateInvoice, deleteInvoice,
        clients, addClient, updateClient, deleteClient,
        commLogs, addCommLog: (log) => { setCommLogs(p => [...p, log]); instantSave('commLogs', log); }, 
        tasks, addTask, updateTask, deleteTask: (id) => { setTasks(p => p.filter(t => t.id !== id)); supabase.from('tasks').delete().eq('id', id).then(); }, completeTask: (id, note) => updateTask(id, { status: "Completed", clerkNote: note }),
        notifications, sendNotification, markNotificationsAsRead, setNotifications,
        expenses, setExpenses,
        firmName, setFirmName,
        syncToCloud
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