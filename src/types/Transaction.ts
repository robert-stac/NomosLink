export interface ProgressNote {
  id: string;
  author: string;
  note: string;
  date: string;
}

export interface Transaction {
  id: string;
  fileName: string;
  type: string;
  status: string;
  lawyer?: {
    id: string;
    name: string;
  };
  assignedDate?: string;
  completedDate?: string | null;
  amount?: number;

  progressNotes?: ProgressNote[];
}
