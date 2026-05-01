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

export interface TaskProgressNote {
  date: string;
  note: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  dueDate?: string;
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
  status: "Pending" | "Completed";
  clerkNote?: string;
  progressNotes?: TaskProgressNote[];
  dateCreated: string;
  relatedFileId?: string;
  relatedFileType?: 'case' | 'transaction' | 'letter';
  relatedFileName?: string;
  deleted?: boolean;
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

export interface DraftRequest {
  id: string;
  caseId: string;
  caseFileName: string;
  title: string;
  description: string;
  deadline: string;
  assignedToId: string;
  assignedToName: string;
  requestedById: string;
  requestedByName: string;
  status: "Pending" | "Completed";
  documentUrl?: string;
  documentName?: string;
  hoursSpent?: number;
  dateCreated: string;
  dateCompleted?: string;
}

export interface FilingRequest {
  id: string;
  caseId: string;
  caseFileName: string;
  documentName: string;
  title: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  requestedById: string;
  requestedByName: string;
  status: "Pending" | "Completed";
  eccmisReference?: string;
  registryNote?: string;
  hoursSpent?: number;
  dateCreated: string;
  dateCompleted?: string;
}

export interface CourtDeadline {
  id: string;
  title: string;
  dueDate: string;
  status: 'Pending' | 'Completed';
  category?: 'Directive' | 'Submission' | 'Filing' | 'Other';
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
  clientId?: string;
  archived?: boolean;
  documents?: AppDocument[];
  progressNotes?: ProgressNote[];
  scannedInvoiceUrl?: string;
  lastClientFeedbackDate?: string;
}

export interface CourtCase {
  id: string;
  fileName: string;
  details?: string;
  billed?: number;
  paid?: number;
  balance?: number;
  status: "Ongoing" | "Completed" | "On Hold" | "Pending";
  nextCourtDate?: string;
  completedDate?: string;
  lawyerId?: string;
  clientId?: string;
  categories?: string[];
  sittingType?: string;
  deadlines?: CourtDeadline[];
  archived?: boolean;
  documents?: AppDocument[];
  progressNotes?: ProgressNote[];
  scannedInvoiceUrl?: string;
  lastClientFeedbackDate?: string;
}

export interface Letter {
  recipient: string;
  id: string;
  subject: string;
  type: "Incoming" | "Outgoing";
  lawyerId?: string;
  clientId?: string;
  status: "Pending" | "Completed";
  archived?: boolean;
  date?: string;
  billed?: number;
  paid?: number;
  documents?: AppDocument[];
  progressNotes?: ProgressNote[];
  scannedInvoiceUrl?: string;
  lastClientFeedbackDate?: string;
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
  scannedInvoiceUrl?: string;
}

export interface Client {
  id: string;
  name: string;
  type: "Individual" | "Corporate";
  email: string;
  phone: string;
  dateAdded: string;
}

export interface CommunicationLog {
  id: string;
  clientId: string;
  note: string;
  authorName: string;
  date: string;
}

export interface LandTitleNote {
  id: string;
  title_id: string;
  author_id: string;
  author_name: string;
  message: string;
  created_at: string;
}

export interface LandTitle {
  id: string;
  title_number: string;
  title_type: string;
  plot_block?: string;
  block?: string;
  district?: string;
  county?: string;
  location?: string;
  owner_name: string;
  size?: string;
  date_received: string;
  origin: 'Direct Custody' | 'Transaction';
  transaction_id?: string;
  client_id?: string;
  status: 'In Custody' | 'Released' | 'Under Transaction' | 'Archived' | 'Taken';
  handling_lawyer_id?: string;
  storage_location?: string;
  notes?: string;
  date_released?: string;
  monthly_rate: number;
  total_billed: number;
  total_paid: number;
  taken_by?: string;
  taken_at?: string;
  taken_reason?: string;
  scanned_copy_url?: string;
  scanned_copy_name?: string;
  created_at?: string;
  updated_at?: string;
  notes_history?: LandTitleNote[];
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
  initialDataLoaded: boolean;

