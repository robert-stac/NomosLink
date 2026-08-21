export const getFilePaidAmount = (fileId: string | undefined, expenses: any[]): number => {
  if (!fileId || !expenses) return 0;
  return expenses
    .filter(e => e.type === 'in' && e.relatedFileId === String(fileId))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
};
