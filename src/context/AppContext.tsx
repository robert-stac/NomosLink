import React, { createContext, useContext, useEffect, useState } from "react";
// 1. Import the supabase client
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

// Updated Notification Type for Navigation
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
  status: "Pending" | "Completed";
  amount?: number;
  billedAmount?: number;
  paidAmount?: number;
  balance?: number;
  date?: string;
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
  documents?: AppDocument[];
  progressNotes?: ProgressNote[];
}

export interface Letter {
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
  login: (email: string, password: string) => boolean;
  logout: () => void;
  setUser: (users: User[]) => void;

  transactions: Transaction[];
  addTransaction: (tx: Transaction) => void;
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

  // Notification Exports
  notifications: AppNotification[];
  sendNotification: (recipientId: string, message: string, type: 'alert' | 'task' | 'file', relatedId?: string, relatedType?: 'case' | 'transaction' | 'letter' | 'task') => void;
  markNotificationsAsRead: (userId: string) => void;

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
    const saved = localStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem("users");
    return stored ? JSON.parse(stored) : [{ id: "1", name: "Admin", email: "admin@bca.com", role: "admin", password: "admin123" }];
  });
 
  const [transactions, setTransactions] = useState<Transaction[]>(() => JSON.parse(localStorage.getItem("transactions") || "[]"));
  const [courtCases, setCourtCases] = useState<CourtCase[]>(() => JSON.parse(localStorage.getItem("courtCases") || "[]"));
  const [letters, setLetters] = useState<Letter[]>(() => JSON.parse(localStorage.getItem("letters") || "[]"));
  const [invoices, setInvoices] = useState<Invoice[]>(() => JSON.parse(localStorage.getItem("invoices") || "[]"));
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem("tasks") || "[]"));
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>(() => JSON.parse(localStorage.getItem("commLogs") || "[]"));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => JSON.parse(localStorage.getItem("notifications") || "[]"));
  const [expenses, setExpenses] = useState<any[]>([]);
  const [firmName, setFirmName] = useState("Buwembo & Co. Advocates");

  /* --- 1. INITIAL DATA LOAD --- */
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: clientData } = await supabase.from('clients').select('*').order('dateAdded', { ascending: false });
      if (clientData) setClients(clientData);

      const { data: letterData } = await supabase.from('letters').select('*');
      if (letterData) setLetters(letterData);

      const { data: userData } = await supabase.from('users').select('*');
      if (userData) setUsers(userData);

      const { data: taskData } = await supabase.from('tasks').select('*');
      if (taskData) setTasks(taskData);

      const { data: invoiceData } = await supabase.from('invoices').select('*');
      if (invoiceData) setInvoices(invoiceData);

      const { data: notifData } = await supabase.from('notifications').select('*');
      if (notifData) setNotifications(notifData);

      const { data: expenseData } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (expenseData) setExpenses(expenseData);
    };
    fetchInitialData();
  }, []);

  /* --- NOTIFICATION HELPERS --- */
  const sendNotification = (
    recipientId: string, 
    message: string, 
    type: 'alert' | 'task' | 'file' = 'alert',
    relatedId?: string,
    relatedType?: 'case' | 'transaction' | 'letter' | 'task'
  ) => {
    setNotifications(prev => {
      // DUPLICATE PREVENTION: Check if same message sent to same person in last 3 seconds
      const isDuplicate = prev.some(n => 
        n.recipientId === recipientId && 
        n.message === message && 
        (Date.now() - new Date(n.date).getTime() < 3000)
      );

      if (isDuplicate) return prev;

      const newNotif: AppNotification = {
        id: `NOTIF-${Date.now()}`,
        recipientId,
        message,
        type,
        date: new Date().toLocaleString(),
        read: false,
        relatedId,
        relatedType
      };
      return [newNotif, ...prev];
    });
  };

  const markNotificationsAsRead = async (userId: string) => {
  // Update local state first for speed
  setNotifications(prev => prev.map(n => n.recipientId === userId ? { ...n, read: true } : n));

  // Sync to Supabase immediately
  if (navigator.onLine) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipientId', userId);
  }
};

  /* --- 2. SUPABASE SYNC LOGIC --- */
  const syncToCloud = async () => {
    if (!navigator.onLine) return; 

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
  
    console.log("NomosLink: Full Cloud Sync Complete.");
  };

  /* --- AUTH --- */
  const login = (email: string, password: string) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return false;
    setCurrentUser(user);
    return true;
  };
  const logout = () => setCurrentUser(null);

  /* --- USERS --- */
  const addUser = (user: User) => setUsers(prev => [...prev, user]);
  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    if (navigator.onLine) {
      await supabase.from('users').delete().eq('id', id);
    }
  };
  const lawyers = users.filter(u => u.role !== "admin");

  /* --- TRANSACTIONS --- */
  const addTransaction = (tx: Transaction) => setTransactions(prev => [...prev, tx]);
  
  const editTransaction = (id: string, data: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...data };
        const billed = Number(updated.billedAmount) || Number((updated as any).billed) || Number(updated.amount) || 0;
        const paid = Number(updated.paidAmount) || Number((updated as any).paid) || 0;
        return { ...updated, billedAmount: billed, paidAmount: paid, balance: billed - paid, amount: billed };
      }
      return t;
    }));
  };

  const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));

  const addTransactionProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        if (t.lawyerId && t.lawyerId !== currentUser.id) {
           // Pass ID and Type for Navigation
           sendNotification(t.lawyerId, `File Update: ${t.fileName}`, 'file', t.id, 'transaction');
        }
        return {
          ...t,
          progressNotes: [...(t.progressNotes || []), {
            id: Date.now().toString(),
            message,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: currentUser.role,
            date: new Date().toLocaleString()
          }]
        };
      }
      return t;
    }));
  };

  const editTransactionProgress = (txId: string, noteId: string, message: string) => {
    setTransactions(prev => prev.map(t => t.id === txId ? {
        ...t,
        progressNotes: (t.progressNotes || []).map(n => n.id === noteId ? { ...n, message } : n)
    } : t));
  };

  const deleteTransactionProgress = (txId: string, noteId: string) => {
    setTransactions(prev => prev.map(t => t.id === txId ? {
        ...t,
        progressNotes: (t.progressNotes || []).filter(n => n.id !== noteId)
    } : t));
  };

  const uploadTransactionDocument = (id: string, file: File) => {
    const newDoc: AppDocument = {
      id: Date.now().toString(),
      name: file.name,
      url: URL.createObjectURL(file),
      date: new Date().toLocaleDateString()
    };
    setTransactions(prev => prev.map(t => t.id === id ? {
      ...t,
      documents: [...(t.documents || []), newDoc]
    } : t));
  };

  /* --- COURT CASES --- */
  const addCourtCase = (c: CourtCase) => setCourtCases(prev => [...prev, c]);
  const editCourtCase = (id: string, data: Partial<CourtCase>) =>
    setCourtCases(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...data };
        const b = Number(updated.billed) || Number((updated as any).billedAmount) || 0;
        const p = Number(updated.paid) || Number((updated as any).paidAmount) || 0;
        return { ...updated, billed: b, paid: p, balance: b - p };
      }
      return c;
    }));

  const deleteCourtCase = (id: string) => setCourtCases(prev => prev.filter(c => c.id !== id));

  const addCourtCaseProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setCourtCases(prev => prev.map(c => {
      if (c.id === id) {
        if (c.lawyerId && c.lawyerId !== currentUser.id) {
           // Pass ID and Type for Navigation
           sendNotification(c.lawyerId, `Case Update: ${c.fileName}`, 'file', c.id, 'case');
        }
        return {
          ...c,
          progressNotes: [...(c.progressNotes || []), {
            id: Date.now().toString(),
            message,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: currentUser.role,
            date: new Date().toLocaleString()
          }]
        };
      }
      return c;
    }));
  };

  /* --- LETTERS --- */
  const addLetter = (l: Letter) => setLetters(prev => [...prev, l]);
  const editLetter = (id: string, data: Partial<Letter>) =>
    setLetters(prev => prev.map(l => (l.id === id ? { ...l, ...data } : l)));
  const deleteLetter = (id: string) => setLetters(prev => prev.filter(l => l.id !== id));
  const addLetterProgress = (id: string, message: string) => {
    if (!currentUser) return;
    setLetters(prev => prev.map(l => {
      if (l.id === id) {
        if (l.lawyerId && l.lawyerId !== currentUser.id) {
           // Pass ID and Type for Navigation
           sendNotification(l.lawyerId, `Letter Update: ${l.subject}`, 'file', l.id, 'letter');
        }
        return {
          ...l,
          progressNotes: [...(l.progressNotes || []), {
            id: Date.now().toString(),
            message,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: currentUser.role,
            date: new Date().toLocaleString()
          }]
        };
      }
      return l;
    }));
  };

  /* --- INVOICES --- */
  const addInvoice = (inv: Invoice) => setInvoices(prev => [...prev, inv]);
  const updateInvoice = (inv: Invoice) => setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
  const deleteInvoice = (id: string) => setInvoices(prev => prev.filter(i => i.id !== id));

  /* --- CLIENTS --- */
  const addClient = (client: Client) => setClients(prev => [...prev, client]);
  const updateClient = (client: Client) => setClients(prev => prev.map(c => c.id === client.id ? client : c));
  const deleteClient = (id: string) => setClients(prev => prev.filter(c => c.id !== id));

  /* --- COMMUNICATION LOGS --- */
  const addCommLog = (log: CommunicationLog) => setCommLogs(prev => [...prev, log]);

  /* --- TASKS --- */
  const addTask = (taskData: Omit<Task, "id" | "status" | "dateCreated">) => {
    const newTask: Task = { ...taskData, id: `TASK-${Date.now()}`, status: "Pending", dateCreated: new Date().toLocaleString() };
    setTasks(prev => [...prev, newTask]);
    // Notify the clerk immediately
    sendNotification(taskData.assignedToId, `New Task: ${taskData.title}`, 'task', newTask.id, 'task');
  };
  const updateTask = (id: string, data: Partial<Task>) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));
  const completeTask = (taskId: string, note: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        // Notify the lawyer that the clerk finished the task
        sendNotification(t.assignedById, `Task Completed: ${t.title}`, 'task', taskId, 'task');
        return { ...t, status: "Completed", clerkNote: note };
      }
      return t;
    }));
  };

  /* --- PERSISTENCE & AUTO-SYNC --- */
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
    else localStorage.removeItem("currentUser");

    syncToCloud();
  }, [users, transactions, courtCases, letters, invoices, clients, tasks, commLogs, expenses, notifications, currentUser]);

  return (
    <AppContext.Provider
      value={{
        currentUser, setCurrentUser, users, setUser: (newUsers) => setUsers(newUsers), lawyers, addUser, deleteUser,
        login, logout, 
        transactions, addTransaction, editTransaction, deleteTransaction,
        updateTransaction: editTransaction, 
        addTransactionProgress, editTransactionProgress, deleteTransactionProgress, uploadTransactionDocument,
        courtCases, addCourtCase, editCourtCase, deleteCourtCase, addCourtCaseProgress,
        updateCourtCase: editCourtCase, 
        letters, addLetter, editLetter, deleteLetter, addLetterProgress,
        updateLetter: editLetter, 
        invoices, addInvoice, updateInvoice, deleteInvoice,
        clients, addClient, updateClient, deleteClient,
        commLogs, addCommLog, 
        tasks, addTask, updateTask, deleteTask, completeTask,
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