export type Urgency = 'overdue' | 'soon' | 'normal';

/**
 * Determines urgency of a deadline.
 * overdue: before today
 * soon: today or within next 3 days
 */
export function getDeadlineUrgency(dueDateStr?: string): Urgency {
  if (!dueDateStr) return 'normal';
  
  const dueDate = new Date(dueDateStr);
  if (isNaN(dueDate.getTime())) return 'normal';
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const dDate = new Date(dueDate);
  dDate.setHours(0, 0, 0, 0);
  
  const diffTime = dDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  return 'normal';
}

export function getUrgencyStyles(urgency: Urgency): string {
  switch (urgency) {
    case 'overdue':
      return 'bg-red-50 text-red-600 border-red-100';
    case 'soon':
      return 'bg-amber-50 text-amber-600 border-amber-100';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-100';
  }
}
