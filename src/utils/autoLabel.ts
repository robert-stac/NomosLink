export type AutoLabel =
  | "UNPAID"
  | "PAID"
  | "OVERDUE"
  | "UPCOMING"
  | "NO UPDATES";

export function getAutoLabels(transaction: any): AutoLabel[] {
  const labels: AutoLabel[] = [];
  const today = new Date();

  // Payment status
  if (transaction.paidAmount && transaction.billedAmount) {
    if (Number(transaction.paidAmount) >= Number(transaction.billedAmount)) {
      labels.push("PAID");
    } else {
      labels.push("UNPAID");
    }
  }

  // Court date / next action
  if (transaction.nextDate) {
    const next = new Date(transaction.nextDate);
    if (next < today) {
      labels.push("OVERDUE");
    } else {
      labels.push("UPCOMING");
    }
  }

  // Progress notes
  if (!transaction.progressNotes || transaction.progressNotes.length === 0) {
    labels.push("NO UPDATES");
  }

  return labels;
}
