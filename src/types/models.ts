export interface Transaction {
  id: string;
  fileName: string;
  type: string;
  status: string;
  lawyer: Lawyer | null;
  billed: number | null;
  paid: number | null;
  balance: number | null;
  assignedDate: string;
  completedDate: string | null;
}

export interface CourtCase {
  id: string;
  fileName: string;
  details: string;
  status: string;
  bill: number;
  invoiceMade: boolean;
  paid: number;
  nextDate: string;
  lawyer: Lawyer | null;
  balance: number;
  archived: boolean;
}

export interface Letter {
  id: number;
  type: string;
  subject: string;
  date: string;
  status: string;
  billed: number;
  paid: number;
}

export interface Lawyer {
  id: string;
  name: string;
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
}