  transactions: Transaction[];
  addTransaction: (tx: Transaction) => Promise<void>;
  editTransaction: (id: string, data: Partial<Transaction>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addTransactionProgress: (id: string, message: string, logAsFeedback?: boolean) => void;
  editTransactionProgress: (txId: string, noteId: string, message: string) => void;
  deleteTransactionProgress: (txId: string, noteId: string) => void;
  uploadTransactionDocument: (id: string, file: File) => Promise<void>;
  deleteTransactionDocument: (txId: string, docId: string) => Promise<void>;

  courtCases: CourtCase[];
  addCourtCase: (c: CourtCase) => void;
  editCourtCase: (id: string, data: Partial<CourtCase>) => void;
  updateCourtCase: (id: string, data: Partial<CourtCase>) => void;
  deleteCourtCase: (id: string) => void;
  addCourtCaseProgress: (id: string, message: string, logAsFeedback?: boolean) => void;
  deleteCourtCaseProgress: (caseId: string, noteId: string) => void;
  uploadCourtCaseDocument: (caseId: string, file: File) => Promise<void>;
  deleteCourtCaseDocument: (caseId: string, docId: string) => Promise<void>;
  addCourtCaseDeadline: (caseId: string, deadline: Omit<CourtDeadline, 'id' | 'status'>) => void;
  updateCourtCaseDeadline: (caseId: string, deadlineId: string, data: Partial<CourtDeadline>) => void;
  deleteCourtCaseDeadline: (caseId: string, deadlineId: string) => void;

  letters: Letter[];
  addLetter: (l: Letter) => void;
  editLetter: (id: string, data: Partial<Letter>) => void;
  updateLetter: (id: string, data: Partial<Letter>) => void;
  deleteLetter: (id: string) => void;
  addLetterProgress: (id: string, message: string, logAsFeedback?: boolean) => void;
  uploadLetterDocument: (letterId: string, file: File) => Promise<void>;
  deleteLetterDocument: (letterId: string, docId: string) => Promise<void>;

  invoices: Invoice[];
  addInvoice: (inv: Invoice) => void;
  updateInvoice: (inv: Invoice) => void;
  deleteInvoice: (id: string) => void;
  uploadInvoiceScan: (id: string, file: File) => Promise<string>;

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
  appendTaskNote: (taskId: string, note: string) => void;

  draftRequests: DraftRequest[];
  addDraftRequest: (draft: Omit<DraftRequest, "id" | "status" | "dateCreated">) => Promise<void>;
  completeDraftRequest: (id: string, hoursSpent?: number, documentUrl?: string, documentName?: string) => void;
  deleteDraftRequest: (id: string) => void;

  filingRequests: FilingRequest[];
  addFilingRequest: (filing: Omit<FilingRequest, "id" | "status" | "dateCreated">) => Promise<void>;
  updateFilingRequest: (id: string, data: Partial<FilingRequest>) => void;
  completeFilingRequest: (id: string, hoursSpent: number, eccmisReference?: string, registryNote?: string) => void;
  deleteFilingRequest: (id: string) => void;

  notifications: AppNotification[];
  sendNotification: (recipientId: string, message: string, type: 'alert' | 'task' | 'file', relatedId?: string, relatedType?: 'case' | 'transaction' | 'letter' | 'task') => void;
  markNotificationsAsRead: (userId: string) => void;
  setNotifications: (notifications: AppNotification[]) => void;

  landTitles: LandTitle[];
  addLandTitle: (title: Omit<LandTitle, 'id' | 'created_at' | 'updated_at'>) => Promise<LandTitle | null>;
  updateLandTitle: (id: string, data: Partial<LandTitle>) => Promise<void>;
  deleteLandTitle: (id: string) => Promise<void>;
  addLandTitleNote: (titleId: string, message: string) => Promise<void>;
  uploadLandTitleScan: (id: string, file: File) => Promise<string>;

  expenses: any[];
  setExpenses: React.Dispatch<React.SetStateAction<any[]>>;
  firmName: string;
  setFirmName: React.Dispatch<React.SetStateAction<string>>;

  updateAvailable: boolean;
  dismissUpdateNotification: () => void;

  syncToCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/* =======================
    NORMALIZE TASK
======================= */
const normalizeTask = (raw: any): Task => ({
  ...raw,
  priority: raw.priority ?? undefined,
  dueDate: raw.dueDate ?? raw.due_date ?? undefined,
  assignedToId: raw.assignedToId ?? raw.assigned_to_id ?? "",
  assignedToName: raw.assignedToName ?? raw.assigned_to_name ?? "",
  assignedById: raw.assignedById ?? raw.assigned_by_id ?? "",
  assignedByName: raw.assignedByName ?? raw.assigned_by_name ?? "",
  dateCreated: raw.dateCreated ?? raw.date_created ?? "",
  clerkNote: raw.clerkNote ?? raw.clerk_note ?? undefined,
  progressNotes: raw.progressNotes ?? raw.progress_notes ?? undefined,
  status: raw.status ?? "Pending",
  relatedFileId: raw.relatedFileId ?? raw.related_file_id ?? undefined,
  relatedFileType: raw.relatedFileType ?? raw.related_file_type ?? undefined,
  relatedFileName: raw.relatedFileName ?? raw.related_file_name ?? undefined,
  deleted: raw.deleted ?? false,
});

/* =======================
    WEB PUSH HELPERS
======================= */
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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
    await supabase.from('push_subscriptions').upsert(
      { userId, subscription: JSON.stringify(subscription), updatedAt: new Date().toISOString() },
      { onConflict: 'userId' }
    );
  } catch (err) {
    console.warn("Push subscription failed:", err);
  }
}

/* =======================
    EMAIL TEMPLATE HELPERS
    NOTE: Built with string concatenation to avoid any risk of
    encoding issues with template literals in HTML content.
======================= */
function buildProgressEmail(
  recipientName: string,
  authorName: string,
  authorRole: string,
  fileTitle: string,
  fileType: string,
  message: string,
): string {
  return (
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;">' +
    '<div style="background:#0B1F3A;padding:24px 32px;border-radius:16px 16px 0 0;">' +
    '<h2 style="color:white;margin:0;font-size:20px;font-weight:900;letter-spacing:-0.5px;">NomosLink</h2>' +
    '<p style="color:#93c5fd;margin:4px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">File Update Notification</p>' +
    '</div>' +
    '<div style="background:white;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">' +
    '<p style="color:#64748b;font-size:14px;">Hi <strong>' + recipientName + '</strong>,</p>' +
    '<p style="color:#64748b;font-size:14px;">A new update has been posted to one of your files by <strong>' + authorName + '</strong> (' + authorRole + ').</p>' +
    '<div style="background:#f1f5f9;border-left:4px solid #0B1F3A;padding:16px 20px;border-radius:0 12px 12px 0;margin:24px 0;">' +
    '<p style="margin:0 0 6px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">' + fileType + '</p>' +
    '<p style="margin:0 0 12px;font-size:16px;font-weight:900;color:#0B1F3A;">' + fileTitle + '</p>' +
    '<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">"' + message + '"</p>' +
    '</div>' +
    '<p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #f1f5f9;padding-top:16px;">' +
    'This is an automated notification from NomosLink Legal Management System for <strong>Buwembo &amp; Co. Advocates</strong>.<br/>' +
    'Please do not reply to this email.' +
    '</p>' +
    '</div>' +
    '</div>'
  );
}

function buildTaskEmail(
  userName: string,
  assignerName: string,
  title: string,
  description: string,
  status: 'assigned' | 'completed',
  note?: string,
): string {
  const isCompleted = status === 'completed';
  const actionLine = isCompleted
    ? 'Your assigned task "<strong>' + title + '</strong>" has been marked as <strong>Completed</strong>.'
    : 'You have been assigned a new task: "<strong>' + title + '</strong>" by <strong>' + assignerName + '</strong>.';
  const noteBlock = note
    ? (
      '<div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;">' +
      '<p style="margin:0 0 4px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Completion Report</p>' +
      '<p style="margin:0;font-size:14px;color:#059669;font-style:italic;">"' + note + '"</p>' +
      '</div>'
    )
    : '';
  return (
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;">' +
    '<div style="background:#0B1F3A;padding:24px 32px;border-radius:16px 16px 0 0;">' +
    '<h2 style="color:white;margin:0;font-size:20px;font-weight:900;">NomosLink</h2>' +
    '<p style="color:#93c5fd;margin:4px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Task Notification</p>' +
    '</div>' +
    '<div style="background:white;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">' +
    '<p style="color:#64748b;font-size:14px;">Hi <strong>' + userName + '</strong>,</p>' +
    '<p style="color:#64748b;font-size:14px;">' + actionLine + '</p>' +
    '<div style="background:#f1f5f9;border-left:4px solid #10b981;padding:16px 20px;border-radius:0 12px 12px 0;margin:24px 0;">' +
    '<p style="margin:0 0 4px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Task Description</p>' +
    '<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">' + description + '</p>' +
    noteBlock +
    '</div>' +
    '<p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #f1f5f9;padding-top:16px;">' +
    'This is an automated notification from NomosLink for <strong>Buwembo &amp; Co. Advocates</strong>.<br/>' +
    'Please do not reply to this email.' +
    '</p>' +
    '</div>' +
    '</div>'
  );
}

function buildDraftEmail(
  recipientName: string,
  senderName: string,
  title: string,
  description: string,
  deadline: string,
  caseFileName: string,
  type: 'assigned' | 'completed',
  hoursSpent?: number,
): string {
  const headerLabel = type === 'assigned' ? 'Draft Request' : 'Draft Completed';
  const bodyLine = type === 'assigned'
    ? '<strong>' + senderName + '</strong> has assigned you a new drafting request.'
    : '<strong>' + senderName + '</strong> has completed a drafting request.';
  const deadlineBlock = type === 'assigned'
    ? '<p style="margin:8px 0 0;font-size:12px;color:#64748b;">Deadline: <strong>' + deadline + '</strong></p>'
    : '';
  const hoursBlock = (type === 'completed' && hoursSpent !== undefined)
    ? '<p style="margin:8px 0 0;font-size:12px;color:#64748b;">Hours spent: <strong>' + String(hoursSpent) + '</strong></p>'
    : '';
  return (
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;">' +
    '<div style="background:#0B1F3A;padding:24px 32px;border-radius:16px 16px 0 0;">' +
    '<h2 style="color:white;margin:0;font-size:20px;font-weight:900;">NomosLink</h2>' +
    '<p style="color:#93c5fd;margin:4px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">' + headerLabel + '</p>' +
    '</div>' +
    '<div style="background:white;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">' +
    '<p style="color:#64748b;font-size:14px;">Dear <strong>' + recipientName + '</strong>,</p>' +
    '<p style="color:#64748b;font-size:14px;">' + bodyLine + '</p>' +
    '<div style="background:#f1f5f9;border-left:4px solid #2563EB;padding:16px 20px;border-radius:0 12px 12px 0;margin:24px 0;">' +
    '<p style="margin:0 0 4px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Court Case</p>' +
    '<p style="margin:0 0 12px;font-size:15px;font-weight:900;color:#0B1F3A;">' + caseFileName + '</p>' +
    '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e293b;">' + title + '</p>' +
    '<p style="margin:0 0 6px;font-size:13px;color:#475569;">' + description + '</p>' +
    deadlineBlock +
    hoursBlock +
    '</div>' +
    '<p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #f1f5f9;padding-top:16px;">' +
    'This is an automated notification from NomosLink for <strong>Buwembo &amp; Co. Advocates</strong>.<br/>' +
    'Please do not reply to this email.' +
    '</p>' +
    '</div>' +
    '</div>'
  );
}

/* =======================
    PROVIDER
======================= */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("currentUser");
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id && parsed.role) return parsed;
      localStorage.removeItem("currentUser");
      return null;
    } catch {
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
      password: "password123",
    }];
  });

  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(() => JSON.parse(localStorage.getItem("transactions") || "[]"));
  const [courtCases, setCourtCases] = useState<CourtCase[]>(() => JSON.parse(localStorage.getItem("courtCases") || "[]"));
  const [letters, setLetters] = useState<Letter[]>(() => JSON.parse(localStorage.getItem("letters") || "[]"));
  const [invoices, setInvoices] = useState<Invoice[]>(() => JSON.parse(localStorage.getItem("invoices") || "[]"));
  const [clients, setClients] = useState<Client[]>(() => JSON.parse(localStorage.getItem("clients") || "[]"));
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem("tasks") || "[]").map(normalizeTask));
  const [draftRequests, setDraftRequests] = useState<DraftRequest[]>(() => JSON.parse(localStorage.getItem("draftRequests") || "[]"));
  const [filingRequests, setFilingRequests] = useState<FilingRequest[]>(() => JSON.parse(localStorage.getItem("filingRequests") || "[]"));
  const [landTitles, setLandTitles] = useState<LandTitle[]>(() => JSON.parse(localStorage.getItem("landTitles") || "[]"));
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>(() => JSON.parse(localStorage.getItem("commLogs") || "[]"));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => JSON.parse(localStorage.getItem("notifications") || "[]"));
  const [expenses, setExpenses] = useState<any[]>(() => JSON.parse(localStorage.getItem("expenses") || "[]"));
  const [pendingDeletes, setPendingDeletes] = useState<{ table: string; id: string }[]>(() => JSON.parse(localStorage.getItem("pendingDeletes") || "[]"));
  const [firmName, setFirmName] = useState("Buwembo & Co. Advocates");
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const localNotifIds = useRef<Set<string>>(new Set());
  const currentUserRef = useRef<User | null>(currentUser);
  const usersRef = useRef<User[]>(users);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { usersRef.current = users; }, [users]);

  // Periodic sync 5 seconds after any core data change
  useEffect(() => {
    if (!initialDataLoaded || !navigator.onLine) return;
    // Initial sync after boot happens faster (1s), subsequent debounced syncs stay at 5s
    const delay = transactions.length === 0 && courtCases.length === 0 ? 1000 : 5000;
    const timer = setTimeout(() => { syncToCloud(); }, delay);
    return () => clearTimeout(timer);
  }, [courtCases, transactions, letters, initialDataLoaded]);

  const getAdminIds = () => usersRef.current.filter(u => u.role === 'admin').map(u => u.id);
  const getManagerIds = () => usersRef.current.filter(u => u.role === 'manager').map(u => u.id);

  /* =======================
      SEND EMAIL
  ======================= */
  const sendEmail = (to: string | string[], subject: string, html: string) => {
    if (!navigator.onLine || !to) return;
    
    let recipients = Array.isArray(to) ? [...to] : [to];
    const senderEmail = currentUserRef.current?.email;
    if (senderEmail && !recipients.includes(senderEmail)) {
      recipients.push(senderEmail);
    }
    
    fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + import.meta.env.VITE_SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({ to: recipients, subject, html }),
    }).catch(() => { });
  };

  /* =======================
      INSTANT SAVE HELPER
  ======================= */
  const instantSave = async (table: string, payload: any) => {
    if (!navigator.onLine) return;
    try {
      const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.error('Save to ' + table + ' failed:', e);
    }
  };

  /* =======================
      PUSH SUBSCRIPTION
  ======================= */
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => { registerPushSubscription(currentUser.id); }, 2000);
    return () => clearTimeout(timer);
  }, [currentUser?.id]);

  /* =======================
      UPDATE NOTIFICATION
  ======================= */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for controller change which indicates a new SW took over
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true);
      });

      // Check for updates every 60 seconds
      const interval = setInterval(async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
          }
        } catch (err) {
          console.error('Error checking for updates:', err);
        }
      }, 60000);

      return () => clearInterval(interval);
    }
  }, []);

  /* =======================
      MANAGERS TO NOTIFY HELPER
  ======================= */
  const getManagersToNotify = (
    lawyerId: string | undefined,
    progressNotes: ProgressNote[],
    currentUserId: string,
  ): Set<string> => {
    const managers = new Set<string>();
    progressNotes
      .filter(n => n.authorRole === 'manager')
      .forEach(n => managers.add(String(n.authorId)));
    if (lawyerId) {
      const assignedUser = usersRef.current.find(u => String(u.id) === String(lawyerId));
      if (assignedUser?.role === 'manager') managers.add(String(lawyerId));
    }
    managers.delete(String(currentUserId));
    return managers;
  };

  const queuePendingDelete = (table: string, id: string) => {
    setPendingDeletes(prev => {
      if (prev.some(item => item.table === table && item.id === id)) return prev;
      return [...prev, { table, id }];
    });
  };

  const removePendingDelete = (table: string, id: string) => {
    setPendingDeletes(prev => prev.filter(item => !(item.table === table && item.id === id)));
  };

  const flushPendingDeletes = async () => {
    if (!navigator.onLine || pendingDeletes.length === 0) return;
    const remainingDeletes: { table: string; id: string }[] = [];

    for (const item of pendingDeletes) {
      try {
        const { error } = await supabase.from(item.table).delete().eq('id', item.id);
        if (error) {
          console.error(`Pending delete failed for ${item.table}/${item.id}:`, error);
          remainingDeletes.push(item);
        }
      } catch (err) {
        console.error(`Pending delete exception for ${item.table}/${item.id}:`, err);
        remainingDeletes.push(item);
      }
    }

    if (remainingDeletes.length !== pendingDeletes.length) {
      setPendingDeletes(remainingDeletes);
    }
  };

  useEffect(() => {
    if (!initialDataLoaded || pendingDeletes.length === 0) return;
    if (navigator.onLine) {
      flushPendingDeletes();
    }
  }, [initialDataLoaded, pendingDeletes]);

  useEffect(() => {
    const onOnline = () => {
      if (pendingDeletes.length > 0) flushPendingDeletes();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [pendingDeletes]);

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
      .channel('notifs-' + currentUser.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'recipientId=eq.' + currentUser.id,
      }, (payload) => {
        setNotifications(prev => {
          if (prev.find(n => n.id === payload.new.id)) return prev;
          if (localNotifIds.current.has(payload.new.id)) return prev;
          const newNotif = payload.new as AppNotification;
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('NomoSLink', { body: newNotif.message, icon: '/icon.png' });
          }
          return [newNotif, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  /* =======================
      TRANSACTION / CASE / LETTER REALTIME
  ======================= */
  useEffect(() => {
    const applyRealtimeUpdate = (
      payload: any,
      setter: React.Dispatch<React.SetStateAction<any[]>>
    ) => {
      const mergeRow = (current: any, incoming: any) => {
        const merged = { ...current, ...incoming };
        if (incoming.progressNotes === undefined) merged.progressNotes = current.progressNotes;
        if (incoming.documents === undefined) merged.documents = current.documents;
        if (incoming.deadlines === undefined) merged.deadlines = current.deadlines;
        return merged;
      };

      if (payload.eventType === 'INSERT') {
        setter(prev => prev.find(item => item.id === payload.new.id) ? prev : [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setter(prev => {
          const updated = prev.map(item => item.id === payload.new.id ? mergeRow(item, payload.new) : item);
          return updated.some(item => item.id === payload.new.id) ? updated : [...prev, payload.new];
        });
      } else if (payload.eventType === 'DELETE') {
        setter(prev => prev.filter(item => item.id !== payload.old.id));
      }
    };

    const channel = supabase
      .channel('file-progress-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        applyRealtimeUpdate(payload, setTransactions);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'court_cases' }, (payload) => {
        applyRealtimeUpdate(payload, setCourtCases);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letters' }, (payload) => {
        applyRealtimeUpdate(payload, setLetters);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /* =======================
      INITIAL DATA FETCH
  ======================= */
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const results = await Promise.all([
          supabase.from('court_cases').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('clients').select('*').order('dateAdded', { ascending: false }),
          supabase.from('letters').select('*'),
          supabase.from('users').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('invoices').select('*'),
          supabase.from('expenses').select('*').order('date', { ascending: false }),
          supabase.from('draft_requests').select('*'),
          supabase.from('filing_requests').select('*'),
          supabase.from('land_titles').select('*, notes_history:land_title_notes(*)'),
        ]);

        results.forEach((res, i) => {
          if (res.error) console.error('Table ' + i + ' failed:', res.error.message);
        });

        const mergeIfChanged = (prev: any[], cloud: any[] | null): any[] => {
          if (!cloud || !Array.isArray(cloud)) return prev || [];
          // When the app boots online, the cloud should be authoritative.
          // This avoids restoring stale local copies for items deleted directly in the database.
          return cloud;
        };

        const [courtData, txData, clientData, letterData, userData, taskData, invoiceData, expenseData, draftData, landData] = results.map(r => r.data);

        if (courtData) setCourtCases(prev => mergeIfChanged(prev, courtData));
        if (txData) setTransactions(prev => mergeIfChanged(prev, txData));
        if (clientData) setClients(prev => mergeIfChanged(prev, clientData));
        if (letterData) setLetters(prev => mergeIfChanged(prev, letterData));
        if (userData) setUsers(prev => mergeIfChanged(prev, userData));
        if (taskData) setTasks(prev => mergeIfChanged(prev, taskData).map(normalizeTask));
        const normalizeInvoice = (row: any): Invoice => ({
          id: row.id,
          fileName: row.filename ?? row.fileName ?? '',
          relatedFile: row.relatedfile ?? row.relatedFile ?? '',
          amountBilled: Number(row.amountbilled ?? row.amountBilled ?? 0),
          amountPaid: Number(row.amountpaid ?? row.amountPaid ?? 0),
          balance: Number(row.balance ?? 0),
          isPaid: Boolean(row.ispaid ?? row.isPaid ?? false),
          dateCreated: row.datecreated ?? row.dateCreated ?? '',
          dueDate: row.duedate ?? row.dueDate ?? undefined,
          scannedInvoiceUrl: row.scannedInvoiceUrl ?? undefined,
        });
        if (invoiceData) setInvoices(prev => mergeIfChanged(prev, invoiceData.map(normalizeInvoice)));
        if (expenseData) setExpenses(prev => mergeIfChanged(prev, expenseData));
        if (draftData) setDraftRequests(prev => mergeIfChanged(prev, draftData));
        if (results[10]?.data) setFilingRequests(prev => mergeIfChanged(prev, results[10].data));
        if (landData) setLandTitles(prev => mergeIfChanged(prev, landData));

        setInitialDataLoaded(true);
      } catch (err) {
        console.error("CRITICAL BOOT ERROR:", err);
        setInitialDataLoaded(true);
      }
    };
    fetchAllData();
  }, []);

  /* =======================
      LAND TITLES
  ======================= */
  const addLandTitle = async (
    title: Omit<LandTitle, 'id' | 'created_at' | 'updated_at'>
  ): Promise<LandTitle | null> => {
    const { data, error } = await supabase.from('land_titles').insert([title]).select().single();
    if (error) {
      console.error("Error adding land title:", error);
      alert('Failed to save land title: ' + error.message);
      return null;
    }
    if (data) {
      setLandTitles(prev => [...prev, data]);
      if (data.handling_lawyer_id) {
        sendNotification(
          data.handling_lawyer_id,
          'New Land Title Assigned: "' + data.title_number + '" for ' + data.owner_name,
          'file', data.id, 'case'
        );
      }
      return data;
    }
    return null;
  };

  const updateLandTitle = async (id: string, data: Partial<LandTitle>) => {
    setLandTitles(prev => prev.map(t =>
      t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t
    ));
    const { error } = await supabase
      .from('land_titles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error("Error updating land title:", error); throw error; }
    if (data.handling_lawyer_id) {
      sendNotification(data.handling_lawyer_id, 'Land Title Re-assigned to you: "' + id + '"', 'file', id, 'case');
    }
  };

  const deleteLandTitle = async (id: string) => {
    setLandTitles(prev => prev.filter(t => t.id !== id));
    await supabase.from('land_titles').delete().eq('id', id);
  };

  // Overdue title notifications
  useEffect(() => {
    if (!initialDataLoaded || landTitles.length === 0 || !currentUser) return;
    const today = new Date();
    landTitles.forEach(t => {
      if (t.status !== 'In Custody' && t.status !== 'Under Transaction') return;
      const diffDays = Math.ceil(
        Math.abs(today.getTime() - new Date(t.date_received).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 91) {
        if (t.handling_lawyer_id) {
          sendNotification(
            t.handling_lawyer_id,
            'OVERDUE TITLE: "' + t.title_number + '" has been in custody for 90+ days.',
            'alert', t.id, 'case'
          );
        }
        usersRef.current
          .filter(u => u.role === 'manager' || u.role === 'admin')
          .forEach(m => {
            sendNotification(
              m.id,
              'OVERDUE TITLE (90+ Days): "' + t.title_number + '" (' + t.owner_name + ')',
              'alert', t.id, 'case'
            );
          });
      }
    });
  }, [initialDataLoaded, currentUser]);

  const addLandTitleNote = async (titleId: string, message: string) => {
    if (!currentUser) return;
    const newNote = {
      title_id: titleId,
      author_id: currentUser.id,
      author_name: currentUser.name,
      message,
    };
    const { data, error } = await supabase.from('land_title_notes').insert([newNote]).select().single();
    if (error) { console.error("Error adding title note:", error); return; }
    if (data) {
      setLandTitles(prev => prev.map(t => {
        if (t.id !== titleId) return t;
        return { ...t, notes_history: [...(t.notes_history || []), data] };
      }));
    }
  };

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
    relatedType?: 'case' | 'transaction' | 'letter' | 'task',
  ) => {
    const adminIds = getAdminIds();
    const allRecipients = Array.from(new Set([recipientId, ...adminIds]));
    const now = Date.now();

    const newNotifs: AppNotification[] = allRecipients.map(rid => ({
      id: 'NOTIF-' + now + '-' + rid,
      recipientId: rid,
      message,
      type,
      date: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
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
        fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/send-push-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + import.meta.env.VITE_SUPABASE_SERVICE_KEY,
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

  /* =======================
      SYNC TO CLOUD
  ======================= */
  const syncToCloud = async () => {
    if (!navigator.onLine || !currentUser) return;

    // Strip to only columns that exist in the DB  -  prevents 400 errors from extra UI fields
    const clientsForDb = clients.map(({ id, name, type, email, phone, dateAdded }) => ({
      id, name, type, email, phone, dateAdded,
    }));

    const tasksForDb = tasks.map(({
      id, title, description, priority, dueDate,
      assignedToId, assignedToName, assignedById, assignedByName,
      status, clerkNote, progressNotes, dateCreated,
      relatedFileId, relatedFileType, relatedFileName, deleted,
    }) => ({
      id, title, description, priority, dueDate,
      assignedToId, assignedToName, assignedById, assignedByName,
      status, clerkNote, progressNotes, dateCreated,
      relatedFileId, relatedFileType, relatedFileName, deleted,
    }));


    await flushPendingDeletes();

    const courtCaseScalarFields = [
      'id', 'fileName', 'details', 'billed', 'paid', 'balance', 'status',
      'nextCourtDate', 'completedDate', 'lawyerId', 'clientId',
      'categories', 'sittingType', 'archived',
      'progressNotes', 'documents', 'deadlines',
      'lastClientFeedbackDate', 'scannedInvoiceUrl',
    ];
    const transactionScalarFields = [
      'id', 'fileName', 'type', 'lawyerId', 'billedAmount', 'paidAmount',
      'balance', 'date', 'clientId', 'archived',
      'progressNotes', 'documents',
      'lastClientFeedbackDate', 'scannedInvoiceUrl',
    ];
    const letterScalarFields = [
      'id', 'subject', 'type', 'recipient', 'lawyerId', 'clientId',
      'status', 'archived', 'date', 'billed', 'paid',
      'progressNotes', 'documents',
      'lastClientFeedbackDate', 'scannedInvoiceUrl',
    ];
    const expenseScalarFields = [
      'id', 'type', 'date', 'category', 'description', 'purpose', 'amount',
      'staffId', 'staffName', 'relatedFileId', 'relatedFileType', 'relatedFileName'
    ];

    const pickFields = (obj: any, fields: string[]) => {
      const result: Record<string, any> = {};
      fields.forEach(f => { if (obj[f] !== undefined) result[f] = obj[f]; });
      return result;
    };

    const courtCasesForDb = courtCases.map(c => pickFields(c, courtCaseScalarFields));
    const transactionsForDb = transactions.map(t => pickFields(t, transactionScalarFields));
    const lettersForDb = letters.map(l => pickFields(l, letterScalarFields));
    const expensesForDb = expenses.map(e => pickFields(e, expenseScalarFields));
    const invoicesForDb = invoices.map(inv => ({
      id: inv.id,
      filename: inv.fileName,
      relatedfile: inv.relatedFile,
      amountbilled: inv.amountBilled,
      amountpaid: inv.amountPaid,
      balance: inv.balance,
      ispaid: inv.isPaid,
      datecreated: inv.dateCreated,
      duedate: inv.dueDate,
      scannedInvoiceUrl: inv.scannedInvoiceUrl,
    }));

    try {
      const syncTasks = [
        { name: 'expenses', task: supabase.from('expenses').upsert(expensesForDb, { onConflict: 'id' }) },
        { name: 'clients', task: supabase.from('clients').upsert(clientsForDb, { onConflict: 'id' }) },
        { name: 'letters', task: supabase.from('letters').upsert(lettersForDb, { onConflict: 'id' }) },
        { name: 'invoices', task: supabase.from('invoices').upsert(invoicesForDb, { onConflict: 'id' }) },
        { name: 'transactions', task: supabase.from('transactions').upsert(transactionsForDb, { onConflict: 'id' }) },
        { name: 'court_cases', task: supabase.from('court_cases').upsert(courtCasesForDb, { onConflict: 'id' }) },
        { name: 'users', task: supabase.from('users').upsert(users, { onConflict: 'id' }) },
        { name: 'tasks', task: supabase.from('tasks').upsert(tasksForDb, { onConflict: 'id' }) },
        { name: 'draft_requests', task: supabase.from('draft_requests').upsert(draftRequests, { onConflict: 'id' }) },
        { name: 'land_titles', task: supabase.from('land_titles').upsert(
            landTitles.map(({ notes_history, ...rest }) => rest),
            { onConflict: 'id' }
          ) 
        },
      ];

      const results = await Promise.all(syncTasks.map(t => t.task));
      results.forEach((res, i) => {
        if (res.error) {
          console.error(`Sync failed for ${syncTasks[i].name}:`, res.error.message);
        }
      });
      console.log("Full sync process completed.");
    } catch (e) {
      console.error("Critical error during full sync:", e);
    }
  };

  /* =======================
      AUTH
  ======================= */
  const login = async (email: string, password: string): Promise<boolean> => {
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

      // Only update scalar fields - never overwrite progressNotes or documents
      const scalarUpdate: Record<string, any> = {};
      const safeFields = [
        'fileName', 'type', 'lawyerId', 'billedAmount', 'paidAmount',
        'balance', 'date', 'clientId', 'archived', 'lastClientFeedbackDate'
      ];
      safeFields.forEach(field => {
        if ((final as any)[field] !== undefined) {
          scalarUpdate[field] = (final as any)[field];
        }
      });

      if (Object.keys(scalarUpdate).length > 0 && navigator.onLine) {
        supabase.from('transactions').update(scalarUpdate).eq('id', id).then();
      }

      return final;
    }));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('transactions', JSON.stringify(updated));
      return updated;
    });
    queuePendingDelete('transactions', id);
    if (navigator.onLine) {
      supabase.from('transactions').delete().eq('id', id).then(({ error }) => {
        if (error) {
          console.error('Failed to delete transaction from Supabase:', error);
          return;
        }
        removePendingDelete('transactions', id);
      });
    }
  };

  const recordClientFeedback = (_note: string, clientId?: string) => {
    if (!currentUser || !clientId) return;
    const now = new Date().toLocaleString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Add to Communication Logs
    const newLog: CommunicationLog = {
      id: crypto.randomUUID(),
      clientId,
      note: `Client was updated`,
      authorName: currentUser.name,
      date: now
    };
    setCommLogs(prev => [...prev, newLog]);
    supabase.from('comm_logs').insert([newLog]).then();
  };

  const addTransactionProgress = (id: string, message: string, logAsFeedback: boolean = false) => {
    if (!currentUser) return;
    const t = transactions.find(target => target.id === id);
    if (!t) return;

    const now = new Date().toISOString();
    const updatedNotes = [...(t.progressNotes || []), {
      id: crypto.randomUUID(),
      message,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      date: now,
    }];

    const newFeedbackDate = logAsFeedback ? now : t.lastClientFeedbackDate;

    // 1. Update UI State
    setTransactions(prev => prev.map(item => item.id === id ? { 
      ...item, 
      progressNotes: updatedNotes, 
      lastClientFeedbackDate: newFeedbackDate 
    } : item));

    // 2. Side Effects
    if (logAsFeedback) recordClientFeedback(message, t.clientId);
    
    const updatePayload: any = { progressNotes: updatedNotes };
    if (logAsFeedback) updatePayload.lastClientFeedbackDate = now;
    supabase.from('transactions').update(updatePayload).eq('id', id)
      .then(({ error }) => { if (error) console.error('Failed to save transaction progress note:', error); });

    const isAuthorManagerOrAdmin = currentUser.role === 'manager' || currentUser.role === 'admin';
    if (t.lawyerId && String(t.lawyerId) !== String(currentUser.id)) {
      sendNotification(t.lawyerId, 'Transaction Update: ' + t.fileName + '  -  "' + message + '"', 'file', t.id, 'transaction');
      const assignedUser = usersRef.current.find(u => String(u.id) === String(t.lawyerId));
      if (assignedUser?.email) {
        if ((assignedUser.role === 'lawyer' && isAuthorManagerOrAdmin) || assignedUser.role === 'manager') {
          sendEmail(assignedUser.email, 'File Update: ' + t.fileName, buildProgressEmail(assignedUser.name, currentUser.name, currentUser.role, t.fileName, 'Transaction', message));
        }
      }
    }

    const managersToNotify = getManagersToNotify(t.lawyerId, updatedNotes, currentUser.id);
    if (t.lawyerId) managersToNotify.delete(String(t.lawyerId));
    managersToNotify.forEach(mid => sendNotification(mid, 'Transaction Update: ' + t.fileName + '  -  "' + message + '"', 'file', t.id, 'transaction'));
    
    getAdminIds().forEach(aid => {
      if (String(aid) !== String(currentUser.id))
        sendNotification(aid, 'Transaction Update: ' + t.fileName + '  -  "' + message + '"', 'file', t.id, 'transaction');
    });
  };

  const editTransactionProgress = (txId: string, noteId: string, message: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id !== txId) return t;
      const updatedNotes = (t.progressNotes || []).map(n => n.id === noteId ? { ...n, message } : n);
      supabase.from('transactions').update({ progressNotes: updatedNotes }).eq('id', txId)
        .then(({ error }) => { if (error) console.error('Failed to edit transaction progress note:', error); });
      return { ...t, progressNotes: updatedNotes };
    }));
  };

  const deleteTransactionProgress = (txId: string, noteId: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id !== txId) return t;
      const updatedNotes = (t.progressNotes || []).filter(n => n.id !== noteId);
      supabase.from('transactions').update({ progressNotes: updatedNotes }).eq('id', txId)
        .then(({ error }) => { if (error) console.error('Failed to delete transaction progress note:', error); });
      return { ...t, progressNotes: updatedNotes };
    }));
  };

  const uploadTransactionDocument = async (txId: string, file: File) => {
    try {
      const filePath = 'tx-docs/' + txId + '/' + Date.now() + '_' + file.name;
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
    } catch (err) { console.error("Tx upload failed:", err); }
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
  const addCourtCase = (c: CourtCase) => {
    setCourtCases(prev => [...prev, c]);
    const { progressNotes, documents, deadlines, ...dbSafe } = c as any;
    instantSave('court_cases', dbSafe);
  };

  const editCourtCase = (id: string, data: Partial<CourtCase>) => {
    setCourtCases(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...data };
      const scalarUpdate: Record<string, any> = {};
      const safeFields = [
        'fileName', 'details', 'billed', 'paid', 'balance', 'status',
        'nextCourtDate', 'completedDate', 'lawyerId', 'clientId',
        'categories', 'sittingType', 'archived', 'lastClientFeedbackDate'
      ];
      safeFields.forEach(field => {
        if (data[field as keyof CourtCase] !== undefined) {
          scalarUpdate[field] = (data as any)[field];
        }
      });

      if (Object.keys(scalarUpdate).length > 0 && navigator.onLine) {
        supabase.from('court_cases').update(scalarUpdate).eq('id', id).then();
      }

      return updated;
    }));
  };

  const deleteCourtCase = (id: string) => {
    setCourtCases(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem('courtCases', JSON.stringify(updated));
      return updated;
    });
    if (navigator.onLine) supabase.from('court_cases').delete().eq('id', id).then();
  };

  const addCourtCaseProgress = (id: string, message: string, logAsFeedback: boolean = false) => {
    if (!currentUser) return;
    const c = courtCases.find(target => target.id === id);
    if (!c) return;

    const now = new Date().toISOString();
    const newNote: ProgressNote = {
      id: crypto.randomUUID(),
      message,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      date: now,
    };

    const updatedNotes = [...(c.progressNotes || []), newNote];
    const newFeedbackDate = logAsFeedback ? now : c.lastClientFeedbackDate;

    // 1. Update UI State
    setCourtCases(prev => prev.map(item => item.id === id ? { 
      ...item, 
      progressNotes: updatedNotes, 
      lastClientFeedbackDate: newFeedbackDate 
    } : item));

    // 2. Side Effects
    if (logAsFeedback) recordClientFeedback(message, c.clientId);
    
    const updatePayload: any = { progressNotes: updatedNotes };
    if (logAsFeedback) updatePayload.lastClientFeedbackDate = now;
    supabase.from('court_cases').update(updatePayload).eq('id', id)
      .then(({ error }) => { if (error) console.error('Failed to save court case progress note:', error); });
    
    const isAuthorManagerOrAdmin = currentUser.role === 'manager' || currentUser.role === 'admin';
    if (c.lawyerId && String(c.lawyerId) !== String(currentUser.id)) {
      sendNotification(c.lawyerId, 'Court Case Update: ' + c.fileName + '  -  "' + message + '"', 'file', c.id, 'case');
      const assignedUser = usersRef.current.find(u => String(u.id) === String(c.lawyerId));
      if (assignedUser?.email) {
        if ((assignedUser.role === 'lawyer' && isAuthorManagerOrAdmin) || assignedUser.role === 'manager') {
          sendEmail(assignedUser.email, 'File Update: ' + c.fileName, buildProgressEmail(assignedUser.name, currentUser.name, currentUser.role, c.fileName, 'Court Case', message));
        }
      }
    }

    const managersToNotify = getManagersToNotify(c.lawyerId, updatedNotes, currentUser.id);
    if (c.lawyerId) managersToNotify.delete(String(c.lawyerId));
    managersToNotify.forEach(mid => sendNotification(mid, 'Court Case Update: ' + c.fileName + '  -  "' + message + '"', 'file', c.id, 'case'));
    
    getAdminIds().forEach(aid => {
      if (String(aid) !== String(currentUser.id))
        sendNotification(aid, 'Court Case Update: ' + c.fileName + '  -  "' + message + '"', 'file', c.id, 'case');
    });

    const assistantIds = new Set(draftRequests.filter(d => d.caseId === c.id).map(d => d.assignedToId));
    assistantIds.forEach(aid => {
      if (String(aid) !== String(currentUser.id) && String(aid) !== String(c.lawyerId))
        sendNotification(aid, 'Case Update (Assisting): ' + c.fileName + '  -  "' + message + '"', 'file', c.id, 'case');
    });
  };

  const deleteCourtCaseProgress = (caseId: string, noteId: string) => {
    setCourtCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const updatedNotes = (c.progressNotes || []).filter(n => n.id !== noteId);
      supabase.from('court_cases').update({ progressNotes: updatedNotes }).eq('id', caseId)
        .then(({ error }) => { if (error) console.error('Failed to delete court case progress note:', error); });
      return { ...c, progressNotes: updatedNotes };
    }));
  };

  const uploadCourtCaseDocument = async (caseId: string, file: File) => {
    try {
      const filePath = 'court-docs/' + caseId + '/' + Date.now() + '_' + file.name;
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
    } catch (err) { console.error("Court case upload failed:", err); }
  };

  const deleteCourtCaseDocument = async (caseId: string, docId: string) => {
    setCourtCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const updatedDocs = (c.documents || []).filter(d => d.id !== docId);
      supabase.from('court_cases').update({ documents: updatedDocs }).eq('id', caseId).then();
      return { ...c, documents: updatedDocs };
    }));
  };

  const addCourtCaseDeadline = (caseId: string, deadline: Omit<CourtDeadline, 'id' | 'status'>) => {
    setCourtCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const newDeadline: CourtDeadline = { ...deadline, id: crypto.randomUUID(), status: 'Pending' };
      const updated = { ...c, deadlines: [...(c.deadlines || []), newDeadline] };
      supabase.from('court_cases').update({ deadlines: updated.deadlines }).eq('id', caseId).then();
      return updated;
    }));
  };

  const updateCourtCaseDeadline = (caseId: string, deadlineId: string, data: Partial<CourtDeadline>) => {
    setCourtCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const updatedDeadlines = (c.deadlines || []).map(d => d.id === deadlineId ? { ...d, ...data } : d);
      supabase.from('court_cases').update({ deadlines: updatedDeadlines }).eq('id', caseId).then();
      return { ...c, deadlines: updatedDeadlines };
    }));
  };

  const deleteCourtCaseDeadline = (caseId: string, deadlineId: string) => {
    setCourtCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const updatedDeadlines = (c.deadlines || []).filter(d => d.id !== deadlineId);
      supabase.from('court_cases').update({ deadlines: updatedDeadlines }).eq('id', caseId).then();
      return { ...c, deadlines: updatedDeadlines };
    }));
  };

  /* =======================
      LETTERS
  ======================= */
  const addLetter = (l: Letter) => { setLetters(prev => [...prev, l]); instantSave('letters', l); };

  const editLetter = (id: string, data: Partial<Letter>) => {
    setLetters(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, ...data };

      // Only update scalar fields - never overwrite progressNotes or documents
      const scalarUpdate: Record<string, any> = {};
      const safeFields = [
        'subject', 'type', 'recipient', 'lawyerId', 'clientId',
        'status', 'archived', 'date', 'billed', 'paid', 'lastClientFeedbackDate'
      ];
      safeFields.forEach(field => {
        if ((data as any)[field] !== undefined) {
          scalarUpdate[field] = (data as any)[field];
        }
      });

      if (Object.keys(scalarUpdate).length > 0 && navigator.onLine) {
        supabase.from('letters').update(scalarUpdate).eq('id', id).then();
      }

      return updated;
    }));
  };

  const deleteLetter = (id: string) => {
    setLetters(prev => {
      const updated = prev.filter(l => l.id !== id);
      localStorage.setItem('letters', JSON.stringify(updated));
      return updated;
    });
    if (navigator.onLine) supabase.from('letters').delete().eq('id', id).then();
  };

  const addLetterProgress = (id: string, message: string, logAsFeedback: boolean = false) => {
    if (!currentUser) return;
    const l = letters.find(target => target.id === id);
    if (!l) return;

    const now = new Date().toISOString();
    const newNote: ProgressNote = {
      id: crypto.randomUUID(),
      message,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      date: now,
    };

    const updatedNotes = [...(l.progressNotes || []), newNote];
    const newFeedbackDate = logAsFeedback ? now : l.lastClientFeedbackDate;

    // 1. Update UI State
    setLetters(prev => prev.map(item => item.id === id ? { 
      ...item, 
      progressNotes: updatedNotes, 
      lastClientFeedbackDate: newFeedbackDate 
    } : item));

    // 2. Side Effects
    if (logAsFeedback) recordClientFeedback(message, l.clientId);
    
    const updatePayload: any = { progressNotes: updatedNotes };
    if (logAsFeedback) updatePayload.lastClientFeedbackDate = now;
    supabase.from('letters').update(updatePayload).eq('id', id)
      .then(({ error }) => { if (error) console.error('Failed to save letter progress note:', error); });
    
    const isAuthorManagerOrAdmin = currentUser.role === 'manager' || currentUser.role === 'admin';
    if (l.lawyerId && String(l.lawyerId) !== String(currentUser.id)) {
      sendNotification(l.lawyerId, 'Letter Update: ' + l.subject + '  -  "' + message + '"', 'file', l.id, 'letter');
      const assignedUser = usersRef.current.find(u => String(u.id) === String(l.lawyerId));
      if (assignedUser?.email) {
        if ((assignedUser.role === 'lawyer' && isAuthorManagerOrAdmin) || assignedUser.role === 'manager') {
          sendEmail(assignedUser.email, 'File Update: ' + l.subject, buildProgressEmail(assignedUser.name, currentUser.name, currentUser.role, l.subject, 'Letter', message));
        }
      }
    }

    const managersToNotify = getManagersToNotify(l.lawyerId, updatedNotes, currentUser.id);
    if (l.lawyerId) managersToNotify.delete(String(l.lawyerId));
    managersToNotify.forEach(mid => sendNotification(mid, 'Letter Update: ' + l.subject + '  -  "' + message + '"', 'file', l.id, 'letter'));
    
    getAdminIds().forEach(aid => {
      if (String(aid) !== String(currentUser.id))
        sendNotification(aid, 'Letter Update: ' + l.subject + '  -  "' + message + '"', 'file', l.id, 'letter');
    });
  };

  const uploadLetterDocument = async (letterId: string, file: File) => {
    try {
      const filePath = 'letter-docs/' + letterId + '/' + Date.now() + '_' + file.name;
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
    } catch (err) { console.error("Letter upload failed:", err); }
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
  // Map camelCase app fields → lowercase DB column names
  const invoiceToDb = (inv: Invoice) => ({
    id: inv.id,
    filename: inv.fileName,
    relatedfile: inv.relatedFile,
    amountbilled: inv.amountBilled,
    amountpaid: inv.amountPaid,
    balance: inv.balance,
    ispaid: inv.isPaid,
    datecreated: inv.dateCreated,
    duedate: inv.dueDate,
    scannedInvoiceUrl: inv.scannedInvoiceUrl,
  });

  const addInvoice = async (inv: Invoice) => {
    setInvoices(prev => [...prev, inv]);
    if (navigator.onLine) {
      const { error } = await supabase.from('invoices').upsert(invoiceToDb(inv), { onConflict: 'id' });
      if (error) console.error('addInvoice failed:', error.message, '| Details:', error.details);
    }
  };
  const updateInvoice = async (inv: Invoice) => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
    if (navigator.onLine) {
      const { error } = await supabase.from('invoices').upsert(invoiceToDb(inv), { onConflict: 'id' });
      if (error) console.error('updateInvoice failed:', error.message, '| Details:', error.details);
    }
  };
  const deleteInvoice = (id: string) => {
    setInvoices(prev => {
      const updated = prev.filter(i => i.id !== id);
      localStorage.setItem('invoices', JSON.stringify(updated));
      return updated;
    });
    if (navigator.onLine) supabase.from('invoices').delete().eq('id', id).then();
  };

  /* =======================
      CLIENTS
  ======================= */
  // Helper: strip client to only DB columns before saving
  const clientToDb = (client: Client) => ({
    id: client.id,
    name: client.name,
    type: client.type,
    email: client.email,
    phone: client.phone,
    dateAdded: client.dateAdded,
  });

  const addClient = async (client: Client) => {
    setClients(prev => [client, ...prev]);
    if (!navigator.onLine) return;
    const { error } = await supabase.from('clients').upsert(clientToDb(client), { onConflict: 'id' });
    if (error) {
      console.error("Failed to save client:", error.message);
      setClients(prev => prev.filter(c => c.id !== client.id));
      alert('Failed to save client: ' + error.message);
    }
  };

  const updateClient = async (client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    if (!navigator.onLine) return;
    const { error } = await supabase.from('clients').upsert(clientToDb(client), { onConflict: 'id' });
    if (error) console.error("Failed to update client:", error.message);
  };

  const deleteClient = async (id: string) => {
    setClients(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem('clients', JSON.stringify(updated));
      return updated;
    });
    if (!navigator.onLine) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) console.error("Failed to delete client:", error.message);
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
    if (error) console.error("Task sync failed:", error);
    const assignedUser = usersRef.current.find(u => String(u.id) === String(taskData.assignedToId));
    if (assignedUser?.email) {
      sendEmail(assignedUser.email, 'New Task: ' + taskData.title, buildTaskEmail(assignedUser.name, taskData.assignedByName, taskData.title, taskData.description, 'assigned'));
    }
    sendNotification(taskData.assignedToId, 'New Task from ' + taskData.assignedByName + ': "' + taskData.title + '"', 'task', newTask.id, 'task');
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
    setTasks(prev => prev.map(t => t.id === id ? { ...t, deleted: true } : t));
    if (navigator.onLine) supabase.from('tasks').update({ deleted: true }).eq('id', id).then();
  };

  const completeTask = (id: string, note: string) => {
    const task = tasks.find(t => t.id === id);
    updateTask(id, { status: "Completed", clerkNote: note });
    if (task) {
      sendNotification(task.assignedById, 'Task Completed by ' + task.assignedToName + ': "' + task.title + '"  -  "' + note + '"', 'task', task.id, 'task');
      getManagerIds().forEach(mid => {
        if (String(mid) !== String(task.assignedById) && String(mid) !== String(currentUserRef.current?.id))
          sendNotification(mid, 'Clerk Task Completed: "' + task.title + '" by ' + task.assignedToName, 'task', task.id);
      });
    }
  };

  const appendTaskNote = (id: string, note: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newNote: TaskProgressNote = { date: new Date().toISOString(), note };
    updateTask(id, { progressNotes: [...(task.progressNotes || []), newNote] });
    sendNotification(task.assignedById, 'Task Update from ' + task.assignedToName + ': "' + task.title + '"  -  "' + note + '"', 'task', task.id, 'task');
  };

  /* =======================
      DRAFT REQUESTS
  ======================= */
  const addDraftRequest = async (draftData: Omit<DraftRequest, "id" | "status" | "dateCreated">) => {
    const newDraft: DraftRequest = {
      ...draftData,
      id: crypto.randomUUID(),
      status: "Pending",
      dateCreated: new Date().toISOString(),
    };
    setDraftRequests(prev => [...prev, newDraft]);
    await supabase.from('draft_requests').insert([newDraft]);
    const assignedUser = usersRef.current.find(u => String(u.id) === String(draftData.assignedToId));
    if (assignedUser?.email) {
      sendEmail(assignedUser.email, 'New Draft Request: ' + draftData.title, buildDraftEmail(assignedUser.name, draftData.requestedByName, draftData.title, draftData.description, draftData.deadline, draftData.caseFileName, 'assigned'));
    }
    sendNotification(draftData.assignedToId, 'New Draft Request: "' + draftData.title + '" on ' + draftData.caseFileName + '  -  Due ' + draftData.deadline, 'task', newDraft.id);
    getManagerIds().forEach(mid => {
      if (String(mid) !== String(currentUserRef.current?.id))
        sendNotification(mid, 'Draft Request by ' + draftData.requestedByName + ': "' + draftData.title + '" to ' + draftData.assignedToName, 'task', newDraft.id);
    });
  };

  const completeDraftRequest = (id: string, _hoursSpent?: number, documentUrl?: string, documentName?: string) => {
    const draft = draftRequests.find(d => d.id === id);
    if (!draft) return;
    const diffMs = new Date().getTime() - new Date(draft.dateCreated).getTime();
    const calculatedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
    const updated: DraftRequest = { ...draft, status: "Completed", hoursSpent: calculatedHours, documentUrl, documentName, dateCompleted: new Date().toISOString() };
    setDraftRequests(prev => prev.map(d => d.id === id ? updated : d));
    instantSave('draft_requests', updated);
    const requester = usersRef.current.find(u => String(u.id) === String(draft.requestedById));
    if (requester?.email) {
      sendEmail(requester.email, 'Draft Completed: ' + draft.title, buildDraftEmail(requester.name, draft.assignedToName, draft.title, draft.description, draft.deadline, draft.caseFileName, 'completed', calculatedHours));
    }
    sendNotification(draft.requestedById, 'Draft Completed by ' + draft.assignedToName + ': "' + draft.title + '" on ' + draft.caseFileName + '  -  ' + calculatedHours + 'hrs', 'task', id);
    getManagerIds().forEach(mid => {
      if (String(mid) !== String(draft.requestedById))
        sendNotification(mid, 'Draft Completed: "' + draft.title + '" by ' + draft.assignedToName, 'task', id);
    });
  };

  const deleteDraftRequest = (id: string) => {
    setDraftRequests(prev => {
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem('draftRequests', JSON.stringify(updated));
      return updated;
    });
    if (navigator.onLine) supabase.from('draft_requests').delete().eq('id', id).then();
  };

  /* =======================
      FILING REQUESTS
  ======================= */
  const addFilingRequest = async (filingData: Omit<FilingRequest, "id" | "status" | "dateCreated">) => {
    const newFiling: FilingRequest = {
      ...filingData,
      id: crypto.randomUUID(),
      status: "Pending",
      dateCreated: new Date().toISOString(),
    };
    setFilingRequests(prev => [...prev, newFiling]);
    await supabase.from('filing_requests').insert([newFiling]);
    sendNotification(filingData.assignedToId, 'New Registry Filing Requested: "' + filingData.documentName + '"', 'task', newFiling.id, 'task');
  };

  const updateFilingRequest = async (id: string, data: Partial<FilingRequest>) => {
    setFilingRequests(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
    await supabase.from('filing_requests').update(data).eq('id', id);
  };

  const completeFilingRequest = async (id: string, hoursSpent: number, eccmisReference?: string, registryNote?: string) => {
    const update = {
      status: "Completed" as const,
      hoursSpent,
      eccmisReference,
      registryNote,
      dateCompleted: new Date().toISOString()
    };
    const filing = filingRequests.find(f => f.id === id);
    setFilingRequests(prev => prev.map(f => f.id === id ? { ...f, ...update } : f));
    await supabase.from('filing_requests').update(update).eq('id', id);
    if (filing) {
      sendNotification(filing.requestedById, `Filing Completed: "${filing.documentName}" (Ref: ${eccmisReference || 'N/A'})`, 'file', filing.caseId, 'case');
    }
  };

  const deleteFilingRequest = async (id: string) => {
    setFilingRequests(prev => prev.filter(f => f.id !== id));
    await supabase.from('filing_requests').delete().eq('id', id);
  };

  /* =======================
      INVOICE SCAN UPLOAD
  ======================= */
  const uploadInvoiceScan = async (id: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const filePath = 'scanned-invoices/scan_' + id + '_' + Date.now() + '.' + fileExt;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) { console.error("Upload Error:", uploadError); throw uploadError; }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, scannedInvoiceUrl: publicUrl } : inv));
    const invoice = invoices.find(i => i.id === id);
    if (invoice?.relatedFile) {
      setCourtCases(prev => prev.map(c => c.fileName === invoice.relatedFile ? { ...c, scannedInvoiceUrl: publicUrl } : c));
      setTransactions(prev => prev.map(t => t.fileName === invoice.relatedFile ? { ...t, scannedInvoiceUrl: publicUrl } : t));
      setLetters(prev => prev.map(l => l.subject === invoice.relatedFile ? { ...l, scannedInvoiceUrl: publicUrl } : l));
    }
    await supabase.from('invoices').update({ scannedInvoiceUrl: publicUrl }).eq('id', id);
    return publicUrl;
  };

  /* =======================
      LAND TITLE SCAN UPLOAD
  ======================= */
  const uploadLandTitleScan = async (id: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const filePath = 'land-title-scans/title_scan_' + id + '_' + Date.now() + '.' + fileExt;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) { console.error("Upload Error:", uploadError); throw uploadError; }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
    setLandTitles(prev => prev.map(t => t.id === id ? { ...t, scanned_copy_url: publicUrl, scanned_copy_name: file.name } : t));
    await supabase.from('land_titles').update({ scanned_copy_url: publicUrl, scanned_copy_name: file.name }).eq('id', id);
    return publicUrl;
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
    localStorage.setItem("draftRequests", JSON.stringify(draftRequests));
    localStorage.setItem("filingRequests", JSON.stringify(filingRequests));
    localStorage.setItem("landTitles", JSON.stringify(landTitles));
    localStorage.setItem("commLogs", JSON.stringify(commLogs));
    localStorage.setItem("expenses", JSON.stringify(expenses));
    localStorage.setItem("pendingDeletes", JSON.stringify(pendingDeletes));
    if (currentUser) localStorage.setItem("currentUser", JSON.stringify(currentUser));
  }, [users, transactions, courtCases, letters, invoices, clients, tasks, draftRequests, filingRequests, landTitles, commLogs, expenses, pendingDeletes, currentUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("notifications", JSON.stringify(notifications));
    }, 1000);
    return () => clearTimeout(timer);
  }, [notifications]);

  /* =======================
      PROVIDER VALUE
  ======================= */
  return (
    <AppContext.Provider
      value={{
        currentUser, setCurrentUser,
        users, setUsers, lawyers, addUser, deleteUser,
        login, logout,
        initialDataLoaded,

        transactions, addTransaction,
        editTransaction, updateTransaction: editTransaction,
        deleteTransaction, addTransactionProgress,
        editTransactionProgress, deleteTransactionProgress,
        uploadTransactionDocument, deleteTransactionDocument,

        courtCases, addCourtCase,
        editCourtCase, updateCourtCase: editCourtCase,
        deleteCourtCase, addCourtCaseProgress, deleteCourtCaseProgress,
        uploadCourtCaseDocument, deleteCourtCaseDocument,
        addCourtCaseDeadline, updateCourtCaseDeadline, deleteCourtCaseDeadline,

        letters, addLetter,
        editLetter, updateLetter: editLetter,
        deleteLetter, addLetterProgress,
        uploadLetterDocument, deleteLetterDocument,

        invoices, addInvoice, updateInvoice, deleteInvoice, uploadInvoiceScan,

        clients, addClient, updateClient, deleteClient,

        commLogs,
        addCommLog: (log) => { setCommLogs(p => [...p, log]); instantSave('commLogs', log); },

        tasks, addTask, updateTask, deleteTask, completeTask, appendTaskNote,

        draftRequests, addDraftRequest, completeDraftRequest, deleteDraftRequest,

        filingRequests, addFilingRequest, updateFilingRequest, completeFilingRequest, deleteFilingRequest,

        landTitles, addLandTitle, updateLandTitle, deleteLandTitle, addLandTitleNote, uploadLandTitleScan,

        notifications, sendNotification, markNotificationsAsRead, setNotifications,

        expenses, setExpenses,
        firmName, setFirmName,
        updateAvailable,
        dismissUpdateNotification: () => setUpdateAvailable(false),
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